import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Copy, Search, UserPlus, Check, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomInviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
}

export function RoomInviteSheet({ open, onOpenChange, roomId, roomName }: RoomInviteSheetProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [existingMembers, setExistingMembers] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/rooms/${roomId}`;

  useEffect(() => {
    if (open) {
      fetchExistingMembers();
      setSearch("");
      setUsers([]);
    }
  }, [open]);

  const fetchExistingMembers = async () => {
    const { data } = await supabase.from("room_members").select("user_id").eq("room_id", roomId);
    if (data) setExistingMembers(new Set(data.map(m => m.user_id)));
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[65vh]">
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

        {/* Search users */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or username..."
            value={search}
            onChange={(e) => searchUsers(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="mt-2 max-h-[35vh] overflow-y-auto space-y-1">
          {users.map((user) => {
            const isMember = existingMembers.has(user.id);
            return (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {user.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.display_name || user.username || "User"}</p>
                  {user.username && <p className="text-[10px] text-muted-foreground">@{user.username}</p>}
                </div>
                {isMember ? (
                  <span className="text-[10px] text-muted-foreground">Joined</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => inviteUser(user.id)}
                    disabled={inviting === user.id}
                    className="gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {inviting === user.id ? "..." : "Invite"}
                  </Button>
                )}
              </div>
            );
          })}
          {search.length >= 2 && users.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}
          {search.length < 2 && (
            <p className="text-center text-sm text-muted-foreground py-4">Type to search for users</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
