import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  ChevronLeft,
  Building2,
  CreditCard,
  Smartphone
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Wallet = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Deposit Modal State
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Withdraw Modal State
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("");
  const [accountDetails, setAccountDetails] = useState("");

  // Bank account details for deposits
  const [bankDetails, setBankDetails] = useState({
    bank_name: "",
    account_name: "",
    account_number: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadData(session.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      }
    });

    checkAuth();
    loadBankDetails();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadBankDetails = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["bank_name", "account_name", "account_number"]);

      if (data) {
        const details: any = {};
        data.forEach(item => {
          details[item.setting_key] = item.setting_value;
        });
        setBankDetails(details);
      }
    } catch (error) {
      console.error("Error loading bank details:", error);
    }
  };

  const loadData = async (userId: string) => {
    setIsLoading(true);
    try {
      // Load wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      setWallet(walletData);

      // Load deposits
      const { data: depositData } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setDeposits(depositData || []);

      // Load withdrawals
      const { data: withdrawalData } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      setWithdrawals(withdrawalData || []);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user || !depositAmount || !paymentMethod || !screenshot) {
      toast.error("Please fill all fields and upload a screenshot");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload screenshot
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment_screenshots")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment_screenshots")
        .getPublicUrl(fileName);

      // Create deposit request
      const { error: insertError } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount: parseFloat(depositAmount),
          payment_method: paymentMethod,
          screenshot_url: publicUrl,
          status: "pending"
        });

      if (insertError) throw insertError;

      toast.success("Deposit request submitted! Awaiting admin approval.");
      setDepositOpen(false);
      setDepositAmount("");
      setPaymentMethod("");
      setScreenshot(null);
      loadData(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit deposit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !withdrawAmount || !withdrawMethod || !accountDetails) {
      toast.error("Please fill all fields");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > (wallet?.balance || 0)) {
      toast.error("Insufficient balance");
      return;
    }

    if (amount < 500) {
      toast.error("Minimum withdrawal is ₦500");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create withdrawal request
      const { error } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount,
          payment_method: withdrawMethod,
          account_details: accountDetails,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Withdrawal request submitted! Processing within 24 hours.");
      setWithdrawOpen(false);
      setWithdrawAmount("");
      setWithdrawMethod("");
      setAccountDetails("");
      loadData(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: "bank_transfer", name: "Bank Transfer", icon: Building2 },
    { id: "opay", name: "OPay", icon: Smartphone },
    { id: "palmpay", name: "PalmPay", icon: CreditCard },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="w-4 h-4 text-bet-success" />;
      case "declined":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-bet-warning" />;
    }
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
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard")}
            className="rounded-xl"
          >
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

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button
                onClick={() => setDepositOpen(true)}
                className="h-14 bg-gradient-to-r from-bet-success to-bet-success/80 hover:from-bet-success/90 hover:to-bet-success/70 text-white font-bold rounded-xl"
              >
                <ArrowDownLeft className="w-5 h-5 mr-2" />
                Deposit
              </Button>
              <Button
                onClick={() => setWithdrawOpen(true)}
                className="h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold rounded-xl"
              >
                <ArrowUpRight className="w-5 h-5 mr-2" />
                Withdraw
              </Button>
            </div>
          </div>
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
          {/* Deposits */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Recent Deposits</h3>
            {deposits.length === 0 ? (
              <div className="bg-card/40 rounded-xl border border-border/30 p-6 text-center">
                <p className="text-muted-foreground">No deposits yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 flex items-center justify-between"
                  >
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
                      <span className={`text-xs font-medium capitalize ${
                        deposit.status === "approved" ? "text-bet-success" :
                        deposit.status === "declined" ? "text-destructive" : "text-bet-warning"
                      }`}>
                        {deposit.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawals */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-3">Recent Withdrawals</h3>
            {withdrawals.length === 0 ? (
              <div className="bg-card/40 rounded-xl border border-border/30 p-6 text-center">
                <p className="text-muted-foreground">No withdrawals yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ArrowUpRight className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">-₦{withdrawal.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.payment_method}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(withdrawal.status)}
                      <span className={`text-xs font-medium capitalize ${
                        withdrawal.status === "approved" ? "text-bet-success" :
                        withdrawal.status === "declined" ? "text-destructive" : "text-bet-warning"
                      }`}>
                        {withdrawal.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Deposit Modal */}
      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Deposit Funds</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Transfer to our account and upload proof of payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Bank Details */}
            <div className="bg-secondary/50 rounded-xl p-4 border border-border/30">
              <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Bank Account Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="font-bold text-foreground">{bankDetails.bank_name || "Not Set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Name:</span>
                  <span className="font-bold text-foreground">{bankDetails.account_name || "Not Set"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-bold text-foreground">{bankDetails.account_number || "Not Set"}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-foreground">Amount (₦)</Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-foreground">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`p-3 rounded-xl border transition-all text-center ${
                      paymentMethod === method.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <method.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label className="text-foreground">Payment Screenshot</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className={`flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                    screenshot
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">
                    {screenshot ? screenshot.name : "Upload Screenshot"}
                  </span>
                </label>
              </div>
            </div>

            <Button
              onClick={handleDeposit}
              disabled={isSubmitting || !depositAmount || !paymentMethod || !screenshot}
              className="w-full h-14 bg-gradient-to-r from-bet-success to-bet-success/80 text-white font-bold rounded-xl"
            >
              {isSubmitting ? "Submitting..." : "Submit Deposit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="bg-card border-border/50 rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Withdraw Funds</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter your account details for withdrawal (Min: ₦500)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-foreground">Amount (₦)</Label>
              <Input
                type="number"
                placeholder="Minimum ₦500"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="h-12 bg-secondary/50 border-border/50 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Available: ₦{wallet?.balance?.toFixed(2) || "0.00"}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-foreground">Withdraw To</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setWithdrawMethod(method.id)}
                    className={`p-3 rounded-xl border transition-all text-center ${
                      withdrawMethod === method.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <method.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-2">
              <Label className="text-foreground">Account Details</Label>
              <textarea
                placeholder="Enter your bank name, account number and account name"
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                className="w-full h-24 p-3 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={isSubmitting || !withdrawAmount || !withdrawMethod || !accountDetails}
              className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold rounded-xl"
            >
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
