import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Shield,
  Sparkles,
  Copy,
  Upload,
  Loader2,
  Building2,
  CreditCard,
  Smartphone,
  MoreHorizontal,
  ShieldCheck,
  HelpCircle,
  X,
  Lock,
  ArrowRight,
  Landmark,
  Hash,
  QrCode,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { RevealLine } from "@/components/RevealLine";

const nigerianBanks = [
  "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
  "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
  "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank", "Kuda Bank",
  "OPay", "PalmPay", "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank",
  "Standard Chartered Bank", "Sterling Bank", "SunTrust Bank", "Titan Trust Bank",
  "Union Bank of Nigeria", "United Bank for Africa (UBA)", "Unity Bank",
  "VFD Microfinance Bank", "Wema Bank", "Zenith Bank",
];

const Wallet = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validInvites, setValidInvites] = useState(0);
  const [totalInvites, setTotalInvites] = useState(0);
  
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [bankDetails, setBankDetails] = useState({ bank_name: "", account_number: "", account_name: "" });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>("");
  const [branding, setBranding] = useState({
    deposit_title: "Secure Deposit",
    deposit_generate_cta: "Tap to Generate Virtual Secure Account",
    deposit_generating_text: "Generating your one-time secure account...",
    deposit_revealed_text: "Transfer the exact amount, then tap I have paid.",
    deposit_security_note: "🔒 A unique, encrypted account number is generated for this transaction only.",
    deposit_brand_tag: "Virtual Secure Account",
  });

  // Virtual account reveal flow: amount → generating → revealed → upload
  const [depositStage, setDepositStage] = useState<"amount" | "generating" | "revealed" | "upload">("amount");
  const [revealStep, setRevealStep] = useState(0); // 0..4 (which lines visible)
  const [lastDepositId, setLastDepositId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawBank, setWithdrawBank] = useState("");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/auth"); return; }
      setUser(session.user);
      await loadData(session.user.id);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) navigate("/auth");
    });
    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Live deposit status: listen for admin approval/decline + wallet credit
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`wallet-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposit_requests", filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          const row = payload.new;
          setDeposits((prev) => prev.map((d) => (d.id === row.id ? { ...d, ...row } : d)));
          if (lastDepositId && row.id === lastDepositId) {
            setLiveStatus(row.status);
            if (row.status === "approved") {
              toast.success(`Deposit approved! ₦${row.amount} credited.`);
              localStorage.removeItem(`vdeposit:${user.id}`);
              setLastDepositId(null);
              loadData(user.id);
            } else if (row.status === "declined") {
              toast.error("Deposit was declined. Please contact support.");
              localStorage.removeItem(`vdeposit:${user.id}`);
              setLastDepositId(null);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        (payload: any) => setWallet(payload.new)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, lastDepositId]);

  const loadData = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: walletData } = await supabase.from("wallets").select("*").eq("user_id", userId).single();
      setWallet(walletData);

      const brandingKeys = [
        "bank_name", "account_number", "account_name",
        "deposit_title", "deposit_generate_cta", "deposit_generating_text",
        "deposit_revealed_text", "deposit_security_note", "deposit_brand_tag",
      ];
      const { data: bankData } = await supabase.from("app_settings").select("setting_key, setting_value").in("setting_key", brandingKeys);
      const details: any = {};
      const brand: any = { ...branding };
      bankData?.forEach(d => {
        if (["bank_name", "account_number", "account_name"].includes(d.setting_key)) {
          details[d.setting_key] = d.setting_value;
        } else if (d.setting_key in brand) {
          brand[d.setting_key] = d.setting_value;
        }
      });
      setBankDetails(details);
      setBranding(brand);

      // Pool of receiving accounts (rotates per deposit)
      const { data: accountsData } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      setBankAccounts(accountsData || []);

      // Restore in-flight virtual account session
      try {
        const saved = localStorage.getItem(`vdeposit:${userId}`);
        if (saved) {
          const s = JSON.parse(saved);
          if (s?.amount) setDepositAmount(s.amount);
          if (s?.depositId) setLastDepositId(s.depositId);
          if (s?.account?.account_number) setBankDetails(s.account);
        }
      } catch {}


      const { data: profileData } = await supabase.from("profiles").select("display_name, username").eq("id", userId).maybeSingle();
      setUserName(profileData?.display_name || profileData?.username || "Account Holder");

      const { data: depositData } = await supabase.from("deposit_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      setDeposits(depositData || []);

      const { data: withdrawalData } = await supabase.from("withdrawal_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
      setWithdrawals(withdrawalData || []);

      // Check referral invites
      const { data: referrals } = await supabase.from("referrals").select("referred_id, status").eq("referrer_id", userId);
      if (referrals && referrals.length > 0) {
        setTotalInvites(referrals.length);
        const completedRefs = referrals.filter(r => r.status === 'completed');
        setValidInvites(completedRefs.length);
      } else {
        setTotalInvites(0);
        setValidInvites(0);
      }
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user || !depositAmount) { toast.error("Please enter an amount"); return; }
    if (!screenshot) { toast.error("Please upload payment screenshot"); return; }
    const amount = parseFloat(depositAmount);
    if (amount < 100) { toast.error("Minimum deposit is ₦100"); return; }

    // Anti-fraud: file type whitelist
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!ALLOWED.includes(screenshot.type)) {
      toast.error("Only JPG, PNG, WEBP allowed");
      return;
    }
    // Anti-fraud: size limit 5MB
    if (screenshot.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Anti-fraud: SHA-256 hash for duplicate detection
      const buf = await screenshot.arrayBuffer();
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: dup } = await supabase
        .from("deposit_requests")
        .select("id")
        .eq("screenshot_hash", hash)
        .limit(1)
        .maybeSingle();
      if (dup) {
        toast.error("This screenshot was already submitted. Upload a fresh proof.");
        setIsSubmitting(false);
        return;
      }

      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/deposit-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("payment-screenshots").upload(fileName, screenshot);
      if (uploadError) throw uploadError;

      const { data: inserted, error: insertError } = await supabase.from("deposit_requests").insert({
        user_id: user.id, amount, payment_method: "bank_transfer",
        screenshot_url: fileName, screenshot_path: fileName, status: "pending",
        screenshot_hash: hash,
      } as any).select("id").single();
      if (insertError) throw insertError;

      setLastDepositId(inserted?.id || null);
      setLiveStatus("pending");
      try {
        localStorage.setItem(`vdeposit:${user.id}`, JSON.stringify({
          amount: depositAmount, depositId: inserted?.id, createdAt: Date.now(), account: bankDetails,
        }));
        // Rotate to a different account for the next deposit
        const prev = parseInt(localStorage.getItem(`vbankidx:${user.id}`) || "", 10);
        const base = Number.isFinite(prev) ? prev : deposits.length;
        localStorage.setItem(`vbankidx:${user.id}`, String(base + 1));
      } catch {}


      toast.success("Deposit submitted! Watching for confirmation...");
      setDepositOpen(false); setDepositAmount(""); setScreenshot(null);
      setDepositStage("amount"); setRevealStep(0);
      loadData(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit deposit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !withdrawBank || !withdrawAccountName || !withdrawAccountNumber) {
      toast.error("Please fill all bank details"); return;
    }
    if (validInvites < 3) {
      toast.error(`You need ${3 - validInvites} more valid invites (who have deposited) before withdrawing`); return;
    }
    const amount = parseFloat(withdrawAmount);
    if (amount > (wallet?.balance || 0)) { toast.error("Insufficient balance"); return; }
    if (amount < 500) { toast.error("Minimum withdrawal is ₦500"); return; }

    setIsSubmitting(true);
    try {
      const accountDetails = JSON.stringify({ bank: withdrawBank, account_name: withdrawAccountName, account_number: withdrawAccountNumber });
      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: user.id, amount, payment_method: withdrawBank, account_details: accountDetails, status: "pending"
      });
      if (error) throw error;

      toast.success("Withdrawal request submitted! Processing within 24 hours.");
      setWithdrawOpen(false); setWithdrawAmount(""); setWithdrawBank(""); setWithdrawAccountName(""); setWithdrawAccountNumber("");
      loadData(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle2 className="w-4 h-4 text-bet-success" />;
      case "declined": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-bet-warning" />;
    }
  };

  const parseAccountDetails = (details: string) => {
    try { return JSON.parse(details); } catch { return { bank: details, account_name: "", account_number: "" }; }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">My Wallet</h1>
            <p className="text-xs text-muted-foreground">Manage your funds</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-3xl blur opacity-20" />
          <div className="relative bg-gradient-to-br from-card to-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <WalletIcon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-4xl font-black text-foreground">₦{wallet?.balance?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button onClick={() => setDepositOpen(true)} className="h-14 bg-gradient-to-r from-bet-success to-bet-success/80 hover:from-bet-success/90 hover:to-bet-success/70 text-white font-bold rounded-xl">
                <ArrowDownLeft className="w-5 h-5 mr-2" /> Deposit
              </Button>
              <Button onClick={() => setWithdrawOpen(true)} className="h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold rounded-xl">
                <ArrowUpRight className="w-5 h-5 mr-2" /> Withdraw
              </Button>
            </div>
          </div>
        </div>

        {/* Live Deposit Status Tracker */}
        {lastDepositId && liveStatus && liveStatus !== "approved" && (
          <div className={`mb-6 rounded-xl border p-4 animate-fade-in ${
            liveStatus === "declined"
              ? "bg-destructive/10 border-destructive/40"
              : "bg-bet-warning/10 border-bet-warning/40"
          }`}>
            <div className="flex items-center gap-3">
              {liveStatus === "declined" ? (
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              ) : (
                <div className="relative flex-shrink-0">
                  <Loader2 className="w-5 h-5 text-bet-warning animate-spin" />
                  <span className="absolute inset-0 rounded-full bg-bet-warning/40 animate-ping" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground capitalize">
                  Deposit {liveStatus === "pending" ? "awaiting confirmation" : liveStatus}
                </p>
                <p className="text-xs text-muted-foreground">
                  {liveStatus === "declined"
                    ? "Your deposit was declined. Contact support."
                    : "Live tracking — we'll credit your wallet automatically once verified."}
                </p>
              </div>
              {liveStatus === "declined" && (
                <button
                  onClick={() => { setLastDepositId(null); setLiveStatus(null); localStorage.removeItem(`vdeposit:${user.id}`); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >Dismiss</button>
              )}
            </div>
          </div>
        )}

        {/* Invitation Progress */}
        <div className="mb-6 bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-foreground">Invite Progress</p>
            <span className="text-xs text-muted-foreground">{Math.min(validInvites, 3)}/3 valid</span>
          </div>
          <Progress value={(Math.min(validInvites, 3) / 3) * 100} className="h-2.5 mb-2" />
          <p className="text-xs text-muted-foreground">
            {validInvites >= 3
              ? "✅ You're eligible to withdraw!"
              : `Invite ${3 - validInvites} more people who deposit to unlock withdrawals. Total invited: ${totalInvites}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4">
            <p className="text-sm text-muted-foreground">Total Deposited</p>
            <p className="text-2xl font-black text-bet-success">₦{wallet?.total_deposited?.toFixed(2) || "0.00"}</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4">
            <p className="text-sm text-muted-foreground">Total Withdrawn</p>
            <p className="text-2xl font-black text-primary">₦{wallet?.total_withdrawn?.toFixed(2) || "0.00"}</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Recent Deposits</h3>
            {deposits.length === 0 ? (
              <div className="bg-card/40 rounded-xl border border-border/30 p-6 text-center">
                <p className="text-muted-foreground">No deposits yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deposits.map((deposit) => (
                  <div key={deposit.id} className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-bet-success/10 flex items-center justify-center">
                        <ArrowDownLeft className="w-5 h-5 text-bet-success" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">+₦{deposit.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{deposit.payment_method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deposit.status)}
                      <span className={`text-xs font-medium capitalize ${deposit.status === "approved" ? "text-bet-success" : deposit.status === "declined" ? "text-destructive" : "text-bet-warning"}`}>
                        {deposit.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Recent Withdrawals</h3>
            {withdrawals.length === 0 ? (
              <div className="bg-card/40 rounded-xl border border-border/30 p-6 text-center">
                <p className="text-muted-foreground">No withdrawals yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => {
                  const details = parseAccountDetails(withdrawal.account_details);
                  return (
                    <div key={withdrawal.id} className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">-₦{withdrawal.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{details.bank || withdrawal.payment_method}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(withdrawal.status)}
                        <span className={`text-xs font-medium capitalize ${withdrawal.status === "approved" ? "text-bet-success" : withdrawal.status === "declined" ? "text-destructive" : "text-bet-warning"}`}>
                          {withdrawal.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Deposit Modal — Full-screen Sectioned Layout */}
      <Dialog
        open={depositOpen}
        onOpenChange={(o) => {
          setDepositOpen(o);
          if (!o) {
            setScreenshot(null);
            if (depositStage === "generating") setDepositStage("amount");
          }
        }}
      >
        <DialogContent
          className="bg-background border-0 sm:border sm:border-border/50 sm:rounded-2xl p-0 w-screen h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100vw-1.5rem)] sm:max-w-[480px] overflow-hidden flex flex-col [&>button]:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{branding.deposit_title}</DialogTitle>
            <DialogDescription>Deposit funds via virtual secure account</DialogDescription>
          </DialogHeader>

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setDepositOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-secondary/60 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyber-neon-purple flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.5)]">
                <WalletIcon className="w-5 h-5 text-primary-foreground" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyber-neon-green border-2 border-background animate-pulse" />
              </div>
              <div className="leading-tight">
                <h2 className="text-base font-black text-foreground tracking-tight">Deposit Funds</h2>
                <p className="text-[10px] text-muted-foreground font-semibold">SPORTY CODES • Wallet</p>
              </div>
            </div>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden xs:inline">How it works</span>
            </button>
          </div>


          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
            {/* Current Balance Card */}
            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-primary/25 via-primary/10 to-cyber-neon-purple/15 border border-primary/30 overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute -right-4 -bottom-8 w-28 h-28 rounded-full bg-cyber-neon-purple/20 blur-3xl" />
              <div className="relative">
                <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                <p className="text-3xl font-black text-foreground tracking-tight">
                  ₦{wallet?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2">All deposits are in Nigerian Naira (NGN)</p>
              </div>
            </div>

            {/* New Deposit Card */}
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-foreground">New Deposit</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-cyber-neon-green">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secure & Encrypted
                </span>
              </div>

              {/* STEP 1: Payment Method */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center">1</span>
                    <p className="text-sm font-bold text-foreground">Select Payment Method</p>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-cyber-neon-green/15 text-cyber-neon-green font-bold uppercase tracking-wider">Recommended</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "bank_transfer", label: "Bank Transfer", Icon: Landmark, enabled: true, tint: "from-emerald-500/20 to-emerald-600/5", iconColor: "text-emerald-400" },
                    { id: "ussd", label: "USSD", Icon: Hash, enabled: false, tint: "from-sky-500/20 to-sky-600/5", iconColor: "text-sky-400" },
                    { id: "card", label: "Card", Icon: CreditCard, enabled: false, tint: "from-violet-500/20 to-violet-600/5", iconColor: "text-violet-400" },
                    { id: "fintech", label: "Opay/PalmPay", Icon: WalletIcon, enabled: false, tint: "from-amber-500/20 to-amber-600/5", iconColor: "text-amber-400" },
                    { id: "qr", label: "QR Pay", Icon: QrCode, enabled: false, tint: "from-pink-500/20 to-pink-600/5", iconColor: "text-pink-400" },
                    { id: "other", label: "Other", Icon: MoreHorizontal, enabled: false, tint: "from-slate-500/20 to-slate-600/5", iconColor: "text-slate-300" },
                  ].map(({ id, label, Icon, enabled, tint, iconColor }) => {
                    const active = paymentMethod === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={!enabled}
                        onClick={() => enabled && setPaymentMethod(id)}
                        className={`relative aspect-square rounded-xl border p-2 flex flex-col items-center justify-center gap-1.5 transition-all ${
                          active
                            ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                            : "border-border/60 bg-secondary/30 hover:border-border"
                        } ${!enabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
                      >
                        {active && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
                          </span>
                        )}
                        <span className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tint} flex items-center justify-center ring-1 ring-white/5`}>
                          <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2.2} />
                        </span>
                        <span className={`text-[9px] font-semibold leading-tight text-center ${active ? "text-foreground" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>


              {/* STEP 2: Enter Amount */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[11px] font-black flex items-center justify-center">2</span>
                  <p className="text-sm font-bold text-foreground">Enter Amount</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center border-r border-border/50 bg-secondary/40 rounded-l-xl">
                    <span className="text-base font-bold text-muted-foreground">₦</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={depositAmount}
                    onChange={(e) => {
                      setDepositAmount(e.target.value);
                      if (user?.id) {
                        try { localStorage.setItem(`vdeposit:${user.id}`, JSON.stringify({ amount: e.target.value, createdAt: Date.now() })); } catch {}
                      }
                    }}
                    className="h-12 pl-14 pr-10 bg-secondary/30 border-border/50 rounded-xl text-lg font-black"
                  />
                  {depositAmount && (
                    <button
                      onClick={() => setDepositAmount("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center"
                      aria-label="Clear"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-2.5">
                  {[1000, 5000, 10000, 50000, 100000].map((amt) => {
                    const active = depositAmount === String(amt);
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDepositAmount(String(amt))}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95 ${
                          active
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border"
                        }`}
                      >
                        ₦{amt >= 1000 ? `${amt / 1000}K` : amt}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Min: ₦100 &nbsp;|&nbsp; Max: ₦10,000,000</p>
              </div>

              {/* INLINE: Virtual Account Generation (after amount entered) */}
              {depositAmount && parseFloat(depositAmount) >= 100 && (
                <div className="animate-fade-in">
                  {depositStage === "amount" && (
                    <Button
                      onClick={() => {
                        if (bankAccounts.length > 0) {
                          let idx = 0;
                          try {
                            const stored = parseInt(localStorage.getItem(`vbankidx:${user?.id}`) || "", 10);
                            idx = Number.isFinite(stored) ? stored : deposits.length;
                          } catch { idx = deposits.length; }
                          const acct = bankAccounts[Math.abs(idx) % bankAccounts.length];
                          setBankDetails({
                            bank_name: acct.bank_name,
                            account_number: acct.account_number,
                            account_name: acct.account_name,
                          });
                        }
                        setDepositStage("generating");
                        setRevealStep(0);

                        [1, 2, 3, 4].forEach((step, i) => {
                          setTimeout(() => {
                            setRevealStep(step);
                            if (step === 4) setTimeout(() => setDepositStage("revealed"), 600);
                          }, (i + 1) * 700);
                        });
                      }}
                      className="w-full h-11 bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 text-primary-foreground rounded-xl font-bold text-xs shadow-[0_0_25px_hsl(var(--primary)/0.4)] active:scale-[0.98] whitespace-normal leading-tight px-3"
                    >
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>{branding.deposit_generate_cta}</span>
                    </Button>
                  )}

                  {(depositStage === "generating" || depositStage === "revealed" || depositStage === "upload") && (
                    <div className="relative bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/30 rounded-2xl p-4 overflow-hidden">
                      {depositStage === "generating" && (
                        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[slide-in-right_1.2s_ease-in-out_infinite]" />
                      )}
                      <div className="flex items-center justify-between mb-3 gap-2">
                        <p className="text-[9px] uppercase tracking-widest text-primary font-bold truncate">{branding.deposit_brand_tag}</p>
                        <span className="flex items-center gap-1 text-[9px] text-cyber-neon-green flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyber-neon-green animate-pulse" /> ENCRYPTED
                        </span>
                      </div>
                      <div className="space-y-3">
                        <RevealLine visible={revealStep >= 1} loading={depositStage === "generating" && revealStep < 1} label="Account Name" value={userName} />
                        <RevealLine visible={revealStep >= 2} loading={depositStage === "generating" && revealStep < 2 && revealStep >= 1} label="Amount to Pay" value={`₦${parseFloat(depositAmount || "0").toLocaleString()}`} highlight />
                        <RevealLine visible={revealStep >= 3} loading={depositStage === "generating" && revealStep < 3 && revealStep >= 2} label="Bank Name" value={bankDetails.bank_name || "—"} />
                        <RevealLine visible={revealStep >= 4} loading={depositStage === "generating" && revealStep < 4 && revealStep >= 3} label="Account Number" value={bankDetails.account_number || "—"} mono copyable />
                        {revealStep >= 4 && (
                          <div className="animate-fade-in pt-1 border-t border-border/40">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Name on Account</p>
                            <p className="text-foreground font-semibold text-sm break-words">{bankDetails.account_name || "—"}</p>
                          </div>
                        )}
                      </div>
                      {depositStage === "revealed" && (
                        <button
                          onClick={() => setDepositStage("upload")}
                          className="mt-4 w-full h-10 bg-bet-success hover:bg-bet-success/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                          <CheckCircle2 className="w-4 h-4" /> I Have Paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Upload Payment Screenshot */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center ${depositStage === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>3</span>
                  <p className="text-sm font-bold text-foreground">Upload Payment Screenshot</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                  id="deposit-screenshot"
                />
                <label
                  htmlFor="deposit-screenshot"
                  className={`flex flex-col items-center justify-center gap-2 w-full py-7 border-2 border-dashed rounded-xl cursor-pointer transition-all active:scale-[0.99] ${
                    screenshot
                      ? "border-bet-success/60 bg-bet-success/5"
                      : "border-primary/40 hover:border-primary bg-primary/[0.03]"
                  }`}
                >
                  {screenshot ? (
                    <>
                      <CheckCircle2 className="w-7 h-7 text-bet-success" />
                      <span className="text-xs text-foreground font-semibold truncate max-w-[85%]">{screenshot.name}</span>
                      <span className="text-[10px] text-muted-foreground">Tap to change</span>
                    </>
                  ) : (
                    <>
                      <div className="w-11 h-11 rounded-full border-2 border-primary/40 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm text-foreground font-semibold">Drag & drop or tap to upload</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG or JPEG (Max 5MB)</span>
                    </>
                  )}
                </label>
              </div>

              {/* Important Note */}
              <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary mb-0.5">Important</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Please ensure the screenshot shows the transaction reference and amount clearly.
                  </p>
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleDeposit}
                disabled={isSubmitting || !screenshot || !depositAmount || parseFloat(depositAmount) < 100}
                className="w-full h-12 bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 text-primary-foreground rounded-xl font-bold text-sm shadow-[0_0_30px_hsl(var(--primary)/0.35)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit Deposit Request <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 pt-1">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground text-center leading-tight">
                  Your deposits are safe with us. We never store your banking details.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* Withdraw Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Withdraw Funds</DialogTitle>
            <DialogDescription className="text-muted-foreground">Enter your bank details to receive payment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-foreground">Amount (₦)</Label>
              <Input type="number" placeholder="Minimum ₦500" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
              <p className="text-xs text-muted-foreground">Available: ₦{wallet?.balance?.toFixed(2) || "0.00"}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Select Bank</Label>
              <Select value={withdrawBank} onValueChange={setWithdrawBank}>
                <SelectTrigger className="h-12 bg-secondary/50 border-border/50 rounded-xl"><SelectValue placeholder="Choose your bank" /></SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {nigerianBanks.map((bank) => (<SelectItem key={bank} value={bank}>{bank}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Account Name</Label>
              <Input placeholder="Enter account name" value={withdrawAccountName} onChange={(e) => setWithdrawAccountName(e.target.value)} className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Account Number</Label>
              <Input type="number" placeholder="10-digit account number" value={withdrawAccountNumber} onChange={(e) => setWithdrawAccountNumber(e.target.value)} maxLength={10} className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
            </div>
            <Button onClick={handleWithdraw} disabled={isSubmitting} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
              {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Requirements — only revealed when a depositor attempts a withdrawal */}
      <Dialog open={reqOpen} onOpenChange={setReqOpen}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Unlock Withdrawals</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              One last step before you can cash out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-secondary/40 rounded-xl p-4 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-foreground">Valid invites</p>
                <span className="text-xs text-muted-foreground">{Math.min(validInvites, 3)}/3</span>
              </div>
              <Progress value={(Math.min(validInvites, 3) / 3) * 100} className="h-2.5 mb-2" />
              <p className="text-xs text-muted-foreground">
                Invite {Math.max(0, 3 - validInvites)} more {3 - validInvites === 1 ? "person" : "people"} who deposit to unlock withdrawals. Total invited: {totalInvites}
              </p>
            </div>
            <Button
              onClick={() => { setReqOpen(false); navigate("/profile"); }}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              Get my invite link
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      <BottomNav />
    </div>
  );
};

export default Wallet;