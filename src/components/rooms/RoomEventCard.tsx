import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Target, Gamepad2, Lock, Check, ShoppingCart, FileText, Vote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomEventCardProps {
  message: {
    id: string;
    user_id: string;
    metadata: any;
    created_at: string;
    profiles?: { display_name: string | null; avatar_url: string | null };
  };
  userId: string | null;
  roomId: string;
}

export function RoomEventCard({ message, userId, roomId }: RoomEventCardProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [purchased, setPurchased] = useState(false);
  const [buying, setBuying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState("");
  const [placingBet, setPlacingBet] = useState(false);
  const { toast } = useToast();
  const meta = message.metadata || {};
  const price = meta.price || 0;
  const isFree = price <= 0;

  useEffect(() => {
    fetchEventData();
    if (userId) checkPurchase();
  }, []);

  const fetchEventData = async () => {
    if (meta.event_type === "sure_odd") {
      const { data } = await supabase.from("sure_odds").select("*").eq("id", meta.source_id).single();
      if (data) setEventData(data);
    } else if (meta.event_type === "betting_pool") {
      const { data } = await supabase.from("betting_pools").select("*").eq("id", meta.source_id).single();
      if (data) setEventData(data);
    } else if (meta.event_type === "short") {
      const { data } = await supabase.from("shorts").select("*").eq("id", meta.source_id).single();
      if (data) setEventData(data);
    }
  };

  const checkPurchase = async () => {
    if (isFree) { setPurchased(true); return; }
    const { data: events } = await supabase
      .from("room_events")
      .select("id")
      .eq("room_id", roomId)
      .eq("source_id", meta.source_id)
      .limit(1);

    if (events && events.length > 0) {
      const { data } = await supabase
        .from("room_event_purchases")
        .select("id")
        .eq("room_event_id", events[0].id)
        .eq("user_id", userId!)
        .single();
      if (data) setPurchased(true);
    }
    if (message.user_id === userId) setPurchased(true);
  };

  const purchaseEvent = async () => {
    if (!userId) return;
    setBuying(true);
    try {
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
      if (!wallet || Number(wallet.balance) < price) {
        toast({ title: "Insufficient balance", description: "Please top up your wallet", variant: "destructive" });
        setBuying(false);
        return;
      }

      const { data: events } = await supabase
        .from("room_events")
        .select("id, posted_by")
        .eq("room_id", roomId)
        .eq("source_id", meta.source_id)
        .limit(1);

      if (!events || events.length === 0) { throw new Error("Event not found"); }
      const roomEvent = events[0];

      await supabase.from("wallets").update({ balance: Number(wallet.balance) - price }).eq("user_id", userId);
      await supabase.rpc("add_tap_earnings", { _user_id: roomEvent.posted_by, _amount: price });

      await supabase.from("room_event_purchases").insert({
        room_event_id: roomEvent.id,
        user_id: userId,
        amount: price,
      });

      setPurchased(true);
      toast({ title: "Purchased! ✅" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBuying(false);
  };

  const placeBet = async () => {
    if (!userId || selectedOption === null || !eventData) return;
    setPlacingBet(true);
    try {
      const entryFee = Number(eventData.entry_fee);
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
      if (!wallet || Number(wallet.balance) < entryFee) {
        toast({ title: "Insufficient balance", description: `Need ₦${entryFee}`, variant: "destructive" });
        setPlacingBet(false);
        return;
      }

      // Check if already entered
      const { data: existing } = await supabase.from("betting_entries").select("id").eq("pool_id", meta.source_id).eq("user_id", userId).single();
      if (existing) {
        toast({ title: "Already entered this pool", variant: "destructive" });
        setPlacingBet(false);
        return;
      }

      // Deduct and place bet
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - entryFee }).eq("user_id", userId);
      await supabase.from("betting_entries").insert({
        pool_id: meta.source_id,
        user_id: userId,
        selected_option: selectedOption,
        amount: entryFee,
      });

      // Update pool prize
      await supabase.from("betting_pools").update({
        prize_pool: Number(eventData.prize_pool) + entryFee,
      }).eq("id", meta.source_id);

      toast({ title: "Bet placed! 🎯" });
      fetchEventData(); // refresh
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setPlacingBet(false);
  };

  if (!eventData) return null;

  const isSureOdd = meta.event_type === "sure_odd";
  const isPool = meta.event_type === "betting_pool";
  const isShort = meta.event_type === "short";
  const poolOptions = isPool ? (eventData.options as any[] || []) : [];

  return (
    <div className="mx-auto max-w-[90%] bg-gradient-to-br from-card to-secondary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
        {isSureOdd && <Target className="w-4 h-4 text-primary" />}
        {isPool && <Gamepad2 className="w-4 h-4 text-primary" />}
        {isShort && <FileText className="w-4 h-4 text-primary" />}
        <span className="text-xs font-medium text-primary">
          {isSureOdd ? "Sure Odd" : isPool ? "Betting Pool" : "Post"}
        </span>
        {!isFree && !isShort && (
          <Badge variant="secondary" className="ml-auto text-[10px]">₦{price}</Badge>
        )}
        {(isFree || isShort) && (
          <Badge className="ml-auto text-[10px] bg-accent/20 text-accent border-0">Free</Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {isSureOdd && (
          <>
            <p className="text-sm font-semibold text-foreground">{eventData.home_team} vs {eventData.away_team}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prediction: {purchased ? eventData.prediction : "***"} · Odds: {eventData.odds}
            </p>
            {purchased && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                <p className="text-xs text-foreground font-mono">
                  Code: <span className="text-primary font-bold">{eventData.bet_code}</span>
                </p>
              </div>
            )}
          </>
        )}

        {isPool && (
          <>
            <p className="text-sm font-semibold text-foreground">{eventData.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entry: ₦{eventData.entry_fee} · Pool: ₦{eventData.prize_pool} · {eventData.status}
            </p>
            {purchased && eventData.status === "open" && (
              <div className="mt-2 space-y-2">
                <p className="text-xs font-medium text-foreground">Pick an option to bet:</p>
                <div className="space-y-1">
                  {poolOptions.map((opt: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-colors ${
                        selectedOption === idx
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {typeof opt === "string" ? opt : opt.label || `Option ${idx + 1}`}
                    </button>
                  ))}
                </div>
                {selectedOption !== null && (
                  <Button size="sm" onClick={placeBet} disabled={placingBet} className="w-full gap-1 mt-1">
                    <Vote className="w-3.5 h-3.5" />
                    {placingBet ? "Placing..." : `Place Bet — ₦${eventData.entry_fee}`}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {isShort && (
          <>
            <p className="text-sm text-foreground line-clamp-3">{eventData.content || "Media post"}</p>
            {eventData.media_url && (
              <img src={eventData.media_url} alt="" className="mt-2 rounded-lg max-h-40 w-full object-cover" />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              ❤️ {eventData.likes_count || 0} · 💬 {eventData.comments_count || 0}
            </p>
          </>
        )}
      </div>

      {/* Purchase action for paid events */}
      {!purchased && !isFree && !isShort && (
        <div className="px-3 pb-3">
          <Button size="sm" onClick={purchaseEvent} disabled={buying} className="w-full gap-1.5">
            {buying ? "Processing..." : (
              <><ShoppingCart className="w-3.5 h-3.5" /> Unlock for ₦{price}</>
            )}
          </Button>
        </div>
      )}

      {purchased && !isPool && !isShort && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-primary flex items-center gap-1">
            <Check className="w-3 h-3" /> Unlocked
          </p>
        </div>
      )}
    </div>
  );
}
