import { useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, ChevronLeft, ArrowUpRight, Check, Clock3, Wallet, Receipt, ShieldCheck, RefreshCw, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { promptDeposit } from "@/lib/insufficientFunds";
import { useVipPrice } from "@/hooks/useVipPrice";
import { useVipStatus } from "@/hooks/useVipStatus";
import crownImage from "@/assets/vip-crown.jpg";

type Purchase = { id: string; status: string; starts_at: string | null; expires_at: string | null; price: number; created_at: string; payment_reference: string | null };
const money = (value: number) => `₦${Number(value).toLocaleString()}`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const VIPSubscription = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"purchase" | "cancel" | null>(null);
  const [now, setNow] = useState(Date.now());
  const requestId = useRef<string | null>(null);
  const { vipPrice, loadingPrice } = useVipPrice();
  const { subscription, isVip, loadingVip, refreshVip } = useVipStatus(user?.id, user?.email);
  const loadData = useCallback(async () => {
    if (!user) return;
    const [walletResult, historyResult] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("vip_subscriptions").select("id,status,starts_at,expires_at,price,created_at,payment_reference").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (walletResult.error || historyResult.error) toast.error("Unable to load membership details. Please try again.");
    if (walletResult.data) setBalance(Number(walletResult.data.balance || 0));
    if (historyResult.data) setHistory(historyResult.data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
    });
    return () => { mounted = false; };
  }, [navigate]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`vip-manager-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_subscriptions", filter: `user_id=eq.${user.id}` }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, loadData).subscribe();
    window.addEventListener("focus", loadData);
    return () => { supabase.removeChannel(channel); window.removeEventListener("focus", loadData); };
  }, [user, loadData]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const expiry = subscription?.expires_at ? new Date(subscription.expires_at).getTime() : 0;
  const active = isVip && expiry > now;
  const seconds = active ? Math.max(0, Math.floor((expiry - now) / 1000)) : 0;
  const countdown = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60];
  const pending = !active && subscription?.status === "pending";

  const submit = async () => {
    if (!user || busy || !action) return;
    setBusy(true);
    try {
      if (action === "cancel") {
        const { error } = await supabase.rpc("cancel_my_vip");
        if (error) throw error;
        toast.success("VIP membership cancelled");
      } else {
        if (!requestId.current) requestId.current = crypto.randomUUID();
        const { error } = await supabase.rpc("purchase_vip_with_wallet", { _request_id: requestId.current, _expected_price: vipPrice });
        if (error) throw error;
        requestId.current = null;
        toast.success(active ? "VIP renewed — one month added" : "Welcome to VIP. Premium predictions are unlocked.");
      }
      setAction(null);
      await Promise.all([loadData(), refreshVip()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || "Unable to update your membership";
      if (message.toLowerCase().includes("insufficient")) { setAction(null); promptDeposit(); } else toast.error(message);
    } finally { setBusy(false); }
  };
  const openPurchase = () => {
    if (balance < vipPrice) { promptDeposit(); return; }
    requestId.current = crypto.randomUUID();
    setAction("purchase");
  };

  if (loading || loadingVip || loadingPrice) return <div className="membership-page min-h-screen flex items-center justify-center"><Crown className="h-10 w-10 text-bet-warning animate-pulse" /></div>;
  return (
    <div className="membership-page min-h-screen pb-32">
      <header className="max-w-2xl mx-auto px-5 pt-5 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(-1)}><ChevronLeft /></Button>
        <span className="text-xs font-bold tracking-widest text-muted-foreground">SPORTY CODES / MEMBERSHIP</span>
        <ShieldCheck className="w-5 h-5 text-bet-warning" />
      </header>
      <main className="max-w-2xl mx-auto px-6">
        <section className="relative pt-7 pb-7 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="relative z-10 pt-3">
              <p className="text-bet-warning text-xs font-bold tracking-widest mb-3">YOUR PREMIUM PASS</p>
              <h1 className="membership-heading text-4xl sm:text-5xl leading-tight">SPORTY<br />VIP CLUB<span className="text-primary">.</span></h1>
              <span className={`inline-flex items-center gap-2 mt-5 text-xs font-bold uppercase ${active ? "text-bet-success" : "text-muted-foreground"}`}><span className={`w-2 h-2 rounded-full ${active ? "bg-bet-success" : "bg-muted-foreground"}`} />{active ? "Membership active" : pending ? "Awaiting approval" : "Free account"}</span>
            </div>
            <img src={crownImage} alt="Gold Sporty VIP crown" width={768} height={768} className="w-28 h-28 sm:w-48 sm:h-48 object-contain mt-5" />
          </div>
          <p className="text-muted-foreground mt-5 text-sm">{active ? "Your next winning pick is waiting." : "One membership. Every premium prediction."}</p>
        </section>

        {active ? <section className="py-7 border-b border-border">
          <div className="flex justify-between items-center mb-5"><h2 className="font-bold flex items-center gap-2"><Clock3 className="w-4 h-4 text-bet-warning" /> Time remaining</h2><span className="text-xs text-muted-foreground">Until {date(subscription?.expires_at)}</span></div>
          <div className="grid grid-cols-4 gap-2" role="timer" aria-label="Time until VIP expires">
            {countdown.map((value, i) => <div key={i} className="membership-clock rounded-lg py-4 text-center"><span className="block text-3xl sm:text-4xl font-bold tabular-nums">{String(value).padStart(2, "0")}</span><span className="text-[10px] uppercase tracking-widest text-muted-foreground">{["Days", "Hours", "Minutes", "Seconds"][i]}</span></div>)}
          </div>
          <Button className="w-full h-12 mt-5" onClick={() => navigate("/")}>Explore premium predictions<ArrowUpRight className="ml-2 w-4 h-4" /></Button>
        </section> : <section className="py-7 border-b border-border"><div className="flex items-baseline gap-2"><span className="membership-heading text-4xl text-bet-warning">{money(vipPrice)}</span><span className="text-muted-foreground text-sm">/ month</span></div><p className="text-sm mt-2 text-muted-foreground">{pending ? "Your payment is being reviewed. Your membership activates after approval." : "Unlock unlimited premium access for one month."}</p></section>}

        <section className="py-6 border-b border-border">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground mb-4">{active ? "MEMBERSHIP DETAILS" : "INCLUDED IN YOUR MEMBERSHIP"}</h2>
          <div className="space-y-4">
            {["All premium Sure Odds unlocked", "Unlimited prediction access", "No extra fees for premium codes"].map(text => <div className="flex items-center gap-3 text-sm" key={text}><Check className="w-4 h-4 text-bet-warning shrink-0" />{text}</div>)}
          </div>
          {active && <dl className="mt-6 pt-4 border-t border-border space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Activated</dt><dd>{date(subscription?.starts_at)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Expires</dt><dd>{date(subscription?.expires_at)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Latest purchase</dt><dd>{money(subscription?.price || 0)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Renewal</dt><dd>Manual · no automatic charge</dd></div></dl>}
        </section>

        <section className="py-6 border-b border-border">
          <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-3"><Wallet className="w-5 h-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Wallet balance</p><p className="text-lg font-bold">{money(balance)}</p></div></div><Button variant="ghost" size="icon" aria-label="Open wallet" onClick={() => navigate("/wallet")}><ArrowUpRight /></Button></div>
          {!pending && <><Button className="w-full h-12" disabled={busy} onClick={openPurchase}><RefreshCw className="w-4 h-4 mr-2" />{active ? "Renew VIP" : "Get VIP"} · {money(vipPrice)}</Button><p className="text-center text-xs text-muted-foreground mt-3">{active ? "Adds one month to your current expiry date." : "Paid securely from your wallet."}</p></>}
          {(active || pending) && <Button variant="ghost" className="w-full mt-3 text-muted-foreground" onClick={() => setAction("cancel")} disabled={busy}>Cancel membership</Button>}
        </section>

        <section className="py-6">
          <h2 className="flex items-center gap-2 font-bold mb-4"><Receipt className="w-4 h-4 text-bet-warning" /> Purchase history</h2>
          {history.length === 0 ? <p className="text-sm text-muted-foreground py-5">No VIP purchases yet.</p> : <div className="divide-y divide-border">{history.map(item => <div key={item.id} className="py-4 flex justify-between gap-4"><div className="min-w-0"><p className="font-bold text-sm">Monthly VIP membership</p><p className="text-xs text-muted-foreground mt-1">{date(item.created_at)} · {item.payment_reference?.startsWith("wallet") ? "Wallet" : "Payment"}</p><p className="text-xs text-muted-foreground mt-1">{date(item.starts_at)} — {date(item.expires_at)}</p></div><div className="text-right shrink-0"><p className="text-sm font-bold">{money(item.price)}</p><p className={`text-xs capitalize mt-1 ${item.status === "active" && new Date(item.expires_at || 0).getTime() > now ? "text-bet-success" : "text-muted-foreground"}`}>{item.status === "active" && new Date(item.expires_at || 0).getTime() <= now ? "expired" : item.status}</p></div></div>)}</div>}
        </section>
      </main>
      <Dialog open={action !== null} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-lg"><DialogHeader><DialogTitle>{action === "cancel" ? "Cancel your VIP membership?" : active ? "Renew your VIP membership" : "Join Sporty VIP Club"}</DialogTitle><DialogDescription>{action === "cancel" ? "Premium access ends immediately. Previous payments will not be refunded. You can subscribe again at any time." : `${money(vipPrice)} will be deducted from your wallet. ${active ? "One month will be added to your existing expiry date." : "Your premium access will start immediately for one month."}`}</DialogDescription></DialogHeader><Button onClick={submit} disabled={busy} variant={action === "cancel" ? "destructive" : "default"}>{busy ? "Processing…" : action === "cancel" ? "Confirm cancellation" : "Confirm payment"}</Button><Button variant="outline" disabled={busy} onClick={() => setAction(null)}>{action === "cancel" ? "Keep VIP" : "Not now"}</Button></DialogContent>
      </Dialog>
      <BottomNav />
    </div>
  );
};
export default VIPSubscription;
