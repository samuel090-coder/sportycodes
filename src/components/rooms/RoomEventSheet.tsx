import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tag, Target, Gamepad2, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  userId: string;
  isAdmin: boolean;
}

export function RoomEventSheet({ open, onOpenChange, roomId, userId, isAdmin }: RoomEventSheetProps) {
  const [sureOdds, setSureOdds] = useState<any[]>([]);
  const [pools, setPools] = useState<any[]>([]);
  const [myShorts, setMyShorts] = useState<any[]>([]);
  const [customPrice, setCustomPrice] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSureOdds();
      fetchPools();
      fetchMyShorts();
    }
  }, [open]);

  const fetchSureOdds = async () => {
    const { data } = await supabase.from("sure_odds").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(20);
    if (data) setSureOdds(data);
  };

  const fetchPools = async () => {
    const { data } = await supabase.from("betting_pools").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(20);
    if (data) setPools(data);
  };

  const fetchMyShorts = async () => {
    const { data } = await supabase.from("shorts").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(20);
    if (data) setMyShorts(data);
  };

  const postEvent = async (eventType: string, sourceId: string) => {
    setPosting(sourceId);
    const price = parseFloat(customPrice[sourceId] || "0");

    // Only admins can set prices > 0
    const finalPrice = isAdmin ? price : 0;

    const { error } = await supabase.from("room_events").insert({
      room_id: roomId,
      posted_by: userId,
      event_type: eventType,
      source_id: sourceId,
      custom_price: finalPrice,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("room_messages").insert({
        room_id: roomId,
        user_id: userId,
        content: null,
        message_type: "event",
        metadata: { event_type: eventType, source_id: sourceId, price: finalPrice },
      });
      toast({ title: "Event posted to room! 🏟️" });
      onOpenChange(false);
    }
    setPosting(null);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" /> Tag an Event
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="odds" className="mt-3">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="odds" className="flex-1 gap-1 text-xs">
              <Target className="w-3.5 h-3.5" /> Odds
            </TabsTrigger>
            <TabsTrigger value="pools" className="flex-1 gap-1 text-xs">
              <Gamepad2 className="w-3.5 h-3.5" /> Pools
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex-1 gap-1 text-xs">
              <FileText className="w-3.5 h-3.5" /> My Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="odds" className="space-y-2 mt-3 max-h-[45vh] overflow-y-auto">
            {sureOdds.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No active sure odds</p>
            ) : (
              sureOdds.map((odd) => (
                <div key={odd.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{odd.home_team} vs {odd.away_team}</p>
                    <p className="text-xs text-muted-foreground">Odds: {odd.odds} · {odd.prediction}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Input
                        type="number"
                        placeholder="Price (0 = free)"
                        value={customPrice[odd.id] || ""}
                        onChange={(e) => setCustomPrice({ ...customPrice, [odd.id]: e.target.value })}
                        className="flex-1 h-8 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={() => postEvent("sure_odd", odd.id)}
                      disabled={posting === odd.id}
                      className="gap-1"
                    >
                      {posting === odd.id ? "..." : <><Plus className="w-3.5 h-3.5" /> Post</>}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="pools" className="space-y-2 mt-3 max-h-[45vh] overflow-y-auto">
            {pools.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No open betting pools</p>
            ) : (
              pools.map((pool) => (
                <div key={pool.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pool.title}</p>
                    <p className="text-xs text-muted-foreground">Entry: ₦{pool.entry_fee} · Pool: ₦{pool.prize_pool}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Input
                        type="number"
                        placeholder="Price (0 = free)"
                        value={customPrice[pool.id] || ""}
                        onChange={(e) => setCustomPrice({ ...customPrice, [pool.id]: e.target.value })}
                        className="flex-1 h-8 text-sm"
                      />
                    )}
                    <Button
                      size="sm"
                      onClick={() => postEvent("betting_pool", pool.id)}
                      disabled={posting === pool.id}
                      className="gap-1"
                    >
                      {posting === pool.id ? "..." : <><Plus className="w-3.5 h-3.5" /> Post</>}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-2 mt-3 max-h-[45vh] overflow-y-auto">
            {myShorts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No posts to share</p>
            ) : (
              myShorts.map((short) => (
                <div key={short.id} className="p-3 bg-card border border-border rounded-xl space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{short.content || "Media post"}</p>
                    <p className="text-xs text-muted-foreground">
                      ❤️ {short.likes_count || 0} · 💬 {short.comments_count || 0}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => postEvent("short", short.id)}
                    disabled={posting === short.id}
                    className="gap-1"
                  >
                    {posting === short.id ? "..." : <><Plus className="w-3.5 h-3.5" /> Share</>}
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
