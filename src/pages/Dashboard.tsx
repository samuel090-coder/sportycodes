import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Wallet, 
  User, 
  Trophy, 
  TrendingUp, 
  Gift,
  ChevronRight,
  LogOut,
  Bell,
  Coins
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DailyBonusWheel from "@/components/DailyBonusWheel";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      const [profileRes, walletRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("wallets").select("*").eq("user_id", userId).single(),
      ]);
      setProfile(profileRes.data);
      setWallet(walletRes.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    {
      icon: Zap,
      title: "Tap to Earn",
      subtitle: "Earn ₦0.50 per tap daily",
      path: "/tap",
      gradient: "from-primary to-primary/60",
      featured: true,
    },
    {
      icon: Wallet,
      title: "My Wallet",
      subtitle: "Deposit & withdraw funds",
      path: "/wallet",
      gradient: "from-bet-success to-bet-success/60",
    },
    {
      icon: Trophy,
      title: "Sure Odds",
      subtitle: "Get winning predictions",
      path: "/",
      gradient: "from-bet-warning to-bet-warning/60",
    },
    {
      icon: User,
      title: "My Profile",
      subtitle: "Manage your account",
      path: "/profile",
      gradient: "from-cyber-neon-cyan to-cyber-neon-cyan/60",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full bg-cyber-neon-purple/5 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 w-40 h-40 rounded-full bg-cyber-neon-cyan/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gradient-to-br from-primary via-primary/90 to-primary/70 pt-6 pb-16 px-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center">
                <span className="text-2xl">👋</span>
              </div>
              <div>
                <p className="text-primary-foreground/80 text-sm">Welcome back,</p>
                <h1 className="text-xl font-bold text-primary-foreground">
                  {profile?.display_name || "User"}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-primary-foreground hover:bg-white/10 rounded-xl"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleLogout}
                className="text-primary-foreground hover:bg-white/10 rounded-xl"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="text-center">
            <p className="text-primary-foreground/70 text-sm mb-1">Total Balance</p>
            <p className="text-5xl font-black text-primary-foreground">
              ₦{wallet?.balance?.toFixed(2) || "0.00"}
            </p>
          </div>
        </div>
      </header>

      {/* Quick Actions - Overlapping Card */}
      <div className="relative z-10 -mt-8 px-4">
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={() => navigate("/tap")}
              className="flex flex-col items-center gap-2 py-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <Coins className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-xs font-bold text-foreground">Earn</span>
            </button>
            
            <button 
              onClick={() => navigate("/wallet")}
              className="flex flex-col items-center gap-2 py-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bet-success to-bet-success/60 flex items-center justify-center shadow-lg shadow-bet-success/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-bold text-foreground">Withdraw</span>
            </button>
            
            <button 
              onClick={() => navigate("/wallet")}
              className="flex flex-col items-center gap-2 py-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyber-neon-purple to-cyber-neon-purple/60 flex items-center justify-center shadow-lg shadow-cyber-neon-purple/30">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <span className="text-xs font-bold text-foreground">Deposit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative z-10 max-w-screen-xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </div>
            <p className="text-2xl font-black text-foreground">₦{profile?.total_earned?.toFixed(2) || "0.00"}</p>
          </div>
          
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyber-neon-cyan/10 flex items-center justify-center">
                <Gift className="w-4 h-4 text-cyber-neon-cyan" />
              </div>
              <p className="text-sm text-muted-foreground">Referral Code</p>
            </div>
            <p className="text-xl font-black text-foreground tracking-wider">{profile?.referral_code || "N/A"}</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Quick Access</h3>
          
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full relative group bg-card/60 backdrop-blur-xl rounded-2xl border border-border/30 p-4 flex items-center gap-4 text-left transition-all hover:border-primary/30 ${
                item.featured ? "ring-2 ring-primary/20" : ""
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg`}>
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground text-lg">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              
              {item.featured && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                  HOT
                </span>
              )}
            </button>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
