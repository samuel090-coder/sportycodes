import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Share2, Check, Globe, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomCrossPostSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
  userId: string;
}

export function RoomCrossPostSheet({ open, onOpenChange, roomId, roomName, userId }: RoomCrossPostSheetProps) {
  const [search, setSearch] = useState("");
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [posting, setPosting] = useState<string | null>(null);
  const [posted, setPosted] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (open) fetchMyRooms();
  }, [open]);

  const fetchMyRooms = async () => {
    const { data: memberData } = await supabase.from("room_members").select("room_id").eq("user_id", userId).eq("is_blocked", false);
    if (memberData && memberData.length > 0) {
      const roomIds = memberData.map(m => m.room_id).filter(id => id !== roomId);
      if (roomIds.length === 0) return;
      const { data } = await supabase.from("rooms").select("*").in("id", roomIds);
      if (data) setMyRooms(data);
    }
  };

  const crossPost = async (targetRoomId: string, targetName: string) => {
    setPosting(targetRoomId);
    try {
      await supabase.from("room_cross_posts").insert({
        source_room_id: roomId,
        target_room_id: targetRoomId,
        posted_by: userId,
        event_type: "room_tag",
        source_data: { room_name: roomName, room_id: roomId },
      });

      // Post message in target room
      await supabase.from("room_messages").insert({
        room_id: targetRoomId,
        user_id: userId,
        content: `📢 Check out the room "${roomName}"! Join and explore.`,
        message_type: "system",
        metadata: { cross_post: true, source_room_id: roomId, source_room_name: roomName },
      });

      setPosted(prev => new Set([...prev, targetRoomId]));
      toast({ title: `Tagged to ${targetName}! 📢` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setPosting(null);
  };

  const filtered = myRooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[60vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" /> Tag Room to Other Groups
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search your rooms..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="mt-2 max-h-[40vh] overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No other rooms to tag to</p>
          ) : (
            filtered.map(room => (
              <div key={room.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {room.is_public ? <Globe className="w-4 h-4 text-primary" /> : <Lock className="w-4 h-4 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{room.name}</p>
                  <p className="text-[10px] text-muted-foreground">{room.member_count} members</p>
                </div>
                {posted.has(room.id) ? (
                  <span className="text-xs text-primary flex items-center gap-0.5"><Check className="w-3 h-3" /> Tagged</span>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => crossPost(room.id, room.name)} disabled={posting === room.id} className="gap-1">
                    <Share2 className="w-3.5 h-3.5" />
                    {posting === room.id ? "..." : "Tag"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
