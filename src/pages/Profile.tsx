import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SITE_HOST, buildSiteUrl } from "@/lib/siteUrl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Bell,
  Grid3X3,
  Settings,
  Trash2,
  Edit2,
  Eye,
  LogOut,
  Heart,
  MessageCircle,
  Shield
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import NotificationSettings from "@/components/NotificationSettings";


const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [referralCount, setReferralCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");

  // Edit post modal
  const [editOpen, setEditOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [isSavingPost, setIsSavingPost] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadProfile(session.user.id);
      // Check admin role
      try {
        const { data: adminCheck } = await supabase.rpc("is_admin_user", { _user_id: session.user.id });
        setIsAdmin(!!adminCheck);
      } catch (e) {
        console.error("Admin check failed:", e);
      }
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

      const { data: posts } = await supabase
        .from("shorts")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setUserPosts(posts || []);

      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", userId);
      setReferralCount(count || 0);

    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("shorts-media")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("shorts-media")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
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

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("shorts")
        .update({ is_active: false })
        .eq("id", postId)
        .eq("user_id", user?.id);

      if (error) throw error;
      
      setUserPosts(prev => prev.filter(p => p.id !== postId));
      toast.success("Post deleted!");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const openEditPost = (post: any) => {
    setSelectedPost(post);
    setEditContent(post.content || "");
    setEditOpen(true);
  };

  const openPreviewPost = (post: any) => {
    setSelectedPost(post);
    setPreviewOpen(true);
  };

  const handleSavePost = async () => {
    if (!selectedPost) return;

    setIsSavingPost(true);
    try {
      const { error } = await supabase
        .from("shorts")
        .update({ content: editContent.trim() || null })
        .eq("id", selectedPost.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      setUserPosts(prev => prev.map(p => 
        p.id === selectedPost.id ? { ...p, content: editContent.trim() || null } : p
      ));
      setEditOpen(false);
      toast.success("Post updated!");
    } catch (error) {
      toast.error("Failed to update post");
    } finally {
      setIsSavingPost(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
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
              onClick={() => navigate("/")}
              className="rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">My Profile</h1>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin")}
                size="sm"
                className="rounded-xl bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-500 hover:to-red-700 font-mono font-bold shadow-lg shadow-red-500/30"
                title="Open Admin Panel"
              >
                <Shield className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">ADMIN</span>
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="rounded-xl bg-primary text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSaving ? "..." : "Save"}
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary via-cyber-neon-purple to-cyber-neon-cyan p-1">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
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
            <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-primary-foreground" />
              )}
            </label>
          </div>
          <h2 className="text-xl font-bold text-foreground mt-4">
            {profile?.display_name || "User"}
          </h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Stats Card */}
        <div className="relative mb-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-2xl blur opacity-20" />
          <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 p-4 grid grid-cols-4 gap-2">
            <div className="text-center">
              <p className="text-xl font-black text-primary">₦{profile?.total_earned?.toFixed(0) || "0"}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-xl font-black text-bet-warning">{referralCount}</p>
              <p className="text-xs text-muted-foreground">Referrals</p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-xl font-black text-cyber-neon-cyan">{profile?.followers_count || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="text-center border-l border-border/30">
              <p className="text-xl font-black text-cyber-neon-purple">{userPosts.length}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
          </div>
        </div>

        {/* Referral Code Section */}
        <div className="bg-gradient-to-r from-primary/10 to-cyber-neon-purple/10 rounded-xl border border-primary/20 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
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
          {/* Short referral link */}
          {profile?.referral_short_code && (
            <div className="bg-card/60 rounded-lg p-2 mb-2">
              <p className="text-xs text-muted-foreground mb-1">Your Invite Link</p>
              <div className="flex items-center gap-2">
                <p className="text-xs font-mono text-primary flex-1 truncate">
                  {SITE_HOST}/ref/{profile.referral_short_code}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(buildSiteUrl(`/ref/${profile.referral_short_code}`));
                    toast.success("Invite link copied!");
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Earnings from referrals: <span className="text-primary font-bold">₦{profile?.referral_earnings?.toFixed(2) || "0.00"}</span>
            {" · "}{referralCount} referrals
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="posts" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
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
          </TabsContent>

          <TabsContent value="posts">
            {userPosts.length === 0 ? (
              <div className="text-center py-12">
                <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No posts yet</p>
                <Button 
                  onClick={() => navigate("/shorts")}
                  className="mt-4 rounded-xl"
                >
                  Create Your First Post
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {userPosts.map((post) => (
                  <div key={post.id} className="relative aspect-square group">
                    {post.media_url ? (
                      post.media_type === "video" ? (
                        <video 
                          src={post.media_url} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <img 
                          src={post.media_url} 
                          alt="" 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-cyber-neon-purple/20 rounded-lg flex items-center justify-center p-2">
                        <p className="text-xs text-foreground text-center line-clamp-4">
                          {post.content}
                        </p>
                      </div>
                    )}
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2 p-2">
                      <div className="flex items-center gap-3 text-white text-xs">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {post.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> {post.comments_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={() => openPreviewPost(post)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20"
                          onClick={() => openEditPost(post)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/20"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications">
            {user && <NotificationSettings userId={user.id} userEmail={user.email || ''} />}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Post Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedPost?.media_url && (
              <div className="rounded-xl overflow-hidden">
                {selectedPost.media_type === "video" ? (
                  <video src={selectedPost.media_url} className="w-full h-48 object-cover" controls />
                ) : (
                  <img src={selectedPost.media_url} className="w-full h-48 object-cover" alt="" />
                )}
              </div>
            )}
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Update your caption..."
              className="min-h-[100px] bg-secondary/50 border-border rounded-xl"
            />
            <Button
              onClick={handleSavePost}
              disabled={isSavingPost}
              className="w-full rounded-xl"
            >
              {isSavingPost ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Post Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-4 p-0 overflow-hidden">
          {selectedPost && (
            <div className="relative">
              {selectedPost.media_url ? (
                selectedPost.media_type === "video" ? (
                  <video src={selectedPost.media_url} className="w-full aspect-square object-cover" controls autoPlay />
                ) : (
                  <img src={selectedPost.media_url} className="w-full aspect-square object-cover" alt="" />
                )
              ) : (
                <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-cyber-neon-purple/20 flex items-center justify-center p-6">
                  <p className="text-lg text-foreground text-center font-medium">
                    {selectedPost.content}
                  </p>
                </div>
              )}
              {selectedPost.content && selectedPost.media_url && (
                <div className="p-4 bg-card">
                  <p className="text-sm text-foreground">{selectedPost.content}</p>
                </div>
              )}
              <div className="p-4 bg-card border-t border-border flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Heart className="w-4 h-4" /> {selectedPost.likes_count || 0}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="w-4 h-4" /> {selectedPost.comments_count || 0}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(selectedPost.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <BottomNav />
    </div>
  );
};

export default Profile;