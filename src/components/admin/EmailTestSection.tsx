import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, Loader2, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TEMPLATES = [
  { type: "payment_approved", label: "✅ Payment Approved (Code Purchase)" },
  { type: "code_purchased", label: "🎟️ Code Purchased" },
  { type: "payment_declined", label: "❌ Payment Declined" },
  { type: "deposit_approved", label: "💰 Deposit Approved" },
  { type: "deposit_declined", label: "❌ Deposit Declined" },
  { type: "withdrawal_approved", label: "✅ Withdrawal Approved" },
  { type: "withdrawal_declined", label: "❌ Withdrawal Declined" },
  { type: "win_pool", label: "🏆 Won Betting Pool" },
  { type: "win_game", label: "🎮 Won Room Game" },
  { type: "new_follower", label: "👤 New Follower" },
  { type: "post_liked", label: "❤️ Post Liked" },
  { type: "post_commented", label: "💬 Post Commented" },
];

const SAMPLE_DATA: Record<string, any> = {
  payment_approved: { oddName: "Premier League VIP Tip", betCode: "X8K2P9Q5", prediction: "Over 2.5 Goals", odds: "1.85" },
  code_purchased: { oddName: "Premier League VIP Tip", betCode: "X8K2P9Q5", prediction: "Over 2.5 Goals", odds: "1.85" },
  payment_declined: { oddName: "Premier League VIP Tip", reason: "Payment screenshot was unclear or invalid." },
  deposit_approved: { amount: 5000 },
  deposit_declined: { amount: 5000, reason: "Payment proof did not match the amount claimed." },
  withdrawal_approved: { amount: 2500 },
  withdrawal_declined: { amount: 2500, reason: "Insufficient referrals (need at least 3)." },
  win_pool: { poolTitle: "Man City vs Arsenal — Who Wins?", payoutAmount: 12500 },
  win_game: { gameTitle: "Coin Flip Battle", payoutAmount: 850 },
  new_follower: { followerName: "JohnDoe23" },
  post_liked: { likerName: "BetKing99" },
  post_commented: { commenterName: "PunditPro", commentPreview: "This pick is 🔥! Following this one for sure." },
};

export const EmailTestSection = () => {
  const [recipient, setRecipient] = useState("");
  const [type, setType] = useState("payment_approved");
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [logs, setLogs] = useState<Array<{ time: string; type: string; to: string; status: "ok" | "fail"; msg?: string }>>([]);

  const sendTest = async () => {
    if (!recipient || !recipient.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type, userEmail: recipient, data: SAMPLE_DATA[type] },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Sent! Message ID: ${data.id}`);
        setLogs((l) => [{ time: new Date().toLocaleTimeString(), type, to: recipient, status: "ok", msg: data.id }, ...l].slice(0, 20));
      } else {
        const errMsg = typeof data?.error === "string" ? data.error : data?.error?.message || "Unknown error";
        toast.error(errMsg);
        setLogs((l) => [{ time: new Date().toLocaleTimeString(), type, to: recipient, status: "fail", msg: errMsg }, ...l].slice(0, 20));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
      setLogs((l) => [{ time: new Date().toLocaleTimeString(), type, to: recipient, status: "fail", msg: e.message }, ...l].slice(0, 20));
    } finally {
      setSending(false);
    }
  };

  const previewTemplate = async () => {
    setSending(true);
    try {
      // Send to a fake address with preview flag — backend ignores send and returns html
      // Since backend doesn't support preview, we render a local approximation by calling a "preview" endpoint workaround:
      // We'll call send-email with previewOnly flag; if not supported, fallback message.
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type, userEmail: "preview@example.com", data: SAMPLE_DATA[type], previewOnly: true },
      });
      if (error) throw error;
      if (data?.html) {
        setPreviewHtml(data.html);
      } else {
        toast.info("Preview returned no HTML. Send a real test instead.");
      }
    } catch (e: any) {
      toast.error("Preview failed: " + (e.message || ""));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-cyber-neon-green font-mono flex items-center gap-2">
          <Mail className="w-7 h-7" /> EMAIL TEST CENTER
        </h2>
        <p className="text-sm text-cyber-neon-cyan/70 font-mono mt-1">
          Send test emails through every template and preview the design.
        </p>
      </div>

      <Card className="p-4 border-yellow-500/40 bg-yellow-500/5">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold text-yellow-500">Resend Test Mode Limitation</p>
            <p className="text-muted-foreground">
              While using <code className="text-xs bg-muted px-1 rounded">onboarding@resend.dev</code> (no custom domain),
              Resend will <strong>only deliver to your own verified email</strong> (the email used to sign up at resend.com).
              Sending to other addresses returns a <strong>403</strong> error. To send to anyone, verify a domain on Resend.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4 border-cyber-neon-green/30">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-cyber-neon-cyan font-mono">Recipient Email</Label>
            <Input
              type="email"
              placeholder="your-resend-account@gmail.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-cyber-neon-cyan font-mono">Email Template</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground font-mono mb-1">Sample data being sent:</p>
          <pre className="text-xs text-cyber-neon-green font-mono overflow-auto">
            {JSON.stringify(SAMPLE_DATA[type], null, 2)}
          </pre>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={sendTest}
            disabled={sending || !recipient}
            className="bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-bold font-mono"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Test Email
          </Button>
          <Button
            onClick={previewTemplate}
            disabled={sending}
            variant="outline"
            className="border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan/10 font-mono"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Design
          </Button>
        </div>
      </Card>

      {previewHtml && (
        <Card className="p-4 border-cyber-neon-purple/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold font-mono text-cyber-neon-purple">📧 Email Preview</h3>
            <Button size="sm" variant="ghost" onClick={() => setPreviewHtml(null)}>Close</Button>
          </div>
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[600px] rounded-lg border border-border bg-white"
            title="Email preview"
          />
        </Card>
      )}

      <Card className="p-5 border-cyber-neon-cyan/30">
        <h3 className="font-bold font-mono text-cyber-neon-cyan mb-3">📋 Recent Test Sends</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground font-mono">No tests sent yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border text-sm font-mono"
              >
                {log.status === "ok" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className="text-muted-foreground text-xs">{log.time}</span>
                <Badge variant="outline" className="text-xs">{log.type}</Badge>
                <span className="text-foreground truncate flex-1">{log.to}</span>
                {log.msg && (
                  <span className={`text-xs truncate max-w-[200px] ${log.status === "ok" ? "text-green-500" : "text-red-500"}`}>
                    {log.msg}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 border-cyber-neon-green/20 bg-cyber-dark/40">
        <h3 className="font-bold font-mono text-cyber-neon-green mb-3">✅ How to verify it's working</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Enter the email you used to sign up at <strong>resend.com</strong> (only that inbox can receive in test mode).</li>
          <li>Pick a template, click <strong>Send Test Email</strong>.</li>
          <li>Check your inbox (and spam folder) within ~30 seconds.</li>
          <li>Use <strong>Preview Design</strong> to see the rendered HTML without sending.</li>
          <li>To send to <em>any</em> email address, verify a custom domain on resend.com.</li>
        </ol>
      </Card>
    </div>
  );
};
