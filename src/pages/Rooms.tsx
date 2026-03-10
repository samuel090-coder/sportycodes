import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Users, Lock, Globe, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

interface Room {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_public: boolean;
  member_count: number;
  creator_id: string;
  created_at: string;
}

const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "", is_public: true });
  const [creating, setCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      await Promise.all([fetchPublicRooms(), fetchMyRooms(user.id)]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchPublicRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("is_public", true).order("member_count", { ascending: false });
    if (data) setRooms(data);
  };

  const fetchMyRooms = async (uid: string) => {
    const { data: memberData } = await supabase.from("room_members").select("room_id").eq("user_id", uid).eq("is_blocked", false);
    if (memberData && memberData.length > 0) {
      const roomIds = memberData.map(m => m.room_id);
      const { data } = await supabase.from("rooms").select("*").in("id", roomIds).order("updated_at", { ascending: false });
      if (data) setMyRooms(data);
    }
  };

  const createRoom = async () => {
    if (!userId || !newRoom.name.trim()) return;
    setCreating(true);
    try {
      const { data: room, error } = await supabase.from("rooms").insert({
        creator_id: userId,
        name: newRoom.name.trim(),
        description: newRoom.description.trim() || null,
        is_public: newRoom.is_public,
      }).select().single();

      if (error) throw error;

      // Add creator as admin member
      await supabase.from("room_members").insert({
        room_id: room.id,
        user_id: userId,
        role: "admin",
      });

      toast({ title: "Room Created! 🎉", description: `${room.name} is ready` });
      setCreateOpen(false);
      setNewRoom({ name: "", description: "", is_public: true });
      navigate(`/rooms/${room.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  const filteredMyRooms = myRooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const RoomCard = ({ room }: { room: Room }) => (
    <div
      onClick={() => navigate(`/rooms/${room.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all cursor-pointer"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden shrink-0">
        {room.avatar_url ? (
          <img src={room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{room.name[0]?.toUpperCase()}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm text-foreground truncate">{room.name}</h3>
          {room.is_public ? (
            <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
          ) : (
            <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
          )}
        </div>
        {room.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{room.description}</p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{room.member_count} members</span>
        </div>
      </div>
      {room.creator_id === userId && (
        <Crown className="w-4 h-4 text-primary shrink-0" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-foreground">Rooms</h1>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" /> Create
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create a Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Room Name</Label>
                  <Input
                    placeholder="e.g. Football Tipsters"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    maxLength={50}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's this room about?"
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    maxLength={200}
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Public Room</Label>
                    <p className="text-xs text-muted-foreground">Anyone can find and join</p>
                  </div>
                  <Switch
                    checked={newRoom.is_public}
                    onCheckedChange={(v) => setNewRoom({ ...newRoom, is_public: v })}
                  />
                </div>
                <Button onClick={createRoom} disabled={creating || !newRoom.name.trim()} className="w-full">
                  {creating ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my" className="px-4 mt-3">
        <TabsList className="w-full bg-secondary">
          <TabsTrigger value="my" className="flex-1">My Rooms</TabsTrigger>
          <TabsTrigger value="explore" className="flex-1">Explore</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-2 mt-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredMyRooms.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No rooms yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create or join a room to get started</p>
            </div>
          ) : (
            filteredMyRooms.map(room => <RoomCard key={room.id} room={room} />)
          )}
        </TabsContent>

        <TabsContent value="explore" className="space-y-2 mt-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">No public rooms found</p>
            </div>
          ) : (
            filteredRooms.map(room => <RoomCard key={room.id} room={room} />)
          )}
        </TabsContent>
      </Tabs>

      <BottomNav />
    </div>
  );
};

export default Rooms;
