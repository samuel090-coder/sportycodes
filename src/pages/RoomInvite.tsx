import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, MessageCircle, Gamepad2 } from "lucide-react";

const RoomInvite = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!inviteCode) { setIsLoading(false); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);

      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("invite_code", inviteCode)
        .single();
      
      if (data) setRoom(data);
      setIsLoading(false);
    };
    load();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!userId) {
      navigate("/auth");
      return;
    }
    if (!room) return;
    setJoining(true);
    
    // Check if already member
    const { data: existing } = await supabase
      .from("room_members")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .single();
    
    if (existing) {
      navigate(`/rooms/${room.id}`);
      return;
    }

    const { error } = await supabase.from("room_members").insert({
      room_id: room.id, user_id: userId, role: "member"
    });

    if (error) {
      setJoining(false);
      return;
    }
    navigate(`/rooms/${room.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Room Not Found</h2>
          <p className="text-muted-foreground mb-4">This invite link may be invalid or expired.</p>
          <Button onClick={() => navigate("/rooms")}>Browse Rooms</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Room Card */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-3xl blur-lg opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 overflow-hidden">
            {room.cover_url && (
              <img src={room.cover_url} alt="" className="w-full h-32 object-cover" />
            )}
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-3 -mt-12 border-4 border-card overflow-hidden">
                {room.avatar_url ? (
                  <img src={room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">{room.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <h2 className="text-xl font-black text-foreground">{room.name}</h2>
              {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
              
              <div className="flex justify-center gap-4 mt-4 mb-6">
                <div className="text-center">
                  <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{room.member_count} members</p>
                </div>
                <div className="text-center">
                  <MessageCircle className="w-4 h-4 text-cyber-neon-cyan mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Chat</p>
                </div>
                <div className="text-center">
                  <Gamepad2 className="w-4 h-4 text-bet-warning mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Games</p>
                </div>
              </div>

              <Button onClick={handleJoin} disabled={joining} className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg rounded-xl">
                {joining ? "Joining..." : <><span>Join Room</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>

              {!userId && (
                <p className="text-xs text-muted-foreground mt-3">You'll need to sign in or create an account first</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomInvite;