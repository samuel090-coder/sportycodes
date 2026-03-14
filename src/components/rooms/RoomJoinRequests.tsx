import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomJoinRequestsProps {
  roomId: string;
}

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; username: string | null };
}

export function RoomJoinRequests({ roomId }: RoomJoinRequestsProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    const channel = supabase
      .channel(`join-req-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_join_requests", filter: `room_id=eq.${roomId}` }, () => fetchRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("room_join_requests")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const ids = data.map(r => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      const pMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setRequests(data.map(r => ({ ...r, profile: pMap[r.user_id] })));
    } else {
      setRequests([]);
    }
  };

  const handleRequest = async (reqId: string, userId: string, approve: boolean) => {
    if (approve) {
      await supabase.from("room_members").insert({ room_id: roomId, user_id: userId, role: "member" });
    }
    await supabase.from("room_join_requests").update({
      status: approve ? "approved" : "declined",
      reviewed_at: new Date().toISOString(),
    }).eq("id", reqId);

    toast({ title: approve ? "Request approved ✅" : "Request declined" });
    fetchRequests();
  };

  if (requests.length === 0) return <p className="text-xs text-muted-foreground py-2">No pending requests</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">Join Requests ({requests.length})</p>
      {requests.map(req => (
        <div key={req.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
          <Avatar className="w-7 h-7">
            <AvatarImage src={req.profile?.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-secondary">
              {req.profile?.display_name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{req.profile?.display_name || req.profile?.username || "User"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleRequest(req.id, req.user_id, true)}>
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRequest(req.id, req.user_id, false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
