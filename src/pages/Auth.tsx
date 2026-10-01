import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User, Zap, ArrowRight, Gift, X, Plus } from "lucide-react";

type SavedAccount = {
  email: string;
  display_name?: string;
  avatar_url?: string;
};

const STORAGE_KEY = "sportycodes_saved_accounts";

const loadSaved = (): SavedAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveAccount = (acc: SavedAccount) => {
  const list = loadSaved().filter((a) => a.email !== acc.email);
  list.unshift(acc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 5)));
};
const removeAccount = (email: string) => {
  const list = loadSaved().filter((a) => a.email !== email);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"welcome" | "login" | "signup" | "forgot">("welcome");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [selectedAcc, setSelectedAcc] = useState<SavedAccount | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/dashboard");
    });
    const saved = loadSaved();
    setSavedAccounts(saved);
    if (saved.length === 0) setMode("login");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const useEmail = selectedAcc?.email || email;
      const { data, error } = await supabase.auth.signInWithPassword({ email: useEmail, password });
      if (error) throw error;
      // Save profile preview
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", data.user!.id)
        .maybeSingle();
      saveAccount({
        email: useEmail,
        display_name: profile?.display_name || useEmail.split("@")[0],
        avatar_url: profile?.avatar_url || undefined,
      });
      // Private login alert for this account only
      try {
        await supabase.from("notifications").insert({
          user_id: data.user!.id,
          title: "🔐 New login",
          body: `You signed in on ${new Date().toLocaleString()}. If this wasn't you, change your password.`,
          category: "security",
          url: "/profile",
        });
      } catch {
        /* non-blocking */
      }
      toast.success(`Welcome back, ${profile?.display_name || ""}!`);
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
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
      if (error) throw error;
      toast.success("Account created! You can now login.");
      saveAccount({ email, display_name: displayName });
      setMode("welcome");
      setSavedAccounts(loadSaved());
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent! Check your email.");
      setMode("login");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const pickAccount = (acc: SavedAccount) => {
    setSelectedAcc(acc);
    setEmail(acc.email);
    setMode("login");
  };

  const dropAccount = (e: React.MouseEvent, em: string) => {
    e.stopPropagation();
    removeAccount(em);
    const list = loadSaved();
    setSavedAccounts(list);
    if (list.length === 0) setMode("login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-cyber-neon-cyan/10 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg mb-3">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-black text-foreground">
            SPORTY<span className="text-primary">CODES</span>
          </h1>
        </div>

        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-6 shadow-2xl">
          {/* ============= WELCOME BACK ============= */}
          {mode === "welcome" && savedAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-black text-foreground">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Choose an account to continue</p>
              </div>
              <div className="space-y-2">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => pickAccount(acc)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all text-left group"
                  >
                    {acc.avatar_url ? (
                      <img src={acc.avatar_url} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {(acc.display_name || acc.email)[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{acc.display_name || acc.email}</p>
                      <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[9px] bg-primary/20 text-primary rounded-full font-bold uppercase tracking-wider">
                        Tap to login
                      </span>
                    </div>
                    <button
                      onClick={(e) => dropAccount(e, acc.email)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 rounded"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setSelectedAcc(null); setEmail(""); setMode("login"); }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" /> Use another account
              </button>
            </div>
          )}

          {/* ============= LOGIN (with optional locked email) ============= */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {selectedAcc ? (
                <div className="flex flex-col items-center text-center mb-2">
                  {selectedAcc.avatar_url ? (
                    <img src={selectedAcc.avatar_url} className="w-20 h-20 rounded-full object-cover mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-black text-3xl mb-3">
                      {(selectedAcc.display_name || selectedAcc.email)[0].toUpperCase()}
                    </div>
                  )}
                  <h2 className="text-xl font-black text-foreground">{selectedAcc.display_name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedAcc.email}</p>
                  <span className="mt-2 px-3 py-1 text-[10px] bg-cyber-neon-green/10 text-cyber-neon-green rounded-full font-bold uppercase tracking-wider">
                    Welcome back champion
                  </span>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-black text-foreground text-center">Sign in</h2>
                  <div>
                    <Label>Email</Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
                    </div>
                  </div>
                </>
              )}

              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12"
                    required
                    autoFocus={!!selectedAcc}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                Forgot password?
              </button>

              <Button type="submit" disabled={isLoading} className="w-full h-12 font-bold">
                {isLoading ? "Please wait..." : selectedAcc ? "Continue" : "Sign in"}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <div className="flex items-center justify-between text-xs">
                {savedAccounts.length > 0 && (
                  <button type="button" onClick={() => setMode("welcome")} className="text-muted-foreground hover:text-foreground">
                    ← Back to accounts
                  </button>
                )}
                <button type="button" onClick={() => setMode("signup")} className="text-primary hover:underline ml-auto">
                  Create account
                </button>
              </div>
            </form>
          )}

          {/* ============= SIGNUP ============= */}
          {mode === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h2 className="text-xl font-black text-foreground text-center">Create your account</h2>
              <div>
                <Label>Display name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <div>
                <Label>Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 h-12" required minLength={6} />
                </div>
              </div>
              <div>
                <Label>Referral code <span className="text-muted-foreground">(optional)</span></Label>
                <div className="relative mt-1">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} className="pl-10 h-12" />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 font-bold">
                {isLoading ? "Creating..." : "Create account"}
              </Button>
              <button type="button" onClick={() => setMode(savedAccounts.length ? "welcome" : "login")} className="text-xs text-muted-foreground w-full text-center">
                Already have an account? <span className="text-primary">Sign in</span>
              </button>
            </form>
          )}

          {/* ============= FORGOT ============= */}
          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <h2 className="text-xl font-black text-foreground text-center">Reset password</h2>
              <p className="text-sm text-muted-foreground text-center">Enter your email and we'll send a reset link.</p>
              <div>
                <Label>Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
                </div>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 font-bold">
                {isLoading ? "Sending..." : "Send reset link"}
              </Button>
              <button type="button" onClick={() => setMode("login")} className="text-xs text-muted-foreground w-full text-center">
                ← Back to sign in
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground text-xs">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
