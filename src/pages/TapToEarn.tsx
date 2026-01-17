import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Zap, Wallet, Gift, TrendingUp, ChevronRight, LogOut, User } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const TapToEarn = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [todayTaps, setTodayTaps] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTapping, setIsTapping] = useState(false);
  const [tapAnimation, setTapAnimation] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const CENTS_PER_TAP = 0.50;
  const MAX_DAILY_TAPS = 100;

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadUserData(session.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadUserData(session.user.id);
      }
    });

    checkAuth();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);

      // Load wallet
      const { data: walletData } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();
      setWallet(walletData);

      // Load today's taps
      const today = new Date().toISOString().split("T")[0];
      const { data: tapsData } = await supabase
        .from("daily_taps")
        .select("*")
        .eq("user_id", userId)
        .eq("tap_date", today)
        .single();
      setTodayTaps(tapsData || { tap_count: 0, earnings: 0 });
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTap = useCallback(async (e: React.MouseEvent | React.TouchEvent) => {
    if (!user || isTapping) return;
    
    const currentTaps = todayTaps?.tap_count || 0;
    if (currentTaps >= MAX_DAILY_TAPS) {
      toast.error("Daily tap limit reached! Come back tomorrow.");
      return;
    }

    setIsTapping(true);
    setTapAnimation(true);

    // Create particle effect
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const newParticle = { id: Date.now(), x, y };
    setParticles(prev => [...prev, newParticle]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 1000);

    try {
      const today = new Date().toISOString().split("T")[0];
      const newTapCount = currentTaps + 1;
      const newEarnings = (todayTaps?.earnings || 0) + CENTS_PER_TAP;

      // Upsert daily taps
      const { error: tapError } = await supabase
        .from("daily_taps")
        .upsert({
          user_id: user.id,
          tap_date: today,
          tap_count: newTapCount,
          earnings: newEarnings,
        }, {
          onConflict: "user_id,tap_date"
        });

      if (tapError) throw tapError;

      // Update wallet using the database function
      const { data: newBalance, error: walletError } = await supabase
        .rpc("add_tap_earnings", { _user_id: user.id, _amount: CENTS_PER_TAP });

      if (walletError) throw walletError;

      // Update local state
      setTodayTaps({ ...todayTaps, tap_count: newTapCount, earnings: newEarnings });
      setWallet(prev => ({ ...prev, balance: newBalance }));

      // Show floating text
      if (newTapCount % 10 === 0) {
        toast.success(`+₦${CENTS_PER_TAP.toFixed(2)} earned! Total today: ₦${newEarnings.toFixed(2)}`);
      }
    } catch (error) {
      console.error("Tap error:", error);
      toast.error("Failed to register tap. Try again.");
    } finally {
      setTimeout(() => {
        setIsTapping(false);
        setTapAnimation(false);
      }, 100);
    }
  }, [user, isTapping, todayTaps]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const tapsRemaining = MAX_DAILY_TAPS - (todayTaps?.tap_count || 0);
  const progressPercentage = ((todayTaps?.tap_count || 0) / MAX_DAILY_TAPS) * 100;

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] rounded-full bg-cyber-neon-cyan/5 blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] rounded-full bg-cyber-neon-purple/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">TAP TO EARN</h1>
              <p className="text-xs text-muted-foreground">Daily rewards await!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-xl"
            >
              <User className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="rounded-xl text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-screen-xl mx-auto px-4 py-6">
        {/* Wallet Balance Card */}
        <div className="relative mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-3xl blur opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bet-success to-bet-success/60 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className="text-3xl font-black text-foreground">₦{wallet?.balance?.toFixed(2) || "0.00"}</p>
                </div>
              </div>
              <Button 
                onClick={() => navigate("/wallet")}
                variant="outline"
                className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
              >
                <span>Manage</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            
            {/* Today's Progress */}
            <div className="mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Today's Progress</span>
                <span className="font-bold text-primary">{todayTaps?.tap_count || 0} / {MAX_DAILY_TAPS} taps</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Earned today: <span className="text-primary font-bold">₦{todayTaps?.earnings?.toFixed(2) || "0.00"}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tap Zone - The Star of the Show */}
        <div className="relative flex flex-col items-center justify-center my-8">
          {/* Orbital Rings */}
          <div className="absolute w-80 h-80 border border-primary/10 rounded-full animate-spin-slow" />
          <div className="absolute w-64 h-64 border border-cyber-neon-cyan/10 rounded-full animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "15s" }} />
          <div className="absolute w-48 h-48 border border-cyber-neon-purple/10 rounded-full animate-spin-slow" style={{ animationDuration: "10s" }} />
          
          {/* The Tap Button */}
          <button
            onClick={handleTap}
            onTouchStart={handleTap}
            disabled={tapsRemaining <= 0}
            className={`relative w-44 h-44 rounded-full transition-all duration-150 touch-manipulation select-none ${
              tapsRemaining > 0 
                ? "cursor-pointer active:scale-95" 
                : "cursor-not-allowed opacity-50"
            } ${tapAnimation ? "scale-95" : "scale-100"}`}
            style={{
              background: tapsRemaining > 0 
                ? "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)"
                : "linear-gradient(135deg, hsl(var(--muted)) 0%, hsl(var(--muted) / 0.7) 100%)",
              boxShadow: tapsRemaining > 0 
                ? "0 0 40px hsl(var(--primary) / 0.4), 0 0 80px hsl(var(--primary) / 0.2), inset 0 -5px 20px hsl(0 0% 0% / 0.3)"
                : "0 0 20px hsl(var(--muted) / 0.2)",
            }}
          >
            {/* Inner glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
            
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <Zap className={`w-16 h-16 text-white mb-2 ${tapAnimation ? "animate-pulse" : ""}`} />
              <span className="text-xl font-black text-white">TAP!</span>
              <span className="text-xs text-white/80 mt-1">+₦{CENTS_PER_TAP.toFixed(2)}</span>
            </div>

            {/* Floating particles */}
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute pointer-events-none animate-float-up"
                style={{
                  left: particle.x,
                  top: particle.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className="text-primary font-black text-lg drop-shadow-lg">
                  +₦{CENTS_PER_TAP.toFixed(2)}
                </span>
              </div>
            ))}
          </button>

          {/* Taps Remaining */}
          <div className="mt-8 text-center">
            <p className="text-3xl font-black text-foreground">{tapsRemaining}</p>
            <p className="text-sm text-muted-foreground">taps remaining today</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => navigate("/wallet")}
            className="relative group bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-5 text-left hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyber-neon-cyan/20 to-cyber-neon-cyan/5 flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-cyber-neon-cyan" />
            </div>
            <h3 className="font-bold text-foreground">Deposit</h3>
            <p className="text-xs text-muted-foreground mt-1">Add funds to wallet</p>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          <button
            onClick={() => navigate("/wallet")}
            className="relative group bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 p-5 text-left hover:border-primary/30 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bet-success/20 to-bet-success/5 flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-bet-success" />
            </div>
            <h3 className="font-bold text-foreground">Withdraw</h3>
            <p className="text-xs text-muted-foreground mt-1">Cash out earnings</p>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 text-center">
            <p className="text-2xl font-black text-primary">₦{profile?.total_earned?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Earned</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 text-center">
            <p className="text-2xl font-black text-cyber-neon-cyan">{todayTaps?.tap_count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Taps Today</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4 text-center">
            <p className="text-2xl font-black text-cyber-neon-purple">{profile?.referral_code || "N/A"}</p>
            <p className="text-xs text-muted-foreground mt-1">Referral Code</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default TapToEarn;
