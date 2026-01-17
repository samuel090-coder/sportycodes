import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Video,
  BarChart3,
  Send,
  X,
  MoreVertical,
  UserPlus,
  UserMinus,
  Bookmark,
  Flag
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface Short {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  poll_options: any;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profile?: {
    display_name: string;
    username: string;
    avatar_url: string;
  };
  is_liked?: boolean;
  is_following?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

const Shorts = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  
  // Create post modal
  const [createOpen, setCreateOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postMedia, setPostMedia] = useState<File | null>(null);
  const [postMediaPreview, setPostMediaPreview] = useState<string | null>(null);
  const [postType, setPostType] = useState<"text" | "image" | "video" | "poll">("text");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [isPosting, setIsPosting] = useState(false);
  
  // Comments modal
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedShortId, setSelectedShortId] = useState<string | null>(null);

  // Touch handling for swipe
  const touchStartY = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadShorts();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const loadShorts = async () => {
    setIsLoading(true);
    try {
      // Load shorts with profile info
      const { data: shortsData, error } = await supabase
        .from("shorts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get profile info for each short
      const userIds = [...new Set(shortsData?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      // Get user's likes
      const { data: userLikes } = await supabase
        .from("shorts_likes")
        .select("short_id")
        .eq("user_id", user.id);

      // Get user's follows
      const { data: userFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const likesSet = new Set(userLikes?.map(l => l.short_id));
      const followsSet = new Set(userFollows?.map(f => f.following_id));

      const enrichedShorts = shortsData?.map(short => ({
        ...short,
        profile: profiles?.find(p => p.id === short.user_id),
        is_liked: likesSet.has(short.id),
        is_following: followsSet.has(short.user_id)
      })) || [];

      setShorts(enrichedShorts);
    } catch (error) {
      console.error("Error loading shorts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (shortId: string) => {
    if (!user) return;

    const short = shorts.find(s => s.id === shortId);
    if (!short) return;

    const isLiked = short.is_liked;

    // Optimistic update
    setShorts(prev => prev.map(s => 
      s.id === shortId 
        ? { ...s, is_liked: !isLiked, likes_count: isLiked ? s.likes_count - 1 : s.likes_count + 1 }
        : s
    ));

    try {
      if (isLiked) {
        await supabase.from("shorts_likes").delete().eq("short_id", shortId).eq("user_id", user.id);
      } else {
        await supabase.from("shorts_likes").insert({ short_id: shortId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setShorts(prev => prev.map(s => 
        s.id === shortId 
          ? { ...s, is_liked: isLiked, likes_count: isLiked ? s.likes_count + 1 : s.likes_count - 1 }
          : s
      ));
    }
  };

  const handleFollow = async (userId: string) => {
    if (!user || userId === user.id) return;

    const isFollowing = shorts.find(s => s.user_id === userId)?.is_following;

    // Optimistic update
    setShorts(prev => prev.map(s => 
      s.user_id === userId ? { ...s, is_following: !isFollowing } : s
    ));

    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      }
    } catch (error) {
      setShorts(prev => prev.map(s => 
        s.user_id === userId ? { ...s, is_following: isFollowing } : s
      ));
    }
  };

  const openComments = async (shortId: string) => {
    setSelectedShortId(shortId);
    setCommentsOpen(true);
    setLoadingComments(true);

    try {
      const { data: commentsData } = await supabase
        .from("shorts_comments")
        .select("*")
        .eq("short_id", shortId)
        .order("created_at", { ascending: false });

      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        profile: profiles?.find(p => p.id === comment.user_id)
      })) || [];

      setComments(enrichedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const postComment = async () => {
    if (!user || !selectedShortId || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from("shorts_comments")
        .insert({ 
          short_id: selectedShortId, 
          user_id: user.id, 
          content: newComment.trim() 
        })
        .select()
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", user.id)
        .single();

      setComments(prev => [{ ...data, profile }, ...prev]);
      setNewComment("");

      // Update comment count
      setShorts(prev => prev.map(s => 
        s.id === selectedShortId ? { ...s, comments_count: s.comments_count + 1 } : s
      ));

      toast.success("Comment posted!");
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const handleCreatePost = async () => {
    if (!user) return;
    if (!postContent.trim() && !postMedia && postType !== "poll") {
      toast.error("Please add some content");
      return;
    }

    setIsPosting(true);
    try {
      let mediaUrl = null;
      let mediaType = null;

      if (postMedia) {
        const fileExt = postMedia.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("shorts-media")
          .upload(fileName, postMedia);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("shorts-media")
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
        mediaType = postMedia.type.startsWith("video") ? "video" : "image";
      }

      const pollData = postType === "poll" && pollOptions.filter(o => o.trim()).length >= 2
        ? { options: pollOptions.filter(o => o.trim()).map((text, i) => ({ text, votes: 0, index: i })) }
        : null;

      const { error } = await supabase.from("shorts").insert({
        user_id: user.id,
        content: postContent.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
        poll_options: pollData
      });

      if (error) throw error;

      toast.success("Post created! 🎉");
      setCreateOpen(false);
      resetCreateForm();
      loadShorts();
    } catch (error: any) {
      toast.error(error.message || "Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  const resetCreateForm = () => {
    setPostContent("");
    setPostMedia(null);
    setPostMediaPreview(null);
    setPostType("text");
    setPollOptions(["", ""]);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPostMedia(file);
      const reader = new FileReader();
      reader.onloadend = () => setPostMediaPreview(reader.result as string);
      reader.readAsDataURL(file);
      setPostType(file.type.startsWith("video") ? "video" : "image");
    }
  };

  const handleScroll = (direction: "up" | "down") => {
    if (direction === "up" && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === "down" && currentIndex < shorts.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) {
      handleScroll(diff > 0 ? "down" : "up");
    }
  };

  const togglePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVotePoll = async (shortId: string, optionIndex: number) => {
    if (!user) return;

    try {
      // Check if already voted
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("id")
        .eq("short_id", shortId)
        .eq("user_id", user.id)
        .single();

      if (existingVote) {
        toast.error("You already voted!");
        return;
      }

      await supabase.from("poll_votes").insert({
        short_id: shortId,
        user_id: user.id,
        option_index: optionIndex
      });

      // Update local state
      setShorts(prev => prev.map(s => {
        if (s.id === shortId && s.poll_options) {
          const newOptions = { ...s.poll_options };
          newOptions.options = newOptions.options.map((opt: any, i: number) => 
            i === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
          );
          return { ...s, poll_options: newOptions };
        }
        return s;
      }));

      toast.success("Vote recorded!");
    } catch (error) {
      toast.error("Failed to vote");
    }
  };

  const currentShort = shorts[currentIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-20 overflow-hidden">
      {/* Full screen shorts viewer */}
      <div 
        ref={containerRef}
        className="h-screen relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {shorts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Video className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Posts Yet</h2>
            <p className="text-white/60 mb-6">Be the first to share something!</p>
            <Button onClick={() => setCreateOpen(true)} className="rounded-full px-6">
              <Plus className="w-5 h-5 mr-2" />
              Create Post
            </Button>
          </div>
        ) : currentShort && (
          <div className="h-full relative">
            {/* Media Content */}
            <div className="absolute inset-0 bg-black flex items-center justify-center">
              {currentShort.media_type === "video" ? (
                <video
                  ref={el => { if (el) videoRefs.current[currentShort.id] = el; }}
                  src={currentShort.media_url || ""}
                  className="h-full w-full object-cover"
                  loop
                  autoPlay
                  muted={isMuted}
                  playsInline
                  onClick={() => togglePlayPause(currentShort.id)}
                />
              ) : currentShort.media_url ? (
                <img 
                  src={currentShort.media_url} 
                  alt="Post" 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-primary/20 via-cyber-neon-purple/20 to-cyber-neon-cyan/20 flex items-center justify-center p-8">
                  <p className="text-white text-2xl font-bold text-center leading-relaxed">
                    {currentShort.content}
                  </p>
                </div>
              )}
            </div>

            {/* Poll Overlay */}
            {currentShort.poll_options && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-6">
                <div className="w-full max-w-sm space-y-3">
                  <p className="text-white text-xl font-bold text-center mb-4">{currentShort.content}</p>
                  {currentShort.poll_options.options.map((option: any, i: number) => {
                    const totalVotes = currentShort.poll_options.options.reduce((sum: number, o: any) => sum + o.votes, 0);
                    const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                    return (
                      <button
                        key={i}
                        onClick={() => handleVotePoll(currentShort.id, i)}
                        className="w-full relative bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white text-left overflow-hidden hover:bg-white/20 transition-colors"
                      >
                        <div 
                          className="absolute inset-0 bg-primary/50 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                        <div className="relative flex justify-between items-center">
                          <span className="font-medium">{option.text}</span>
                          <span className="text-sm opacity-70">{Math.round(percentage)}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gradient overlays */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-60 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            {/* User Info */}
            <div className="absolute bottom-32 left-4 right-20 text-white">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-cyber-neon-purple p-0.5">
                  <div className="w-full h-full rounded-full bg-black overflow-hidden">
                    {currentShort.profile?.avatar_url ? (
                      <img src={currentShort.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-lg font-bold">
                        {currentShort.profile?.display_name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold">{currentShort.profile?.display_name || "Unknown"}</p>
                  <p className="text-white/60 text-sm">@{currentShort.profile?.username || "user"}</p>
                </div>
                {currentShort.user_id !== user?.id && (
                  <Button
                    onClick={() => handleFollow(currentShort.user_id)}
                    variant={currentShort.is_following ? "outline" : "default"}
                    size="sm"
                    className="rounded-full"
                  >
                    {currentShort.is_following ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                )}
              </div>
              {currentShort.content && !currentShort.poll_options && currentShort.media_url && (
                <p className="text-white/90 text-sm line-clamp-3">{currentShort.content}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-32 right-4 flex flex-col items-center gap-5">
              <button
                onClick={() => handleLike(currentShort.id)}
                className="flex flex-col items-center group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  currentShort.is_liked ? "bg-red-500" : "bg-white/10 backdrop-blur-sm group-hover:bg-white/20"
                }`}>
                  <Heart className={`w-6 h-6 ${currentShort.is_liked ? "text-white fill-white" : "text-white"}`} />
                </div>
                <span className="text-white text-xs mt-1 font-bold">{currentShort.likes_count}</span>
              </button>

              <button
                onClick={() => openComments(currentShort.id)}
                className="flex flex-col items-center group"
              >
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1 font-bold">{currentShort.comments_count}</span>
              </button>

              <button className="flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1 font-bold">Share</span>
              </button>

              <button className="flex flex-col items-center group">
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/20">
                  <Bookmark className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xs mt-1 font-bold">Save</span>
              </button>
            </div>

            {/* Navigation Arrows */}
            {currentIndex > 0 && (
              <button
                onClick={() => handleScroll("up")}
                className="absolute top-20 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white animate-bounce"
              >
                <ChevronUp className="w-6 h-6" />
              </button>
            )}
            {currentIndex < shorts.length - 1 && (
              <button
                onClick={() => handleScroll("down")}
                className="absolute bottom-28 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white animate-bounce"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            )}

            {/* Video Controls */}
            {currentShort.media_type === "video" && (
              <div className="absolute top-20 right-4 flex gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Progress Indicator */}
            <div className="absolute top-4 left-4 right-4 flex gap-1">
              {shorts.slice(0, Math.min(shorts.length, 10)).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === currentIndex ? "bg-white" : i < currentIndex ? "bg-white/60" : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={() => setCreateOpen(true)}
          className="absolute bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-primary to-cyber-neon-purple flex items-center justify-center shadow-lg shadow-primary/30 z-50"
        >
          <Plus className="w-7 h-7 text-white" />
        </button>
      </div>

      {/* Create Post Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Create Post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Post Type Selection */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: "text", icon: MessageCircle, label: "Text" },
                { type: "image", icon: ImageIcon, label: "Image" },
                { type: "video", icon: Video, label: "Video" },
                { type: "poll", icon: BarChart3, label: "Poll" },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setPostType(type as any)}
                  className={`p-3 rounded-xl border transition-all text-center ${
                    postType === type
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            <Textarea
              placeholder={postType === "poll" ? "Ask a question..." : "What's on your mind?"}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[100px] bg-secondary/50 border-border rounded-xl"
            />

            {/* Media Upload */}
            {(postType === "image" || postType === "video") && (
              <div>
                {postMediaPreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    {postType === "video" ? (
                      <video src={postMediaPreview} className="w-full h-48 object-cover" />
                    ) : (
                      <img src={postMediaPreview} className="w-full h-48 object-cover" alt="Preview" />
                    )}
                    <button
                      onClick={() => { setPostMedia(null); setPostMediaPreview(null); }}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
                    <input
                      type="file"
                      accept={postType === "video" ? "video/*" : "image/*"}
                      onChange={handleMediaSelect}
                      className="hidden"
                    />
                    {postType === "video" ? (
                      <Video className="w-8 h-8 text-muted-foreground mb-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      Click to upload {postType}
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Poll Options */}
            {postType === "poll" && (
              <div className="space-y-2">
                {pollOptions.map((option, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[i] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      className="bg-secondary/50 border-border rounded-xl"
                    />
                    {i > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPollOptions(prev => [...prev, ""])}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
            )}

            <Button
              onClick={handleCreatePost}
              disabled={isPosting}
              className="w-full rounded-xl h-12"
            >
              {isPosting ? "Posting..." : "Share Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Modal */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="bg-card border-border rounded-t-3xl fixed bottom-0 left-0 right-0 max-h-[70vh] p-0 gap-0">
          <div className="p-4 border-b border-border">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground text-center">Comments</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No comments yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {comment.profile?.display_name?.[0] || "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">{comment.profile?.display_name}</p>
                      <p className="text-sm text-foreground/80">{comment.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && postComment()}
              className="bg-secondary/50 border-border rounded-full"
            />
            <Button
              onClick={postComment}
              size="icon"
              className="rounded-full"
              disabled={!newComment.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Shorts;