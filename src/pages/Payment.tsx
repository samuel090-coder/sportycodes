import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stake, payout, prediction, homeTeam, awayTeam, matchCount, price, id, type } = location.state || {};

  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const paymentAmount = price || 0;

  useEffect(() => {
    checkAuthAndLoadWallet();
  }, []);

  const checkAuthAndLoadWallet = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth", { state: { returnTo: location.pathname, returnState: location.state } });
      return;
    }
    setUser(session.user);

    // Load wallet balance
    const { data: walletData } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    setWallet(walletData);
    setIsLoading(false);
  };

  const handlePayWithWallet = async () => {
    if (!user || !wallet) {
      toast.error("Please login to continue");
      return;
    }

    if (wallet.balance < paymentAmount) {
      toast.error("Insufficient wallet balance. Please deposit funds first.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Deduct from wallet
      const newBalance = wallet.balance - paymentAmount;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Create payment record (auto-approved since wallet payment)
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_email: user.email,
          sure_odd_id: id || 'wallet-payment',
          amount: paymentAmount,
          status: 'approved',
          item_type: type || 'sure-odd',
          item_id: id || null
        });

      if (paymentError) throw paymentError;

      // Store user email in localStorage for access control
      localStorage.setItem('user_payment_email', user.email);

      setIsSuccess(true);
      toast.success("Payment successful! Access granted.");
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center p-4">
        <Card className="bg-gradient-card border-bet-border p-8 max-w-md w-full text-center animate-fade-in">
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-bet-success mx-auto mb-4" />
            <h2 className="text-2xl font-black text-foreground mb-3">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your wallet has been charged ₦{paymentAmount.toLocaleString()}. You now have access to the content.
            </p>
          </div>

          <Button
            onClick={() => navigate(-1)}
            className="w-full bg-gradient-primary hover:opacity-90 transition-all"
          >
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const insufficientBalance = wallet && wallet.balance < paymentAmount;

  return (
    <div className="min-h-screen bg-bet-dark pb-8">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-primary-foreground">Payment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Order Summary</h2>
          <div className="space-y-3">
            {matchCount && matchCount > 1 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Item</span>
                <span className="font-bold text-foreground">
                  {matchCount} SURE ODDS
                </span>
              </div>
            ) : (
              homeTeam && awayTeam && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Match</span>
                  <span className="font-bold text-foreground">
                    {homeTeam} vs {awayTeam}
                  </span>
                </div>
              )
            )}
            {prediction && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prediction</span>
                <span className="font-bold text-primary">{prediction}</span>
              </div>
            )}
            {stake && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stake</span>
                <span className="font-bold text-foreground">₦{stake}</span>
              </div>
            )}
            {payout && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="font-bold text-foreground">₦{payout}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-bet-border">
              <span className="text-muted-foreground">Amount to Pay</span>
              <span className="text-2xl font-black text-primary">₦{paymentAmount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Wallet Payment Card */}
        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Pay with Wallet
          </h2>
          
          <div className="bg-secondary rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your Balance</span>
              <span className={`text-xl font-black ${insufficientBalance ? 'text-destructive' : 'text-bet-success'}`}>
                ₦{wallet?.balance?.toLocaleString() || '0'}
              </span>
            </div>
          </div>

          {insufficientBalance && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-destructive font-medium">Insufficient Balance</p>
                <p className="text-sm text-muted-foreground">
                  You need ₦{(paymentAmount - (wallet?.balance || 0)).toLocaleString()} more. Please deposit funds to your wallet.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handlePayWithWallet}
              disabled={isSubmitting || insufficientBalance}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold text-lg py-6 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : `Pay ₦${paymentAmount.toLocaleString()}`}
            </Button>

            {insufficientBalance && (
              <Button
                onClick={() => navigate("/wallet")}
                variant="outline"
                className="w-full border-bet-border"
              >
                Go to Wallet to Deposit
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Payment;
