import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mail, Send, Loader2, AlertTriangle, CheckCircle2, Eye, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// EmailJS free tier: 200/month. Adjust if you upgrade.
const EMAILJS_MONTHLY_LIMIT = 200;

const TEMPLATES = [
  // Original 13
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
  { type: "profile_viewed", label: "👀 Profile Viewed" },
  { type: "post_liked", label: "❤️ Post Liked" },
  { type: "post_commented", label: "💬 Post Commented" },
  // 10 Social/Engagement
  { type: "post_shared", label: "🔁 Post Shared" },
  { type: "comment_reply", label: "↩️ Comment Reply" },
  { type: "comment_liked", label: "❤️ Comment Liked" },
  { type: "mentioned_in_comment", label: "📣 Mentioned in Comment" },
  { type: "milestone_followers", label: "🎉 Follower Milestone" },
  { type: "room_invite", label: "🚪 Room Invite" },
  { type: "room_tagged", label: "🏷️ Room Tagged Event" },
  { type: "level_up", label: "⬆️ Level Up" },
  { type: "challenge_completed", label: "🏅 Challenge Completed" },
  { type: "streak_milestone", label: "🔥 Streak Milestone" },
  // 10 Money/Activity
  { type: "wallet_credit", label: "💵 Wallet Credit" },
  { type: "wallet_debit", label: "💸 Wallet Debit" },
  { type: "p2p_received", label: "💰 P2P Received" },
  { type: "p2p_sent", label: "✅ P2P Sent" },
  { type: "pool_lost", label: "😔 Pool Lost" },
  { type: "pool_refunded", label: "↩️ Pool Refunded" },
  { type: "weekly_summary", label: "📊 Weekly Summary" },
  { type: "referral_bonus", label: "🎁 Referral Bonus" },
  { type: "referral_milestone", label: "🎯 Referral Milestone" },
  { type: "vip_expiring", label: "⏰ VIP Expiring" },
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
  profile_viewed: { viewerName: "BetKing99" },
  post_liked: { likerName: "BetKing99" },
  post_commented: { commenterName: "PunditPro", commentPreview: "This pick is 🔥! Following this one for sure." },
  // Social
  post_shared: { sharerName: "BetKing99" },
  comment_reply: { replierName: "PunditPro", replyPreview: "Totally agree, this is the play!" },
  comment_liked: { likerName: "TopTipster", commentPreview: "Easy money 💰" },
  mentioned_in_comment: { mentionerName: "BetKing99", commentPreview: "@you check this out, what do you think?" },
  milestone_followers: { count: 100 },
  room_invite: { inviterName: "PunditPro", roomName: "Premier League Insiders", roomId: "" },
  room_tagged: { taggerName: "BetKing99", roomName: "Weekend Warriors", roomId: "", eventType: "Sure Odd" },
  level_up: { newLevel: 5, totalXp: 12500 },
  challenge_completed: { challengeTitle: "Tap 100 Times", rewardCoins: 50, rewardXp: 100 },
  streak_milestone: { streakDays: 7 },
  // Money
  wallet_credit: { amount: 1500, source: "Daily Bonus Wheel", newBalance: 8750 },
  wallet_debit: { amount: 500, reason: "Pool Entry Fee", newBalance: 8250 },
  p2p_received: { senderName: "PunditPro", amount: 2000, note: "Thanks for the tip!" },
  p2p_sent: { receiverName: "BetKing99", amount: 1000, note: "Good luck with the bet" },
  pool_lost: { poolTitle: "Man City vs Arsenal", stake: 500 },
  pool_refunded: { poolTitle: "Cancelled Match Pool", amount: 500 },
  weekly_summary: { earnings: 8500, taps: 450, poolsJoined: 12, gamesPlayed: 5 },
  referral_bonus: { amount: 50 },
  referral_milestone: { count: 3 },
  vip_expiring: { daysLeft: 3, expiresAt: new Date(Date.now() + 3 * 86400000).toISOString() },
};

export const EmailTestSection = () => {
  const [recipient, setRecipient] = useState("");
  const [type, setType] = useState("payment_approved");
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  type LogEntry = { time: string; type: string; to: string; status: "ok" | "fail"; msg?: string };
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [{ count: today }, { count: month }] = await Promise.all([
        supabase.from("email_send_log").select("id", { count: "exact", head: true })
          .eq("status", "sent").gte("created_at", startOfDay),
        supabase.from("email_send_log").select("id", { count: "exact", head: true })
          .eq("status", "sent").gte("created_at", startOfMonth),
      ]);

      setTodayCount(today || 0);
      setMonthCount(month || 0);
    } catch (e) {
      console.error("Failed to load email stats:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

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
        toast.success(`Sent! ID: ${data.id}`);
        const entry: LogEntry = { time: new Date().toLocaleTimeString(), type, to: recipient, status: "ok", msg: data.id };
        setLogs((l) => [entry, ...l].slice(0, 20));
        loadStats();
      } else {
        const errMsg = typeof data?.error === "string" ? data.error : data?.error?.message || "Unknown error";
        toast.error(errMsg);
        const entry: LogEntry = { time: new Date().toLocaleTimeString(), type, to: recipient, status: "fail", msg: errMsg };
        setLogs((l) => [entry, ...l].slice(0, 20));
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
      const entry: LogEntry = { time: new Date().toLocaleTimeString(), type, to: recipient, status: "fail", msg: e.message };
      setLogs((l) => [entry, ...l].slice(0, 20));
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
      const html = (data as any)?.html;
      if (html) {
        setPreviewHtml(html);
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

      <Card className="p-4 border-green-500/40 bg-green-500/5">
        <div className="flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold text-green-500">EmailJS Active — Single Template, All Email Types</p>
            <p className="text-muted-foreground">
              Emails are now sent via <strong>EmailJS</strong> using one dynamic template that handles all 12 email types.
              Free tier: <strong>200 emails/month</strong>. Sender: configured in your EmailJS dashboard.
            </p>
          </div>
        </div>
      </Card>

      {/* Quota Counter */}
      <Card className="p-5 border-cyber-neon-purple/30 bg-cyber-neon-purple/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold font-mono text-cyber-neon-purple flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> EMAIL QUOTA TRACKER
          </h3>
          <Button size="sm" variant="ghost" onClick={loadStats} disabled={loadingStats} className="text-xs font-mono">
            {loadingStats ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="bg-cyber-dark/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground font-mono uppercase">Sent Today</p>
            <p className="text-2xl font-black text-cyber-neon-green font-mono">{todayCount}</p>
          </div>
          <div className="bg-cyber-dark/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground font-mono uppercase">Sent This Month</p>
            <p className="text-2xl font-black text-cyber-neon-cyan font-mono">{monthCount}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-muted-foreground">Monthly limit ({EMAILJS_MONTHLY_LIMIT})</span>
            <span className={monthCount >= EMAILJS_MONTHLY_LIMIT * 0.8 ? "text-red-500 font-bold" : "text-cyber-neon-green"}>
              {Math.max(0, EMAILJS_MONTHLY_LIMIT - monthCount)} remaining
            </span>
          </div>
          <Progress
            value={Math.min(100, (monthCount / EMAILJS_MONTHLY_LIMIT) * 100)}
            className="h-2"
          />
        </div>
        {monthCount >= EMAILJS_MONTHLY_LIMIT * 0.8 && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 font-mono">
            ⚠️ Approaching monthly limit. Consider upgrading EmailJS plan.
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4 border-cyber-neon-green/30">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-cyber-neon-cyan font-mono">Recipient Email</Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
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
          <li>Enter <strong>any email address</strong> (yours, a friend's, a test account — Brevo delivers to all).</li>
          <li>Pick a template, click <strong>Send Test Email</strong>.</li>
          <li>Check the inbox (and spam folder) within ~30 seconds.</li>
          <li>Use <strong>Preview Design</strong> to inspect the rendered HTML without sending.</li>
          <li>Free tier limit: <strong>300 emails/day</strong>. Upgrade Brevo plan to send more.</li>
        </ol>
      </Card>
    </div>
  );
};
