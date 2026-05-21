import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, Send, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Msg = {
  id: string;
  sender_role: "user" | "ai" | "admin";
  content: string | null;
  image_url: string | null;
  created_at: string;
};

const SupportChatWidget = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hide on admin & auth routes
  const hidden =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/install") ||
    location.pathname.startsWith("/reset-password");

  // Auth + ensure conversation
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted || !data.session) return;
      const uid = data.session.user.id;
      setUserId(uid);
      const { data: existing } = await supabase
        .from("support_conversations")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();
      if (existing) {
        setConvId(existing.id);
      } else {
        const { data: created } = await supabase
          .from("support_conversations")
          .insert({ user_id: uid })
          .select("id")
          .single();
        if (created) setConvId(created.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) {
        setUserId(null);
        setConvId(null);
        setMessages([]);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Load + subscribe
  useEffect(() => {
    if (!convId) return;
    supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Msg[]) || []));

    const ch = supabase
      .channel(`support-${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${convId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as Msg])
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [convId]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const triggerAi = async () => {
    try {
      await supabase.functions.invoke("support-ai-reply", { body: { conversationId: convId } });
    } catch (e) {
      console.error("AI reply failed", e);
    }
  };

  const sendMessage = async (image_url?: string) => {
    if (!convId || !userId) return;
    const text = draft.trim();
    if (!text && !image_url) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender_role: "user",
        sender_id: userId,
        content: text || null,
        image_url: image_url || null,
      });
      if (error) throw error;
      setDraft("");
      await supabase
        .from("support_conversations")
        .update({ last_message_at: new Date().toISOString(), unread_for_admin: 1 })
        .eq("id", convId);
      // Trigger AI (skipped server-side if toggle off)
      triggerAi();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !userId) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    setSending(true);
    try {
      const path = `${userId}/${Date.now()}-${f.name}`;
      const { error: upErr } = await supabase.storage.from("support-media").upload(path, f);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("support-media").getPublicUrl(path);
      await sendMessage(data.publicUrl);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (hidden || !userId) return null;

  return (
    <>
      {/* Floating button — sits above bottom nav */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI Support"
          className="fixed right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_0_25px_hsl(var(--primary)/0.5)] border-2 border-background flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" }}
        >
          <Headphones className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyber-neon-green animate-pulse" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-x-0 bottom-0 top-0 z-50 sm:inset-auto sm:bottom-24 sm:right-4 sm:top-16 sm:w-[380px] bg-card border border-border sm:rounded-2xl flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/20 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">Sporty Support</p>
                <p className="text-[10px] text-cyber-neon-green flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyber-neon-green animate-pulse" />
                  Online · Replies instantly
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/40">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <Headphones className="w-10 h-10 mx-auto mb-2 opacity-50" />
                Hi! How can we help you today? 👋
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_role === "user";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : m.sender_role === "admin"
                        ? "bg-cyber-neon-purple/20 text-foreground border border-cyber-neon-purple/40 rounded-bl-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {m.image_url && (
                      <img src={m.image_url} alt="" className="rounded-lg mb-1 max-w-full" />
                    )}
                    {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                    {!mine && (
                      <p className="text-[9px] opacity-60 mt-1">
                        {m.sender_role === "admin" ? "Support Team" : "Sporty Support"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-border bg-card">
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImage} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="min-h-[40px] max-h-32 resize-none"
              />
              <Button onClick={() => sendMessage()} disabled={sending || (!draft.trim())} size="icon">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
