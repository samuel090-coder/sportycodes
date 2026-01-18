import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  User, 
  UserPlus, 
  UserMinus,
  Grid3X3,
  Heart,
  MessageCircle
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

const UserProfile = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setCurrentUser(session.user);
      if (userId) {
        await loadProfile(userId, session.user.id);
      }
    };

    checkAuth();
  }, [userId, navigate]);

  const loadProfile = async (profileId: string, currentUserId: string) => {
    setIsLoading(true);
    try {
      // If viewing own profile, redirect to /profile
      if (profileId === currentUserId) {
        navigate("/profile");
        return;
      }

      // Load profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Check if following
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .single();
      setIsFollowing(!!followData);

      // Load user's posts
      const { data: posts } = await supabase
        .from("shorts")
        .select("*")
        .eq("user_id", profileId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setUserPosts(posts || []);

    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !userId) return;

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);
        setIsFollowing(false);
        setProfile((prev: any) => ({ 
          ...prev, 
          followers_count: (prev.followers_count || 1) - 1 
        }));
        toast.success("Unfollowed");
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: currentUser.id, following_id: userId });
        setIsFollowing(true);
        setProfile((prev: any) => ({ 
          ...prev, 
          followers_count: (prev.followers_count || 0) + 1 
        }));
        toast.success("Following!");
      }
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">User not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              @{profile.username || "user"}
            </h1>
            <p className="text-xs text-muted-foreground">Profile</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-cyber-neon-purple to-cyber-neon-cyan p-0.5">
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {profile.display_name || "User"}
            </h2>
            <p className="text-sm text-muted-foreground">@{profile.username || "user"}</p>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-foreground mb-4">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-xl font-black text-foreground">{userPosts.length}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-foreground">{profile.followers_count || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-foreground">{profile.following_count || 0}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Follow Button */}
        <Button
          onClick={handleFollow}
          variant={isFollowing ? "outline" : "default"}
          className="w-full rounded-xl mb-6"
        >
          {isFollowing ? (
            <>
              <UserMinus className="w-4 h-4 mr-2" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Follow
            </>
          )}
        </Button>

        {/* Posts Grid */}
        <div className="border-t border-border/30 pt-4">
          <h3 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4" />
            POSTS
          </h3>
          
          {userPosts.length === 0 ? (
            <div className="text-center py-12">
              <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                <div 
                  key={post.id} 
                  className="relative aspect-square group cursor-pointer"
                  onClick={() => navigate("/shorts")}
                >
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
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                    <div className="flex items-center gap-1 text-white text-sm">
                      <Heart className="w-4 h-4" />
                      <span className="font-bold">{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white text-sm">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-bold">{post.comments_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default UserProfile;