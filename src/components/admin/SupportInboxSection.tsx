import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Sparkles, Eye, Loader2 } from "lucide-react";

type Conv = { id: string; user_id: string; last_message_at: string; unread_for_admin: number };
type Msg = { id: string; sender_role: string; content: string | null; image_url: string | null; created_at: string };

export const SupportInboxSection = () => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [active, setActive] = useState<Conv | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [rewriteMode, setRewriteMode] = useState<"silent" | "preview">("preview");
  const [busy, setBusy] = useState(false);

  // Load AI toggle
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "support_ai_enabled")
      .maybeSingle()
      .then(({ data }) => setAiEnabled(data?.setting_value === "true"));
  }, []);

  const toggleAi = async (val: boolean) => {
    setAiEnabled(val);
    await supabase
      .from("app_settings")
      .upsert({ setting_key: "support_ai_enabled", setting_value: val ? "true" : "false" }, { onConflict: "setting_key" });
    toast.success(`AI Support ${val ? "enabled" : "disabled"}`);
  };

  // Load convs
  const loadConvs = async () => {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    const list = (data as Conv[]) || [];
    setConvs(list);
    if (list.length) {
      const ids = list.map((c) => c.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    }
  };

  useEffect(() => {
    loadConvs();
    const ch = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, loadConvs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!active) return;
    supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", active.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data as Msg[]) || []));
    const ch = supabase
      .channel(`admin-msgs-${active.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${active.id}` },
        (p) => setMessages((prev) => [...prev, p.new as Msg])
      )
      .subscribe();
    // mark read
    supabase.from("support_conversations").update({ unread_for_admin: 0 }).eq("id", active.id);
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const rewrite = async (text: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("support-rewrite", { body: { draft: text } });
    if (error) throw error;
    return (data as any).text as string;
  };

  const send = async (content: string) => {
    if (!active || !content.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("support_messages").insert({
      conversation_id: active.id,
      sender_role: "admin",
      sender_id: u.user?.id,
      content,
    });
    await supabase
      .from("support_conversations")
      .update({ last_message_at: new Date().toISOString(), unread_for_user: 1 })
      .eq("id", active.id);
    setDraft("");
    setPreview(null);
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const polished = await rewrite(draft);
      if (rewriteMode === "preview") {
        setPreview(polished);
      } else {
        await send(polished);
      }
    } catch (e: any) {
      toast.error(e.message || "Rewrite failed — sending raw");
      await send(draft);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
        <div>
          <h2 className="text-xl font-black text-foreground">AI Support Inbox</h2>
          <p className="text-xs text-muted-foreground">Toggle AI to auto-reply when you're away.</p>
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-sm">AI Auto-Reply</Label>
          <Switch checked={aiEnabled} onCheckedChange={toggleAi} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
        {/* Convo list */}
        <div className="bg-card border border-border rounded-xl overflow-y-auto">
          {convs.length === 0 && <p className="text-center text-muted-foreground p-8 text-sm">No conversations yet.</p>}
          {convs.map((c) => {
            const p = profiles[c.user_id];
            return (
              <button
                key={c.id}
                onClick={() => setActive(c)}
                className={`w-full text-left p-3 border-b border-border hover:bg-secondary/50 ${active?.id === c.id ? "bg-secondary" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                    {(p?.display_name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p?.display_name || c.user_id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.last_message_at).toLocaleString()}
                    </p>
                  </div>
                  {c.unread_for_admin > 0 && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat */}
        <div className="bg-card border border-border rounded-xl flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      m.sender_role === "user"
                        ? "bg-secondary text-foreground"
                        : m.sender_role === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-cyber-neon-purple/20 border border-cyber-neon-purple/40"
                    }`}>
                      {m.image_url && <img src={m.image_url} className="rounded mb-1 max-w-full" />}
                      {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                      <p className="text-[9px] opacity-60 mt-1">{m.sender_role}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Rewrite mode:</Label>
                    <button
                      onClick={() => setRewriteMode("preview")}
                      className={`px-2 py-1 rounded ${rewriteMode === "preview" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      <Eye className="w-3 h-3 inline mr-1" /> Preview
                    </button>
                    <button
                      onClick={() => setRewriteMode("silent")}
                      className={`px-2 py-1 rounded ${rewriteMode === "silent" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      <Sparkles className="w-3 h-3 inline mr-1" /> Quick-send
                    </button>
                  </div>
                </div>

                {preview && (
                  <div className="bg-secondary/50 border border-primary/30 rounded-lg p-2 text-sm">
                    <p className="text-[10px] text-muted-foreground mb-1">AI rewrite preview (edit if needed):</p>
                    <Textarea value={preview} onChange={(e) => setPreview(e.target.value)} rows={3} />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={() => send(preview)}>Send polished</Button>
                      <Button size="sm" variant="outline" onClick={() => setPreview(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type your reply (will be polished by AI)..."
                    rows={2}
                  />
                  <Button onClick={handleSend} disabled={busy || !draft.trim()}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
