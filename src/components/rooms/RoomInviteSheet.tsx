import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Search, UserPlus, Check, Link2, Users, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
  userId?: string;
}

export function RoomInviteSheet({ open, onOpenChange, roomId, roomName, userId }: RoomInviteSheetProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [existingMembers, setExistingMembers] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/rooms/${roomId}`;

  useEffect(() => {
    if (open) {
      const init = async () => {
        if (!currentUserId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) setCurrentUserId(user.id);
        }
        fetchExistingMembers();
      };
      init();
    }
  }, [open]);

  useEffect(() => {
    if (open && currentUserId) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [open, currentUserId]);

  const fetchExistingMembers = async () => {
    const { data } = await supabase.from("room_members").select("user_id").eq("room_id", roomId);
    if (data) setExistingMembers(new Set(data.map(m => m.user_id)));
  };

  const fetchFollowers = async () => {
    if (!currentUserId) return;
    const { data: followData } = await supabase.from("follows").select("follower_id").eq("following_id", currentUserId);
    if (followData && followData.length > 0) {
      const ids = followData.map(f => f.follower_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      if (profiles) setFollowers(profiles);
    }
  };

  const fetchFollowing = async () => {
    if (!currentUserId) return;
    const { data: followData } = await supabase.from("follows").select("following_id").eq("follower_id", currentUserId);
    if (followData && followData.length > 0) {
      const ids = followData.map(f => f.following_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", ids);
      if (profiles) setFollowing(profiles);
    }
  };

  const searchUsers = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setUsers([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, username")
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(15);
    if (data) setUsers(data);
  };

  const inviteUser = async (targetUserId: string) => {
    setInviting(targetUserId);
    const { error } = await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: targetUserId,
      role: "member",
    });
    if (error) {
      toast({ title: "Failed to invite", description: error.message, variant: "destructive" });
    } else {
      setExistingMembers(prev => new Set([...prev, targetUserId]));
      toast({ title: "User invited! 🎉" });
    }
    setInviting(null);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const hasConnections = followers.length > 0 || following.length > 0;

  const UserRow = ({ user }: { user: any }) => {
    const isMember = existingMembers.has(user.id);
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.avatar_url || ""} />
          <AvatarFallback className="text-xs bg-secondary">{user.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{user.display_name || user.username || "User"}</p>
          {user.username && <p className="text-[10px] text-muted-foreground">@{user.username}</p>}
        </div>
        {isMember ? (
          <span className="text-[10px] text-muted-foreground">Joined</span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => inviteUser(user.id)} disabled={inviting === user.id} className="gap-1">
            <UserPlus className="w-3.5 h-3.5" />
            {inviting === user.id ? "..." : "Invite"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" /> Invite to {roomName}
          </SheetTitle>
        </SheetHeader>

        {/* Share link */}
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-card border border-border rounded-xl">
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground truncate flex-1">{inviteLink}</p>
          <Button size="sm" variant="secondary" onClick={copyLink} className="gap-1 shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <Tabs defaultValue={hasConnections ? "connections" : "explore"} className="mt-3">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="connections" className="flex-1 gap-1 text-xs">
              <Users className="w-3.5 h-3.5" /> My People
            </TabsTrigger>
            <TabsTrigger value="explore" className="flex-1 gap-1 text-xs">
              <Globe className="w-3.5 h-3.5" /> Explore
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-2 max-h-[38vh] overflow-y-auto space-y-1">
            {!hasConnections ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No followers or following yet</p>
                <p className="text-xs text-muted-foreground mt-1">Switch to Explore to find users</p>
              </div>
            ) : (
              <>
                {followers.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pt-1">Followers</p>
                    {followers.map(u => <UserRow key={u.id} user={u} />)}
                  </>
                )}
                {following.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground px-1 pt-2">Following</p>
                    {following.map(u => <UserRow key={u.id} user={u} />)}
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="explore" className="mt-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or username..." value={search} onChange={(e) => searchUsers(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[32vh] overflow-y-auto space-y-1">
              {users.map(u => <UserRow key={u.id} user={u} />)}
              {search.length >= 2 && users.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
              )}
              {search.length < 2 && (
                <p className="text-center text-sm text-muted-foreground py-4">Type to search for users</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
