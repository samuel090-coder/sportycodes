import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, Settings, Tag, DollarSign, Users, LogOut, UserPlus, Gamepad2, Share2, Image, Paperclip, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RoomSettings } from "@/components/rooms/RoomSettings";
import { RoomEventSheet } from "@/components/rooms/RoomEventSheet";
import { RoomTransferSheet } from "@/components/rooms/RoomTransferSheet";
import { RoomEventCard } from "@/components/rooms/RoomEventCard";
import { RoomInviteSheet } from "@/components/rooms/RoomInviteSheet";
import { RoomCreatePoolSheet } from "@/components/rooms/RoomCreatePoolSheet";
import { RoomGamesSheet } from "@/components/rooms/RoomGamesSheet";
import { RoomGameCard } from "@/components/rooms/RoomGameCard";
import { RoomCrossPostSheet } from "@/components/rooms/RoomCrossPostSheet";
import { RoomMediaMessage } from "@/components/rooms/RoomMediaMessage";
import { RoomVoiceNote } from "@/components/rooms/RoomVoiceNote";
import { RoomVoicePlayer } from "@/components/rooms/RoomVoicePlayer";
import { RoomMessageReactions } from "@/components/rooms/RoomMessageReactions";
import { Badge } from "@/components/ui/badge";
import { FramedBubble } from "@/components/rooms/MessageFrames";
import { FramePickerSheet } from "@/components/rooms/FramePickerSheet";

interface Message {
  id: string;
  user_id: string;
  content: string | null;
  message_type: string;
  metadata: any;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null; username: string | null };
}

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

const RoomDetail = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [crossPostOpen, setCrossPostOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chatFrame, setChatFrame] = useState<string>("default");
  const [framePickerOpen, setFramePickerOpen] = useState(false);



  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("chat_frame").eq("id", user.id).maybeSingle();
      if (prof?.chat_frame) setChatFrame(prof.chat_frame);
      await fetchRoom();
      await checkMembership(user.id);
      setLoading(false);
    };
    init();
  }, [roomId]);


  useEffect(() => {
    if (!isMember || !roomId) return;
    fetchMessages();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const msg = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url, username").eq("id", msg.user_id).single();
          setMessages(prev => [...prev, { ...msg, profiles: profile }]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isMember, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchRoom = async () => {
    if (!roomId) return;
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (data) setRoom(data as Room);
  };

  const checkMembership = async (uid: string) => {
    if (!roomId) return;
    const { data } = await supabase.from("room_members").select("role, is_blocked").eq("room_id", roomId).eq("user_id", uid).single();
    if (data && !data.is_blocked) {
      setIsMember(true);
      setIsAdmin(data.role === "admin");
    } else {
      // Check if join request already sent
      const { data: req } = await supabase.from("room_join_requests").select("id").eq("room_id", roomId).eq("user_id", uid).eq("status", "pending").maybeSingle();
      if (req) setRequestSent(true);
    }
  };

  const fetchMessages = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("room_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url, username").in("id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setMessages(data.map(m => ({
        ...m,
        profiles: profileMap[m.user_id] || { display_name: "Unknown", avatar_url: null, username: null }
      })));
    }
  };

  const joinRoom = async () => {
    if (!userId || !roomId || !room) return;
    setJoining(true);

    // Handle premium rooms - deduct fee
    if (room.join_fee && room.join_fee > 0) {
      const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
      if (!wallet || Number(wallet.balance) < room.join_fee) {
        toast({ title: "Insufficient balance", description: `This room requires ₦${room.join_fee} to join`, variant: "destructive" });
        setJoining(false);
        return;
      }
      await supabase.from("wallets").update({ balance: Number(wallet.balance) - room.join_fee }).eq("user_id", userId);
      // Credit room creator
      await supabase.rpc("add_tap_earnings", { _user_id: room.creator_id, _amount: room.join_fee });
    }

    // Handle approval-required rooms
    if (room.require_approval) {
      const { error } = await supabase.from("room_join_requests").insert({ room_id: roomId, user_id: userId });
      if (error) {
        toast({ title: "Can't request", description: error.message, variant: "destructive" });
      } else {
        setRequestSent(true);
        toast({ title: "Request sent! ⏳", description: "Waiting for admin approval" });
      }
      setJoining(false);
      return;
    }

    const { error } = await supabase.from("room_members").insert({ room_id: roomId, user_id: userId, role: "member" });
    if (error) {
      toast({ title: "Can't join", description: error.message, variant: "destructive" });
    } else {
      setIsMember(true);
      toast({ title: "Joined! 🎉" });
      fetchMessages();
      fetchRoom();
    }
    setJoining(false);
  };

  const leaveRoom = async () => {
    if (!userId || !roomId) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    toast({ title: "Left room" });
    navigate("/rooms");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || !roomId) return;
    const msg = newMessage.trim();
    setNewMessage("");
    await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: userId,
      content: msg,
      message_type: "text",
      metadata: { frame: chatFrame },
    });
    supabase.functions.invoke("notify-room-message", {
      body: { room_id: roomId, sender_id: userId, message_preview: msg.substring(0, 80) },
    }).catch(() => {});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !roomId) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${roomId}/chat/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("room-media").upload(path, file);
    if (uploadErr) {
      toast({ title: "Upload failed", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("room-media").getPublicUrl(path);
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const mediaType = isVideo ? "video" : isImage ? "image" : "file";

    await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: userId,
      content: file.name,
      message_type: "media",
      metadata: { media_url: publicUrl, media_type: mediaType, file_name: file.name },
    });

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVoiceSend = async (blob: Blob, duration: number) => {
    if (!userId || !roomId) return;
    const path = `${roomId}/voice/${Date.now()}.webm`;
    const { error: uploadErr } = await supabase.storage.from("room-media").upload(path, blob, { contentType: "audio/webm" });
    if (uploadErr) { toast({ title: "Upload failed", variant: "destructive" }); return; }

    const { data: { publicUrl } } = supabase.storage.from("room-media").getPublicUrl(path);
    await supabase.from("room_messages").insert({
      room_id: roomId,
      user_id: userId,
      content: "🎤 Voice note",
      message_type: "voice",
      metadata: { audio_url: publicUrl, duration },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const updateChatFrame = async (frameId: string) => {
    setChatFrame(frameId);
    if (!userId) return;
    await supabase.from("profiles").update({ chat_frame: frameId }).eq("id", userId);
    toast({ title: "Frame updated ✨", description: "Your next messages will use this frame." });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!room) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Room not found</div>;

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="shrink-0 bg-card border-b border-border px-3 py-2.5 flex items-center gap-3">
        <button onClick={() => navigate("/rooms")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
          {room.avatar_url ? (
            <img src={room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-primary">{room.name[0]?.toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="font-semibold text-sm text-foreground truncate">{room.name}</h2>
            {room.join_fee && room.join_fee > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                <Crown className="w-2.5 h-2.5" /> Premium
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{room.member_count} members</p>
        </div>
        <div className="flex items-center gap-0.5">
          {isMember && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEventOpen(true)} title="Tag Event">
                <Tag className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setGamesOpen(true)} title="Games">
                <Gamepad2 className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTransferOpen(true)} title="Transfer">
                <DollarSign className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInviteOpen(true)} title="Invite">
                <UserPlus className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCrossPostOpen(true)} title="Tag Group">
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-3.5 h-3.5" />
            </Button>
          )}
          {isMember && !isAdmin && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={leaveRoom}>
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {!isMember ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            {room.cover_url && (
              <img src={room.cover_url} alt="" className="w-full max-h-32 object-cover rounded-xl" />
            )}
            <div className="text-center">
              <h3 className="font-bold text-lg text-foreground">{room.name}</h3>
              {room.description && <p className="text-sm text-muted-foreground mt-1">{room.description}</p>}
              <p className="text-xs text-muted-foreground mt-2">{room.member_count} members</p>
              {room.join_fee && room.join_fee > 0 && (
                <Badge variant="secondary" className="mt-2 gap-1">
                  <Crown className="w-3 h-3" /> Premium · ₦{room.join_fee}
                </Badge>
              )}
              {room.require_approval && (
                <p className="text-xs text-muted-foreground mt-1">⏳ Admin approval required</p>
              )}
            </div>
            {room.is_public || room.require_approval ? (
              requestSent ? (
                <p className="text-sm text-muted-foreground">⏳ Join request pending approval...</p>
              ) : (
                <Button onClick={joinRoom} disabled={joining} className="gap-2">
                  <Users className="w-4 h-4" />
                  {joining ? "Processing..." : room.join_fee && room.join_fee > 0
                    ? `Join for ₦${room.join_fee}`
                    : room.require_approval
                      ? "Request to Join"
                      : "Join Room"
                  }
                </Button>
              )
            ) : (
              <p className="text-sm text-muted-foreground">This room is private. You need an invite to join.</p>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">No messages yet. Say something! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === userId;

            if (msg.message_type === "event") {
              return <RoomEventCard key={msg.id} message={msg} userId={userId} roomId={roomId!} />;
            }

            if (msg.message_type === "game") {
              return <RoomGameCard key={msg.id} message={msg} userId={userId} roomId={roomId!} />;
            }

            if (msg.message_type === "transfer" || msg.message_type === "system") {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5 text-xs text-center max-w-[85%]">
                    {msg.message_type === "transfer" && <DollarSign className="w-3 h-3 inline mr-1" />}
                    {msg.content}
                  </div>
                </div>
              );
            }

            const isMedia = msg.message_type === "media";
            const isVoice = msg.message_type === "voice";
            const meta = msg.metadata || {};

            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "justify-end" : ""}`}>
                {!isMe && (
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={msg.profiles?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-secondary">
                      {msg.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] ${isMe ? "order-1" : ""}`}>
                  {!isMe && (
                    <p className="text-[10px] font-medium text-primary mb-0.5 ml-1">
                      {msg.profiles?.display_name || msg.profiles?.username || "User"}
                    </p>
                  )}
                  <div className={`rounded-2xl px-3 py-2 text-sm ${isMe
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                  }`}>
                    {isMedia && meta.media_url && (
                      <RoomMediaMessage
                        mediaUrl={meta.media_url}
                        mediaType={meta.media_type || "image"}
                        caption={msg.content !== meta.file_name ? msg.content || undefined : undefined}
                      />
                    )}
                    {isVoice && meta.audio_url && (
                      <RoomVoicePlayer audioUrl={meta.audio_url} duration={meta.duration} />
                    )}
                    {!isMedia && !isVoice && msg.content}
                  </div>
                  <RoomMessageReactions messageId={msg.id} userId={userId} />
                  <p className={`text-[9px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      {isMember && (
        <div className="shrink-0 bg-card border-t border-border px-3 py-2 flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <RoomVoiceNote onSend={handleVoiceSend} />
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim() || uploading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Sheets */}
      {isAdmin && (
        <RoomSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          room={room}
          onUpdate={() => { fetchRoom(); }}
        />
      )}

      <RoomEventSheet open={eventOpen} onOpenChange={setEventOpen} roomId={roomId!} userId={userId!} isAdmin={isAdmin} />
      <RoomTransferSheet open={transferOpen} onOpenChange={setTransferOpen} roomId={roomId!} userId={userId!} />
      <RoomInviteSheet open={inviteOpen} onOpenChange={setInviteOpen} roomId={roomId!} roomName={room.name} userId={userId!} />
      <RoomCreatePoolSheet open={createPoolOpen} onOpenChange={setCreatePoolOpen} roomId={roomId!} userId={userId!} />
      <RoomGamesSheet open={gamesOpen} onOpenChange={setGamesOpen} roomId={roomId!} userId={userId!} />
      <RoomCrossPostSheet open={crossPostOpen} onOpenChange={setCrossPostOpen} roomId={roomId!} roomName={room.name} userId={userId!} />
    </div>
  );
};

export default RoomDetail;
