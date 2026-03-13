import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowRight, Gift, Users, Trophy } from "lucide-react";
import { toast } from "sonner";

const Invite = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [referrer, setReferrer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadReferrer = async () => {
      if (!code) { setIsLoading(false); return; }
      
      // Check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { navigate("/dashboard"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, referral_short_code, referral_code")
        .or(`referral_short_code.eq.${code},referral_code.eq.${code.toUpperCase()}`)
        .single();
      
      if (data) setReferrer(data);
      setIsLoading(false);
    };
    loadReferrer();
  }, [code, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { display_name: displayName, referred_by: code },
        },
      });
      if (error) throw error;
      toast.success("Account created! Welcome aboard! 🎉");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-cyber-neon-cyan/10 blur-3xl animate-pulse delay-700" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Invitation Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg mb-3">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-black text-foreground">
            You've been invited!
          </h1>
          {referrer && (
            <p className="text-muted-foreground mt-1">
              <span className="text-primary font-bold">{referrer.display_name}</span> invited you to join SportyCodes
            </p>
          )}
          {!referrer && code && (
            <p className="text-muted-foreground mt-1">Join SportyCodes and start earning</p>
          )}
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-3 text-center">
            <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Win big prizes</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-3 text-center">
            <Zap className="w-5 h-5 text-bet-warning mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Tap to earn</p>
          </div>
          <div className="bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 p-3 text-center">
            <Users className="w-5 h-5 text-cyber-neon-cyan mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Join rooms</p>
          </div>
        </div>

        {/* Signup Form */}
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-3xl blur-lg opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-6">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Display Name</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" required className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="h-12 bg-secondary/50 border-border/50 rounded-xl" />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-lg rounded-xl">
                {isSubmitting ? "Creating..." : <><span>Join Now</span> <ArrowRight className="w-5 h-5 ml-2" /></>}
              </Button>
            </form>

            <div className="text-center mt-4">
              <button onClick={() => navigate("/auth")} className="text-sm text-muted-foreground hover:text-foreground">
                Already have an account? Sign in
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Invite;