import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  Copy, 
  Gift, 
  Save,
  Camera,
  Sparkles
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
      }
    });

    checkAuth();
    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setDisplayName(data?.display_name || "");
      setUsername(data?.username || "");
      setPhone(data?.phone || "");
      setCountry(data?.country || "");
      setBio(data?.bio || "");
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          username: username || null,
          phone: phone || null,
          country: country || null,
          bio: bio || null,
        })
        .eq("id", user.id);

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Username is already taken");
        } else {
          throw error;
        }
      } else {
        toast.success("Profile updated successfully!");
        loadProfile(user.id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast.success("Referral code copied!");
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
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/dashboard")}
              className="rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">My Profile</h1>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="rounded-xl bg-primary text-primary-foreground"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-cyber-neon-purple to-cyber-neon-cyan p-1">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground" />
                )}
              </div>
            </div>
            <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Camera className="w-5 h-5 text-primary-foreground" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-4">
            {profile?.display_name || "User"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Stats Card */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-2xl blur opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-primary">₦{profile?.total_earned?.toFixed(2) || "0.00"}</p>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
            <div className="text-center border-x border-border/30">
              <div className="flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4 text-bet-warning" />
                <p className="text-2xl font-black text-bet-warning">0</p>
              </div>
              <p className="text-xs text-muted-foreground">Referrals</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-cyber-neon-cyan">
                {new Date(profile?.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">Joined</p>
            </div>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="bg-gradient-to-r from-primary/10 to-cyber-neon-purple/10 rounded-xl border border-primary/20 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Referral Code</p>
                <p className="text-xl font-black text-foreground tracking-wider">
                  {profile?.referral_code || "N/A"}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyReferralCode}
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Display Name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="h-12 bg-secondary/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <span className="text-primary">@</span>
              Username
            </Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="unique_username"
              className="h-12 bg-secondary/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <Input
              value={user?.email || ""}
              disabled
              className="h-12 bg-secondary/30 border-border/50 rounded-xl text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 XXX XXX XXXX"
              className="h-12 bg-secondary/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Country
            </Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Nigeria"
              className="h-12 bg-secondary/50 border-border/50 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Bio</Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full h-24 p-3 bg-secondary/50 border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground resize-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-10 pt-6 border-t border-border/30">
          <h3 className="text-sm font-bold text-destructive mb-4">Danger Zone</h3>
          <Button
            variant="outline"
            className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            Delete Account
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
