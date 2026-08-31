import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Crown, 
  ChevronLeft, 
  Star, 
  Zap, 
  Shield, 
  Sparkles,
  Wallet,
  AlertCircle
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { promptDeposit } from "@/lib/insufficientFunds";

const VIPSubscription = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [vipPrice, setVipPrice] = useState(2000);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    loadData(session.user.id);
  };

  const loadData = async (userId: string) => {
    setIsLoading(true);
    try {
      // Load VIP price
      const { data: priceData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "vip_monthly_price")
        .maybeSingle();
      
      if (priceData?.setting_value) {
        setVipPrice(parseFloat(priceData.setting_value));
      }

      // Load wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      setWallet(walletData);

      // Check current subscription
      const { data: subData } = await supabase
        .from("vip_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        setCurrentSubscription(subData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !wallet) {
      toast.error("Please login to continue");
      return;
    }

    if (wallet.balance < vipPrice) {
      promptDeposit();
      return;
    }

    setIsSubmitting(true);
    try {
      // Deduct from wallet
      const newBalance = wallet.balance - vipPrice;
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Calculate expiry (1 month from now)
      const startsAt = new Date();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      // Create subscription (auto-approved since wallet payment)
      const { error } = await supabase.from("vip_subscriptions").insert({
        user_id: user.id,
        price: vipPrice,
        payment_reference: "wallet_payment",
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString()
      });

      if (error) throw error;

      toast.success("VIP subscription activated! Enjoy unlimited access.");
      setWallet({ ...wallet, balance: newBalance });
      loadData(user.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVipActive = currentSubscription?.status === "active" && 
    new Date(currentSubscription.expires_at) > new Date();

  const insufficientBalance = wallet && wallet.balance < vipPrice;

  const features = [
    { icon: Star, text: "Unlimited access to ALL Sure Odds" },
    { icon: Zap, text: "No ads or waiting periods" },
    { icon: Shield, text: "Priority customer support" },
    { icon: Sparkles, text: "Exclusive VIP predictions" },
  ];

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
      <header className="sticky top-0 z-30 bg-gradient-to-r from-bet-warning/10 via-primary/10 to-cyber-neon-purple/10 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-foreground flex items-center gap-2">
                <Crown className="w-6 h-6 text-bet-warning" />
                VIP MEMBERSHIP
              </h1>
              <p className="text-xs text-muted-foreground">Unlock Premium Features</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* VIP Status Card */}
        {isVipActive && (
          <Card className="relative overflow-hidden bg-gradient-to-r from-bet-warning via-primary to-cyber-neon-purple p-6">
            <div className="absolute inset-0 bg-gradient-to-r from-bet-warning/20 to-transparent animate-pulse" />
            <div className="relative text-center">
              <Crown className="w-16 h-16 text-white mx-auto mb-3" />
              <h2 className="text-2xl font-black text-white mb-2">VIP ACTIVE</h2>
              <p className="text-white/80">
                Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
              </p>
            </div>
          </Card>
        )}

        {/* Pending Status */}
        {currentSubscription?.status === "pending" && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 p-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold text-yellow-500 mb-2">Subscription Pending</h2>
              <p className="text-muted-foreground text-sm">
                Your VIP subscription is awaiting admin approval
              </p>
            </div>
          </Card>
        )}

        {/* Pricing Card */}
        {!isVipActive && currentSubscription?.status !== "pending" && (
          <>
            <Card className="relative overflow-hidden bg-gradient-to-br from-card to-secondary/30 border-primary/30 p-6">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-bet-warning text-black text-xs font-bold">
                  BEST VALUE
                </span>
              </div>
              
              <div className="text-center mb-6">
                <Crown className="w-12 h-12 text-bet-warning mx-auto mb-3" />
                <h2 className="text-2xl font-black text-foreground">VIP Membership</h2>
                <div className="mt-4">
                  <span className="text-4xl font-black text-primary">₦{vipPrice.toLocaleString()}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{feature.text}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Wallet Payment Section */}
            <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Pay with Wallet
              </h3>

              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
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
                      You need ₦{(vipPrice - (wallet?.balance || 0)).toLocaleString()} more. Please deposit funds to your wallet.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubmitting || insufficientBalance}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-bet-warning disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : `Subscribe for ₦${vipPrice.toLocaleString()}`}
                </Button>

                {insufficientBalance && (
                  <Button
                    onClick={() => navigate("/wallet")}
                    variant="outline"
                    className="w-full rounded-xl border-border"
                  >
                    Go to Wallet to Deposit
                  </Button>
                )}
              </div>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default VIPSubscription;
