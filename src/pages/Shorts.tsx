import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { User } from "@supabase/supabase-js";
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
  UserPlus,
  UserMinus,
  Bookmark,
  Reply,
  CornerDownRight,
  Trash2
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { mixReels } from "@/lib/reelsFeed";
import CreatePostSheet from "@/components/shorts/CreatePostSheet";

interface Short {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  poll_options: { options: Array<{ text: string; votes: number; index?: number }> } | null;
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
  parent_id: string | null;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
  replies?: Comment[];
}

const Shorts = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  
  // Create post modal
  const [createOpen, setCreateOpen] = useState(false);
  
  // Comments modal
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedShortId, setSelectedShortId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  // Touch handling for swipe
  const [feedMode, setFeedMode] = useState<"for-you" | "following">("for-you");
  const [buffering, setBuffering] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const visibleShorts = useMemo(() => feedMode === "following" ? shorts.filter(short => short.is_following) : shorts, [feedMode, shorts]);
  const seenIds = useRef<Set<string>>(new Set());
  const markWatched = useCallback((id: string) => {
    if (!user || seenIds.current.has(id)) return;
    seenIds.current.add(id);
    try { localStorage.setItem(`reels-seen:${user.id}`, JSON.stringify([...seenIds.current].slice(-800))); } catch { /* storage optional */ }
  }, [user]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadShorts();
    }
  }, [user]);

  // Realtime comments subscription
  useEffect(() => {
    if (!selectedShortId) return;

    const channel = supabase
      .channel(`comments-${selectedShortId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shorts_comments", filter: `short_id=eq.${selectedShortId}` },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newComment = payload.new as unknown as Comment;
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .eq("id", newComment.user_id)
              .single();
            
            setComments(prev => {
              if (newComment.parent_id) {
                // It's a reply - add to parent's replies
                return prev.map(c => {
                  if (c.id === newComment.parent_id) {
                    return { ...c, replies: [...(c.replies || []), { ...newComment, profile }] };
                  }
                  return c;
                });
              }
              // New top-level comment
              return [{ ...newComment, profile, replies: [] }, ...prev];
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedShortId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  // Algorithm: Mix content - trending, following, recent
  const loadShorts = async () => {
    setIsLoading(true);
    try {
      // Get user's follows
      const { data: userFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      
      const followingIds = userFollows?.map(f => f.following_id) || [];

      // Load all active shorts
      const { data: allShorts, error } = await supabase
        .from("shorts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get profile info
      const userIds = [...new Set(allShorts?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url")
        .in("id", userIds);

      // Get user's likes
      const { data: userLikes } = await supabase
        .from("shorts_likes")
        .select("short_id")
        .eq("user_id", user.id);

      const likesSet = new Set(userLikes?.map(l => l.short_id));
      const followsSet = new Set(followingIds);

      const enrichedShorts = allShorts?.map(short => ({
        ...short,
        profile: profiles?.find(p => p.id === short.user_id),
        is_liked: likesSet.has(short.id),
        is_following: followsSet.has(short.user_id)
      })) || [];

      try {
        seenIds.current = new Set(JSON.parse(localStorage.getItem(`reels-seen:${user.id}`) || "[]"));
      } catch { seenIds.current = new Set(); }
      setShorts(mixReels(enrichedShorts, seenIds.current));
      setCurrentIndex(0);
      containerRef.current?.scrollTo({ top: 0 });
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
        if (short.user_id !== user.id) {
          supabase.functions.invoke("send-email", {
            body: {
              type: "post_liked",
              userId: short.user_id,
              data: { likerId: user.id, shortId }
            }
          }).catch(console.error);
        }
      }
    } catch (error) {
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

    setShorts(prev => prev.map(s => 
      s.user_id === userId ? { ...s, is_following: !isFollowing } : s
    ));

    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
        supabase.functions.invoke("send-email", {
          body: {
            type: "new_follower",
            userId,
            data: { followerId: user.id }
          }
        }).catch(console.error);
      }
    } catch (error) {
      setShorts(prev => prev.map(s => 
        s.user_id === userId ? { ...s, is_following: isFollowing } : s
      ));
    }
  };

  const handleDeleteShort = async (shortId: string) => {
    if (!user) return;
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      const { error } = await supabase
        .from("shorts")
        .delete()
        .eq("id", shortId)
        .eq("user_id", user.id);
      if (error) throw error;
      setShorts(prev => {
        const next = prev.filter(s => s.id !== shortId);
        setCurrentIndex(i => Math.max(0, Math.min(i, next.length - 1)));
        return next;
      });
      toast.success("Post deleted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete post");
    }
  };

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("shorts_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);
      if (error) throw error;
      setComments(prev => parentId
        ? prev.map(c => c.id === parentId
            ? { ...c, replies: (c.replies || []).filter(r => r.id !== commentId) }
            : c)
        : prev.filter(c => c.id !== commentId));
      setShorts(prev => prev.map(s =>
        s.id === selectedShortId ? { ...s, comments_count: Math.max(0, (s.comments_count || 1) - 1) } : s
      ));
      toast.success("Comment deleted");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to delete comment");
    }
  };

  const openComments = async (shortId: string) => {
    setSelectedShortId(shortId);
    setCommentsOpen(true);
    setLoadingComments(true);
    setReplyingTo(null);

    try {
      // Load top-level comments
      const { data: commentsData } = await supabase
        .from("shorts_comments")
        .select("*")
        .eq("short_id", shortId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      const commentIds = commentsData?.map(c => c.id) || [];
      
      // Load replies
      const { data: repliesData } = await supabase
        .from("shorts_comments")
        .select("*")
        .in("parent_id", commentIds)
        .order("created_at", { ascending: true });

      // Get all user IDs
      const userIds = [...new Set([
        ...(commentsData?.map(c => c.user_id) || []),
        ...(repliesData?.map(r => r.user_id) || [])
      ])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      // Build comment tree
      const enrichedComments = commentsData?.map(comment => ({
        ...comment,
        profile: profiles?.find(p => p.id === comment.user_id),
        replies: repliesData
          ?.filter(r => r.parent_id === comment.id)
          .map(r => ({ ...r, profile: profiles?.find(p => p.id === r.user_id) })) || []
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
      const commentText = newComment.trim();
      const { error } = await supabase
        .from("shorts_comments")
        .insert({ 
          short_id: selectedShortId, 
          user_id: user.id, 
          content: commentText,
          parent_id: replyingTo?.id || null
        });

      if (error) throw error;

      // Email post owner (skip self-comments)
      const targetShort = shorts.find(s => s.id === selectedShortId);
      if (targetShort && targetShort.user_id !== user.id) {
        supabase.functions.invoke("send-email", {
          body: {
            type: "post_commented",
            userId: targetShort.user_id,
            data: {
              commenterId: user.id,
              shortId: targetShort.id,
              commentPreview: commentText.length > 120 ? commentText.slice(0, 120) + "…" : commentText,
            }
          }
        }).catch(console.error);
      }

      setNewComment("");
      setReplyingTo(null);

      // Update comment count
      setShorts(prev => prev.map(s => 
        s.id === selectedShortId ? { ...s, comments_count: s.comments_count + 1 } : s
      ));

      toast.success(replyingTo ? "Reply posted!" : "Comment posted!");
    } catch (error) {
      toast.error("Failed to post comment");
    }
  };

  const handleScroll = (direction: "up" | "down") => {
    const root = containerRef.current;
    if (!root) return;
    root.scrollTo({ top: (currentIndex + (direction === "up" ? -1 : 1)) * root.clientHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  const togglePlayPause = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;
    if (video.paused) video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    else { video.pause(); setIsPlaying(false); }
  };

  useEffect(() => {
    const current = visibleShorts[currentIndex];
    setProgress(0);
    setBuffering(false);
    setIsPlaying(true);
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (id === current?.id && !commentsOpen && !createOpen && !document.hidden) {
        video.play().catch(() => setIsPlaying(false));
      } else video.pause();
    });
    // Photos and text count as watched after 2.5s on screen; videos after real playback (see markWatched).
    if (current && user && current.media_type !== "video") {
      const timer = setTimeout(() => markWatched(current.id), 2500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, visibleShorts, commentsOpen, createOpen, user, markWatched]);

  useEffect(() => {
    const handleVisibility = () => {
      const current = visibleShorts[currentIndex];
      Object.values(videoRefs.current).forEach(video => video.pause());
      if (!document.hidden && current && !commentsOpen && !createOpen && isPlaying) videoRefs.current[current.id]?.play().catch(() => setIsPlaying(false));
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [currentIndex, visibleShorts, commentsOpen, createOpen, isPlaying]);

  useEffect(() => {
    if (!user) return;
    try { setSavedIds(new Set(JSON.parse(localStorage.getItem(`reels-saved:${user.id}`) || "[]"))); } catch { /* storage optional */ }
  }, [user]);

  const saveShort = (id: string) => {
    const next = new Set(savedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSavedIds(next);
    try { localStorage.setItem(`reels-saved:${user.id}`, JSON.stringify([...next])); } catch { /* storage optional */ }
    toast.success(next.has(id) ? "Saved on this device" : "Removed from saved posts");
  };
  const shareShort = async (short: Short) => {
    const url = `${window.location.origin}/shorts?post=${short.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "Sporty Codes", text: short.content || "Watch this on Sporty Codes", url });
      else { await navigator.clipboard.writeText(url); toast.success("Post link copied"); }
    } catch { /* sharing may be cancelled */ }
  };
  useEffect(() => {
    const postId = new URLSearchParams(window.location.search).get("post");
    const index = visibleShorts.findIndex(short => short.id === postId);
    if (index >= 0) { containerRef.current?.scrollTo({ top: index * containerRef.current.clientHeight }); setCurrentIndex(index); }
  }, [isLoading, feedMode, visibleShorts]);

  const handleVotePoll = async (shortId: string, optionIndex: number) => {
    if (!user) return;

    try {
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

      setShorts(prev => prev.map(s => {
        if (s.id === shortId && s.poll_options) {
          const newOptions = { ...s.poll_options };
          newOptions.options = newOptions.options.map((opt, i) => 
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

  const navigateToProfile = (userId: string) => {
    if (userId === user?.id) {
      navigate("/profile");
    } else {
      navigate(`/user/${userId}`);
    }
  };

  const currentShort = visibleShorts[currentIndex];

  if (isLoading) {
    return (
      <div className="reels-page h-dvh overflow-hidden relative" aria-busy="true" aria-label="Loading reels">
        <div className="relative max-w-xl mx-auto reel-slide bg-card overflow-hidden">
          <div className="absolute inset-0 reel-skeleton" />
          <div className="absolute top-5 left-1/2 -translate-x-1/2 flex gap-4"><div className="h-4 w-16 rounded bg-muted" /><div className="h-4 w-14 rounded bg-muted" /></div>
          <div className="absolute bottom-8 left-4 space-y-3"><div className="h-4 w-32 rounded bg-muted" /><div className="h-3 w-56 rounded bg-muted" /><div className="h-3 w-40 rounded bg-muted" /></div>
          <div className="absolute bottom-8 right-4 flex flex-col items-center gap-6"><div className="h-11 w-11 rounded-full bg-muted" />{[0, 1, 2, 3].map(i => <div key={i} className="h-8 w-8 rounded-full bg-muted" />)}</div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="reels-page h-dvh overflow-hidden relative">
      <div className="relative max-w-xl mx-auto">
        <header className="absolute top-0 left-0 right-0 z-20 px-4 pt-4 flex items-center justify-between pointer-events-none">
          <Button variant="ghost" size="icon" aria-label="Go back" className="pointer-events-auto text-foreground" onClick={() => navigate(-1)}><ChevronUp className="-rotate-90" /></Button>
          <div className="flex gap-4 pointer-events-auto">
            {([['following', 'Following'], ['for-you', 'For You']] as const).map(([mode, label]) => <Button key={mode} variant="ghost" className={`px-0 rounded-none text-foreground ${feedMode === mode ? "border-b-2 border-foreground font-bold" : "opacity-60"}`} onClick={() => { setFeedMode(mode); setCurrentIndex(0); containerRef.current?.scrollTo({ top: 0 }); }}>{label}</Button>)}
          </div>
          <Button variant="ghost" size="icon" aria-label="Create post" className="pointer-events-auto text-foreground" onClick={() => setCreateOpen(true)}><Plus /></Button>
        </header>
        <div ref={containerRef} className="reels-scroll snap-y snap-mandatory overflow-y-auto" onScroll={event => {
          const root = event.currentTarget;
          const index = Math.max(0, Math.min(visibleShorts.length - 1, Math.round(root.scrollTop / root.clientHeight)));
          if (index !== currentIndex) setCurrentIndex(index);
        }}>
          {visibleShorts.length === 0 ? <div className="reel-slide flex flex-col justify-center items-center px-6 text-center"><Video className="h-12 w-12 text-primary mb-4" /><h2 className="text-xl font-bold">{feedMode === "following" ? "No posts from people you follow" : "No posts yet"}</h2><Button className="mt-5" onClick={() => feedMode === "following" ? setFeedMode("for-you") : setCreateOpen(true)}>{feedMode === "following" ? "Explore For You" : "Create post"}</Button></div> : visibleShorts.map((short, index) => <article key={short.id} data-reel-id={short.id} className="reel-slide snap-start relative overflow-hidden">
            {Math.abs(index - currentIndex) <= 1 && <div className="absolute inset-0 flex items-center justify-center bg-background">
              {short.media_type === "video" && short.media_url ? <video
                ref={el => { if (el) videoRefs.current[short.id] = el; else delete videoRefs.current[short.id]; }}
                src={short.media_url} className="h-full w-full object-cover" loop muted={isMuted} playsInline preload="auto"
                onClick={() => togglePlayPause(short.id)} onWaiting={() => { if (index === currentIndex) setBuffering(true); }}
                onPlaying={() => { if (index === currentIndex) { setBuffering(false); setIsPlaying(true); } }}
                onError={() => { if (index === currentIndex) { setBuffering(false); setIsPlaying(false); } }}
                onTimeUpdate={event => { if (index === currentIndex) { const video = event.currentTarget; setProgress(video.duration ? video.currentTime / video.duration * 100 : 0); if (video.currentTime >= 3 || (video.duration && video.currentTime / video.duration >= 0.5)) markWatched(short.id); } }}
              /> : short.media_url ? <img src={short.media_url} alt={short.content || "Community post"} className="h-full w-full object-cover" loading={index === currentIndex ? "eager" : "lazy"} /> : <div className="bg-card w-full h-full flex items-center justify-center px-10"><p className="text-2xl font-bold text-center break-words">{short.content}</p></div>}
            </div>}
            <div className="absolute inset-0 reel-scrim pointer-events-none" />
            {short.poll_options && <div className="absolute inset-0 flex justify-center items-center px-7 pr-20"><div className="w-full space-y-3"><p className="font-bold text-xl mb-4">{short.content}</p>{short.poll_options.options.map((option, optionIndex) => {
              const total = short.poll_options.options.reduce((sum, item) => sum + item.votes, 0);
              return <Button key={optionIndex} variant="outline" className="w-full h-auto min-h-12 justify-between whitespace-normal bg-background/40 text-foreground" onClick={() => handleVotePoll(short.id, optionIndex)}><span className="text-left">{option.text}</span><span className="ml-2">{total ? Math.round(option.votes / total * 100) : 0}%</span></Button>;
            })}</div></div>}
            {index === currentIndex && short.media_type === "video" && (buffering || !isPlaying) && <Button variant="ghost" size="icon" aria-label={buffering ? "Video loading" : "Play video"} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-foreground bg-background/30 rounded-full" onClick={() => togglePlayPause(short.id)}>{buffering ? <div className="w-8 h-8 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> : <Play className="w-8 h-8 fill-current" />}</Button>}
            <div className="absolute bottom-7 left-4 right-20 reel-action">
              <Button variant="ghost" className="text-foreground px-0 h-auto font-bold text-base" onClick={() => navigateToProfile(short.user_id)}>@{short.profile?.username || short.profile?.display_name || "user"}</Button>
              {short.content && short.media_url && !short.poll_options && <p className="mt-2 text-sm line-clamp-3 break-words leading-relaxed">{short.content}</p>}
              <p className="mt-3 text-xs text-foreground/70">SPORTY CODES · Community</p>
            </div>
            <div className="absolute bottom-7 right-3 flex flex-col items-center gap-4 reel-action">
              <div className="relative mb-1"><Button variant="ghost" size="icon" aria-label="View creator profile" onClick={() => navigateToProfile(short.user_id)} className="w-11 h-11 p-0 rounded-full border-2 border-foreground overflow-hidden bg-card">{short.profile?.avatar_url ? <img src={short.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <span>{short.profile?.display_name?.[0] || "S"}</span>}</Button>{short.user_id !== user?.id && <Button size="icon" aria-label={short.is_following ? "Unfollow creator" : "Follow creator"} onClick={() => handleFollow(short.user_id)} className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full">{short.is_following ? <UserMinus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}</Button>}</div>
              <div className="text-center"><Button variant="ghost" size="icon" aria-label="Like post" onClick={() => handleLike(short.id)} className={`h-9 w-11 hover:bg-transparent ${short.is_liked ? "text-primary" : "text-foreground"}`}><Heart className={`w-8 h-8 ${short.is_liked ? "fill-current" : ""}`} /></Button><span className="block text-xs font-bold">{short.likes_count || 0}</span></div>
              <div className="text-center"><Button variant="ghost" size="icon" aria-label="Open comments" onClick={() => openComments(short.id)} className="h-9 w-11 text-foreground hover:bg-transparent"><MessageCircle className="w-8 h-8" /></Button><span className="block text-xs font-bold">{short.comments_count || 0}</span></div>
              <div className="text-center"><Button variant="ghost" size="icon" aria-label="Save post" onClick={() => saveShort(short.id)} className="h-9 w-11 text-foreground hover:bg-transparent"><Bookmark className={`w-7 h-7 ${savedIds.has(short.id) ? "fill-current" : ""}`} /></Button><span className="block text-[10px]">{savedIds.has(short.id) ? "Saved" : "Save"}</span></div>
              <div className="text-center"><Button variant="ghost" size="icon" aria-label="Share post" onClick={() => shareShort(short)} className="h-9 w-11 text-foreground hover:bg-transparent"><Share2 className="w-7 h-7" /></Button><span className="block text-[10px]">Share</span></div>
              {short.user_id === user?.id && <Button variant="ghost" size="icon" aria-label="Delete post" onClick={() => handleDeleteShort(short.id)} className="h-8 w-10 text-foreground"><Trash2 className="w-5 h-5" /></Button>}
            </div>
            {short.media_type === "video" && <><Button variant="ghost" size="icon" aria-label={isMuted ? "Unmute video" : "Mute video"} className="absolute top-20 right-3 text-foreground" onClick={() => setIsMuted(!isMuted)}>{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</Button><progress aria-label="Video progress" max={100} value={index === currentIndex ? progress : 0} className="absolute bottom-0 left-0 w-full h-0.5 accent-primary" /></>}
          </article>)}
        </div>
        <div className="hidden sm:flex absolute top-1/2 -right-16 flex-col gap-3"><Button variant="outline" size="icon" aria-label="Previous post" disabled={currentIndex === 0} onClick={() => handleScroll("up")}><ChevronUp /></Button><Button variant="outline" size="icon" aria-label="Next post" disabled={currentIndex >= visibleShorts.length - 1} onClick={() => handleScroll("down")}><ChevronDown /></Button></div>
      </div>

      {createOpen && user && <CreatePostSheet userId={user.id} onClose={() => setCreateOpen(false)} onPosted={() => { setCreateOpen(false); loadShorts(); }} />}

      {/* Comments Modal with Replies */}
      <Dialog open={commentsOpen} onOpenChange={(open) => { setCommentsOpen(open); if (!open) setReplyingTo(null); }}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-auto p-0 gap-0 max-h-[70vh] flex flex-col">
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-3" />
            <h3 className="text-lg font-bold text-foreground text-center">Comments</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
                  <div key={comment.id}>
                    {/* Main Comment */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => navigateToProfile(comment.user_id)}
                        className="w-10 h-10 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-sm font-bold text-primary overflow-hidden"
                      >
                        {comment.profile?.avatar_url ? (
                          <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          comment.profile?.display_name?.[0] || "?"
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{comment.profile?.display_name || "User"}</p>
                        <p className="text-sm text-foreground/80 break-words">{comment.content}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                          <button 
                            onClick={() => setReplyingTo(comment)}
                            className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                          >
                            <Reply className="w-3 h-3" />
                            Reply
                          </button>
                          {comment.user_id === user?.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id, null)}
                              className="text-xs text-destructive font-medium flex items-center gap-1 hover:underline"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-10 mt-3 space-y-3 border-l-2 border-border/50 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <button 
                              onClick={() => navigateToProfile(reply.user_id)}
                              className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-xs font-bold text-primary overflow-hidden"
                            >
                              {reply.profile?.avatar_url ? (
                                <img src={reply.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                reply.profile?.display_name?.[0] || "?"
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-foreground">{reply.profile?.display_name || "User"}</p>
                              <p className="text-xs text-foreground/80 break-words">{reply.content}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </p>
                                {reply.user_id === user?.id && (
                                  <button
                                    onClick={() => handleDeleteComment(reply.id, comment.id)}
                                    className="text-xs text-destructive font-medium flex items-center gap-1 hover:underline"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border flex-shrink-0 bg-card">
            {replyingTo && (
              <div className="flex items-center justify-between mb-2 px-2 py-1 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CornerDownRight className="w-3 h-3" />
                  Replying to {replyingTo.profile?.display_name}
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && postComment()}
                className="bg-secondary/50 border-border rounded-full"
              />
              <Button
                onClick={postComment}
                size="icon"
                className="rounded-full flex-shrink-0"
                disabled={!newComment.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Shorts;