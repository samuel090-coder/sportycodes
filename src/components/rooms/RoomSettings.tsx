import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Shield, Ban, UserMinus, Crown, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoomJoinRequests } from "@/components/rooms/RoomJoinRequests";

interface Room {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_public: boolean;
  member_count: number;
  creator_id: string;
  require_approval?: boolean;
  join_fee?: number;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  is_blocked: boolean;
  joined_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null; username: string | null };
}

interface RoomSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
  onUpdate: () => void;
}

export function RoomSettings({ open, onOpenChange, room, onUpdate }: RoomSettingsProps) {
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description || "");
  const [isPublic, setIsPublic] = useState(room.is_public);
  const [requireApproval, setRequireApproval] = useState(room.require_approval || false);
  const [joinFee, setJoinFee] = useState(room.join_fee || 0);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName(room.name);
      setDescription(room.description || "");
      setIsPublic(room.is_public);
      setRequireApproval(room.require_approval || false);
      setJoinFee(room.join_fee || 0);
      fetchMembers();
    }
  }, [open, room]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("room_members")
      .select("*")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true });

    if (data) {
      const userIds = data.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setMembers(data.map(m => ({ ...m, profiles: profileMap[m.user_id] })));
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("rooms").update({
      name: name.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      require_approval: requireApproval,
      join_fee: joinFee,
    }).eq("id", room.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved ✅" });
      onUpdate();
    }
    setSaving(false);
  };

  const uploadImage = async (file: File, type: "avatar" | "cover") => {
    const ext = file.name.split(".").pop();
    const path = `${room.id}/${type}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("room-media").upload(path, file, { upsert: true });
    if (uploadErr) { toast({ title: "Upload failed", variant: "destructive" }); return; }

    const { data: { publicUrl } } = supabase.storage.from("room-media").getPublicUrl(path);
    const updateField = type === "avatar" ? { avatar_url: publicUrl } : { cover_url: publicUrl };
    await supabase.from("rooms").update(updateField).eq("id", room.id);
    toast({ title: `${type === "avatar" ? "Profile" : "Cover"} photo updated!` });
    onUpdate();
  };

  const toggleBlock = async (memberId: string, currentBlocked: boolean) => {
    await supabase.from("room_members").update({ is_blocked: !currentBlocked }).eq("id", memberId);
    fetchMembers();
    toast({ title: currentBlocked ? "User unblocked" : "User blocked" });
  };

  const updateRole = async (memberId: string, newRole: string) => {
    await supabase.from("room_members").update({ role: newRole }).eq("id", memberId);
    fetchMembers();
    toast({ title: `Role updated to ${newRole}` });
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("room_members").delete().eq("id", memberId);
    fetchMembers();
    onUpdate();
    toast({ title: "Member removed" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-background border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground">Room Settings</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="w-full bg-secondary">
            <TabsTrigger value="general" className="flex-1 text-xs">General</TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-xs">Members</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 text-xs">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-3">
            {/* Avatar & Cover */}
            <div className="flex gap-4">
              <div className="text-center">
                <Label className="text-xs">Avatar</Label>
                <label className="block mt-1 cursor-pointer">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative group">
                    {room.avatar_url ? (
                      <img src={room.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "avatar")} />
                </label>
              </div>
              <div className="flex-1 text-center">
                <Label className="text-xs">Cover</Label>
                <label className="block mt-1 cursor-pointer">
                  <div className="w-full h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden relative group">
                    {room.cover_url ? (
                      <img src={room.cover_url} className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
                </label>
              </div>
            </div>

            <div>
              <Label>Room Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} className="mt-1" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Public Room</Label>
                <p className="text-xs text-muted-foreground">Anyone can find and join</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-xs text-muted-foreground">Approve members before they join</p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>

            <div>
              <Label>Join Fee (₦)</Label>
              <p className="text-xs text-muted-foreground mb-1">Set to 0 for free. Premium rooms charge to join.</p>
              <Input
                type="number"
                min={0}
                value={joinFee}
                onChange={(e) => setJoinFee(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            <Button onClick={saveSettings} disabled={saving || !name.trim()} className="w-full">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </TabsContent>

          <TabsContent value="members" className="space-y-2 mt-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border border-border">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.profiles?.avatar_url || ""} />
                  <AvatarFallback className="text-xs bg-secondary">
                    {member.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.profiles?.display_name || member.profiles?.username || "User"}
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-[9px] h-4">
                      {member.role}
                    </Badge>
                    {member.is_blocked && (
                      <Badge variant="destructive" className="text-[9px] h-4">blocked</Badge>
                    )}
                  </div>
                </div>
                {member.role !== "admin" && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => updateRole(member.id, member.role === "moderator" ? "member" : "moderator")}
                      title={member.role === "moderator" ? "Demote to member" : "Promote to moderator"}
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => toggleBlock(member.id, member.is_blocked)}
                      title={member.is_blocked ? "Unblock" : "Block"}
                    >
                      <Ban className={`w-3.5 h-3.5 ${member.is_blocked ? "text-destructive" : ""}`} />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => removeMember(member.id)}
                      title="Remove"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          <TabsContent value="requests" className="mt-3">
            <RoomJoinRequests roomId={room.id} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
