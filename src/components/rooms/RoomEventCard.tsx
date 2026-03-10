import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Gamepad2, Lock, Check, ShoppingCart } from "lucide-react";
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
    }
  };

  const checkPurchase = async () => {
    if (isFree) { setPurchased(true); return; }
    // Check if event record exists
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

    // Also if poster is the user
    if (message.user_id === userId) setPurchased(true);
  };

  const purchaseEvent = async () => {
    if (!userId) return;
    setBuying(true);
    try {
      // Check balance
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
      if (!wallet || Number(wallet.balance) < price) {
        toast({ title: "Insufficient balance", description: "Please top up your wallet", variant: "destructive" });
        setBuying(false);
        return;
      }

      // Get event id
      const { data: events } = await supabase
        .from("room_events")
        .select("id, posted_by")
        .eq("room_id", roomId)
        .eq("source_id", meta.source_id)
        .limit(1);

      if (!events || events.length === 0) { throw new Error("Event not found"); }
      const roomEvent = events[0];

      // Deduct from buyer
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - price }).eq("user_id", userId);

      // Credit room admin (event poster)
      await supabase.rpc("add_tap_earnings", { _user_id: roomEvent.posted_by, _amount: price });

      // Record purchase
      await supabase.from("room_event_purchases").insert({
        room_event_id: roomEvent.id,
        user_id: userId,
        amount: price,
      });

      setPurchased(true);
      toast({ title: "Purchased! ✅", description: "You can now view the full details" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setBuying(false);
  };

  if (!eventData) return null;

  const isSureOdd = meta.event_type === "sure_odd";

  return (
    <div className="mx-auto max-w-[90%] bg-gradient-to-br from-card to-secondary border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
        {isSureOdd ? (
          <Target className="w-4 h-4 text-primary" />
        ) : (
          <Gamepad2 className="w-4 h-4 text-primary" />
        )}
        <span className="text-xs font-medium text-primary">
          {isSureOdd ? "Sure Odd" : "Betting Pool"}
        </span>
        {!isFree && (
          <Badge variant="secondary" className="ml-auto text-[10px]">₦{price}</Badge>
        )}
        {isFree && (
          <Badge className="ml-auto text-[10px] bg-green-500/20 text-green-400 border-0">Free</Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {isSureOdd ? (
          <>
            <p className="text-sm font-semibold text-foreground">{eventData.home_team} vs {eventData.away_team}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prediction: {purchased ? eventData.prediction : "***"}
              {" · "}Odds: {eventData.odds}
            </p>
            {purchased && (
              <div className="mt-2 p-2 bg-primary/10 rounded-lg">
                <p className="text-xs text-foreground font-mono">
                  Code: <span className="text-primary font-bold">{eventData.bet_code}</span>
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">{eventData.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entry: ₦{eventData.entry_fee} · Pool: ₦{eventData.prize_pool}
            </p>
            {purchased && eventData.description && (
              <p className="text-xs text-muted-foreground mt-1">{eventData.description}</p>
            )}
          </>
        )}
      </div>

      {/* Action */}
      {!purchased && !isFree && (
        <div className="px-3 pb-3">
          <Button size="sm" onClick={purchaseEvent} disabled={buying} className="w-full gap-1.5">
            {buying ? "Processing..." : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" /> Unlock for ₦{price}
              </>
            )}
          </Button>
        </div>
      )}

      {purchased && (
        <div className="px-3 pb-2">
          <p className="text-[10px] text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Unlocked
          </p>
        </div>
      )}
    </div>
  );
}
