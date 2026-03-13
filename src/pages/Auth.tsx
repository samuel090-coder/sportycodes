import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight, Sparkles, Gift } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");

  useEffect(() => {
    // Check if already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              display_name: displayName,
              ...(referralCode ? { referred_by: referralCode } : {}),
            },
          },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please login instead.");
          } else {
            throw error;
          }
        } else {
          toast.success("Account created! You can now login.");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs */}
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-cyber-neon-cyan/10 blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 rounded-full bg-cyber-neon-purple/10 blur-3xl animate-pulse delay-1000" />
        
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Spinning hexagon */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 opacity-10 animate-spin-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polygon 
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" 
              fill="none" 
              stroke="hsl(var(--primary))" 
              strokeWidth="0.5"
            />
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-neon-red mb-4">
            <Zap className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            SPORTY<span className="text-primary">CODES</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {isLogin ? "Welcome back, champion!" : "Join the winning team"}
          </p>
        </div>

        {/* Auth Card - Glassmorphism Style */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-3xl blur-lg opacity-20" />
          
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-8 shadow-2xl">
            {/* Tab Switcher */}
            <div className="flex bg-secondary/50 rounded-2xl p-1 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  isLogin 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                  !isLogin 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Display Name (Sign Up only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-foreground font-medium">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                      required={!isLogin}
                    />
                   </div>
                 </div>
               )}

               {/* Referral Code (Sign Up only) */}
               {!isLogin && (
                 <div className="space-y-2">
                   <Label htmlFor="referralCode" className="text-foreground font-medium">
                     Invitation Code <span className="text-muted-foreground">(optional)</span>
                   </Label>
                   <div className="relative">
                     <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                     <Input
                       id="referralCode"
                       type="text"
                       placeholder="Enter referral code"
                       value={referralCode}
                       onChange={(e) => setReferralCode(e.target.value)}
                       className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                     />
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 bg-secondary/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 bg-secondary/50 border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-lg rounded-xl shadow-lg shadow-primary/30 transition-all hover:shadow-xl hover:shadow-primary/40"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>Please wait...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{isLogin ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground">or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-12 bg-secondary/30 border-border/50 hover:bg-secondary/50 rounded-xl"
                disabled
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button 
                variant="outline" 
                className="h-12 bg-secondary/30 border-border/50 hover:bg-secondary/50 rounded-xl"
                disabled
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>

            {/* Features Preview */}
            <div className="mt-8 pt-6 border-t border-border/30">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Earn rewards with daily check-ins!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button 
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
