import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Crown, 
  Check, 
  ChevronLeft, 
  Star, 
  Zap, 
  Shield, 
  Sparkles,
  Upload
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const VIPSubscription = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [vipPrice, setVipPrice] = useState(2000);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [bankDetails, setBankDetails] = useState({
    bank_name: "",
    account_number: "",
    account_name: ""
  });

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

      // Load bank details
      const { data: bankData } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["bank_name", "account_number", "account_name"]);

      const details: any = {};
      bankData?.forEach(d => {
        details[d.setting_key] = d.setting_value;
      });
      setBankDetails(details);

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

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
    }
  };

  const handleSubscribe = async () => {
    if (!user || !paymentReference.trim()) {
      toast.error("Please enter your payment reference");
      return;
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileName = `vip-${user.id}-${Date.now()}.${screenshot.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("payment-screenshots")
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("payment-screenshots")
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
      }

      // Create subscription request
      const { error } = await supabase.from("vip_subscriptions").insert({
        user_id: user.id,
        price: vipPrice,
        payment_reference: paymentReference.trim(),
        payment_screenshot_url: screenshotUrl,
        status: "pending"
      });

      if (error) throw error;

      toast.success("VIP subscription request submitted! Awaiting approval.");
      loadData(user.id);
      setPaymentReference("");
      setScreenshot(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit subscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVipActive = currentSubscription?.status === "active" && 
    new Date(currentSubscription.expires_at) > new Date();

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

            {/* Payment Section */}
            <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                Subscribe Now
              </h3>

              {/* Bank Details */}
              <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">Make payment to:</p>
                <div className="space-y-1">
                  <p className="text-foreground font-bold">{bankDetails.bank_name || "Bank Name"}</p>
                  <p className="text-foreground font-mono text-lg">{bankDetails.account_number || "Account Number"}</p>
                  <p className="text-muted-foreground">{bankDetails.account_name || "Account Name"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Payment Reference / Sender Name</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter sender name or reference"
                    className="bg-secondary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Screenshot (optional)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      id="screenshot-upload"
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {screenshot ? screenshot.name : "Upload screenshot"}
                      </span>
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleSubscribe}
                  disabled={isSubmitting || !paymentReference.trim()}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-bet-warning"
                >
                  {isSubmitting ? "Submitting..." : "Submit Subscription Request"}
                </Button>
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
