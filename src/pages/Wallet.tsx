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

      // Restore in-flight virtual account session
      try {
        const saved = localStorage.getItem(`vdeposit:${userId}`);
        if (saved) {
          const s = JSON.parse(saved);
          if (s?.amount) setDepositAmount(s.amount);
          if (s?.depositId) setLastDepositId(s.depositId);
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

      const { error: insertError } = await supabase.from("deposit_requests").insert({
        user_id: user.id, amount, payment_method: "bank_transfer",
        screenshot_url: fileName, screenshot_path: fileName, status: "pending",
        screenshot_hash: hash,
      } as any);
      if (insertError) throw insertError;

      toast.success("Deposit submitted! Admin will review and credit your wallet.");
      setDepositOpen(false); setDepositAmount(""); setScreenshot(null);
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

      {/* Deposit Modal — Virtual Account Reveal */}
      <Dialog
        open={depositOpen}
        onOpenChange={(o) => {
          setDepositOpen(o);
          if (!o) {
            setDepositStage("amount");
            setRevealStep(0);
            setScreenshot(null);
            setDepositAmount("");
          }
        }}
      >
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md mx-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Secure Deposit
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {depositStage === "amount" && "Enter amount, then generate a secure virtual account."}
              {depositStage === "generating" && "Generating your one-time secure account..."}
              {depositStage === "revealed" && "Transfer the exact amount, then tap I have paid."}
              {depositStage === "upload" && "Upload proof of your transfer below."}
            </DialogDescription>
          </DialogHeader>

          {/* STAGE 1: amount */}
          {depositStage === "amount" && (
            <div className="space-y-5 mt-4 animate-fade-in">
              <div className="space-y-2">
                <Label className="text-foreground">Amount (₦)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₦100)"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-14 bg-secondary/50 border-border/50 rounded-xl text-lg font-bold"
                />
              </div>
              <Button
                disabled={!depositAmount || parseFloat(depositAmount) < 100}
                onClick={() => {
                  setDepositStage("generating");
                  setRevealStep(0);
                  // Staged reveal: 4 lines at 650ms intervals
                  [1, 2, 3, 4].forEach((step, i) => {
                    setTimeout(() => {
                      setRevealStep(step);
                      if (step === 4) setTimeout(() => setDepositStage("revealed"), 600);
                    }, (i + 1) * 700);
                  });
                }}
                className="w-full h-14 bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 text-primary-foreground rounded-xl font-bold text-base shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all hover:scale-[1.02] active:scale-95"
              >
                <Sparkles className="w-5 h-5" />
                Tap to Generate Virtual Secure Account
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                🔒 A unique, encrypted account number is generated for this transaction only.
              </p>
            </div>
          )}

          {/* STAGE 2 & 3: generating + revealed (same panel, animated) */}
          {(depositStage === "generating" || depositStage === "revealed") && (
            <div className="mt-4 space-y-4 animate-fade-in">
              <div className="relative bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/30 rounded-2xl p-5 overflow-hidden">
                {/* scanning beam during generation */}
                {depositStage === "generating" && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[slide-in-right_1.2s_ease-in-out_infinite]" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Virtual Secure Account</p>
                  <span className="flex items-center gap-1 text-[10px] text-cyber-neon-green">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-neon-green animate-pulse" /> ENCRYPTED
                  </span>
                </div>

                <div className="space-y-4">
                  {/* 1. Account name (user) */}
                  <RevealLine
                    visible={revealStep >= 1}
                    loading={depositStage === "generating" && revealStep < 1}
                    label="Account Name"
                    value={userName}
                  />
                  {/* 2. Amount */}
                  <RevealLine
                    visible={revealStep >= 2}
                    loading={depositStage === "generating" && revealStep < 2 && revealStep >= 1}
                    label="Amount to Pay"
                    value={`₦${parseFloat(depositAmount || "0").toLocaleString()}`}
                    highlight
                  />
                  {/* 3. Bank name */}
                  <RevealLine
                    visible={revealStep >= 3}
                    loading={depositStage === "generating" && revealStep < 3 && revealStep >= 2}
                    label="Bank Name"
                    value={bankDetails.bank_name || "—"}
                  />
                  {/* 4. Account number + name on account */}
                  <RevealLine
                    visible={revealStep >= 4}
                    loading={depositStage === "generating" && revealStep < 4 && revealStep >= 3}
                    label="Account Number"
                    value={bankDetails.account_number || "—"}
                    mono
                    copyable
                  />
                  {revealStep >= 4 && (
                    <div className="animate-fade-in pt-1 border-t border-border/40">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Name on Account</p>
                      <p className="text-foreground font-semibold">{bankDetails.account_name || "—"}</p>
                    </div>
                  )}
                </div>
              </div>

              {depositStage === "revealed" && (
                <div className="space-y-2 animate-fade-in">
                  <Button
                    onClick={() => setDepositStage("upload")}
                    className="w-full h-14 bg-bet-success hover:bg-bet-success/90 text-white rounded-xl font-bold text-base shadow-[0_0_25px_hsl(var(--bet-success)/0.35)] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <CheckCircle2 className="w-5 h-5" /> I Have Paid
                  </Button>
                  <button
                    onClick={() => { setDepositStage("amount"); setRevealStep(0); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Change amount
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STAGE 4: upload screenshot */}
          {depositStage === "upload" && (
            <div className="mt-4 space-y-5 animate-fade-in">
              <div className="bg-secondary/30 rounded-xl p-3 border border-border/30 text-center">
                <p className="text-xs text-muted-foreground">Confirming payment of</p>
                <p className="text-2xl font-black text-bet-success">₦{parseFloat(depositAmount || "0").toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Upload Payment Screenshot</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                  id="deposit-screenshot"
                />
                <label
                  htmlFor="deposit-screenshot"
                  className={`flex flex-col items-center justify-center gap-2 w-full py-8 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                    screenshot
                      ? "border-bet-success/60 bg-bet-success/5"
                      : "border-border hover:border-primary/50 hover:bg-primary/5"
                  }`}
                >
                  {screenshot ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-bet-success" />
                      <span className="text-sm text-foreground font-medium truncate max-w-[80%]">{screenshot.name}</span>
                      <span className="text-[10px] text-muted-foreground">Tap to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tap to upload proof</span>
                    </>
                  )}
                </label>
              </div>

              <Button
                onClick={handleDeposit}
                disabled={isSubmitting || !screenshot}
                className="w-full h-14 bg-gradient-to-r from-bet-success to-bet-success/80 hover:opacity-90 text-white rounded-xl font-bold"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                ) : (
                  <>Submit Deposit</>
                )}
              </Button>
              <button
                onClick={() => setDepositStage("revealed")}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to account details
              </button>
            </div>
          )}
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

      <BottomNav />
    </div>
  );
};

export default Wallet;