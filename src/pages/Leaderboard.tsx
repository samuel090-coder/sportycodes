import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  Medal, 
  Crown, 
  Flame, 
  TrendingUp, 
  Users,
  ChevronLeft,
  Zap,
  Star
} from "lucide-react";
import BottomNav from "@/components/BottomNav";

interface LeaderboardEntry {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  total_earned: number;
  weekly_earnings: number;
  weekly_taps: number;
  current_streak: number;
  longest_streak: number;
  followers_count: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"total" | "weekly" | "streaks">("total");
  const [userRank, setUserRank] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .limit(100);

      if (error) throw error;
      setLeaderboard(data || []);

      // Find current user's rank
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const rank = data?.findIndex(e => e.id === session.user.id);
        setUserRank(rank !== undefined && rank >= 0 ? rank + 1 : null);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSortedLeaderboard = () => {
    switch (activeTab) {
      case "weekly":
        return [...leaderboard].sort((a, b) => (b.weekly_earnings || 0) - (a.weekly_earnings || 0));
      case "streaks":
        return [...leaderboard].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
      default:
        return [...leaderboard].sort((a, b) => (b.total_earned || 0) - (a.total_earned || 0));
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Crown className="w-5 h-5 text-white" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-600/30">
            <Medal className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-bold text-foreground">{rank}</span>
          </div>
        );
    }
  };

  const getStatValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case "weekly":
        return `₦${(entry.weekly_earnings || 0).toFixed(2)}`;
      case "streaks":
        return `${entry.current_streak || 0} days`;
      default:
        return `₦${(entry.total_earned || 0).toFixed(2)}`;
    }
  };

  const sortedLeaderboard = getSortedLeaderboard();
  const topThree = sortedLeaderboard.slice(0, 3);
  const restOfList = sortedLeaderboard.slice(3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with animated background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-cyber-neon-purple/10 to-cyber-neon-cyan/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/10 blur-3xl" />
        
        <header className="relative z-10 px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="rounded-xl text-foreground"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              LEADERBOARD
            </h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Tab Selection */}
        <div className="relative z-10 px-4 py-4">
          <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl">
            {[
              { key: "total", label: "All Time", icon: TrendingUp },
              { key: "weekly", label: "This Week", icon: Zap },
              { key: "streaks", label: "Streaks", icon: Flame },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="relative z-10 px-4 pb-8">
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <div className="relative mb-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 p-1">
                    <div className="w-full h-full rounded-full bg-card overflow-hidden">
                      {topThree[1].avatar_url ? (
                        <img src={topThree[1].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-400/20 flex items-center justify-center text-xl font-bold text-gray-400">
                          {topThree[1].display_name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-black text-lg shadow-lg">
                    2
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground text-center truncate max-w-[80px]">
                  {topThree[1].display_name}
                </p>
                <p className="text-sm font-black text-gray-400">{getStatValue(topThree[1])}</p>
                <div className="w-20 h-20 bg-gradient-to-t from-gray-400/20 to-gray-400/5 rounded-t-xl mt-2" />
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="relative mb-2">
                  <Crown className="w-8 h-8 text-yellow-500 absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-1 shadow-xl shadow-yellow-500/30">
                    <div className="w-full h-full rounded-full bg-card overflow-hidden">
                      {topThree[0].avatar_url ? (
                        <img src={topThree[0].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-yellow-500/20 flex items-center justify-center text-2xl font-bold text-yellow-500">
                          {topThree[0].display_name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                    1
                  </div>
                </div>
                <p className="text-base font-bold text-foreground text-center truncate max-w-[100px]">
                  {topThree[0].display_name}
                </p>
                <p className="text-lg font-black text-yellow-500">{getStatValue(topThree[0])}</p>
                <div className="w-24 h-28 bg-gradient-to-t from-yellow-500/20 to-yellow-500/5 rounded-t-xl mt-2" />
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="relative mb-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 p-1">
                    <div className="w-full h-full rounded-full bg-card overflow-hidden">
                      {topThree[2].avatar_url ? (
                        <img src={topThree[2].avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-amber-700/20 flex items-center justify-center text-xl font-bold text-amber-700">
                          {topThree[2].display_name?.[0] || "?"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-white font-black text-lg shadow-lg">
                    3
                  </div>
                </div>
                <p className="text-sm font-bold text-foreground text-center truncate max-w-[80px]">
                  {topThree[2].display_name}
                </p>
                <p className="text-sm font-black text-amber-700">{getStatValue(topThree[2])}</p>
                <div className="w-20 h-16 bg-gradient-to-t from-amber-700/20 to-amber-700/5 rounded-t-xl mt-2" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your Rank Card */}
      {userRank && currentUserId && (
        <div className="mx-4 mb-4">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-cyber-neon-purple to-cyber-neon-cyan rounded-2xl blur opacity-30" />
            <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-2xl font-black text-foreground">#{userRank}</p>
              </div>
              <Button 
                onClick={() => navigate("/tap")}
                className="rounded-xl"
              >
                <Zap className="w-4 h-4 mr-1" />
                Earn More
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="px-4">
        <div className="space-y-2">
          {restOfList.map((entry, index) => {
            const rank = index + 4;
            const isCurrentUser = entry.id === currentUserId;
            
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isCurrentUser
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card/60 border border-border/30 hover:border-primary/30"
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {getRankIcon(rank)}
                
                <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden">
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {entry.display_name?.[0] || "?"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{entry.display_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {entry.followers_count || 0}
                    </span>
                    {entry.current_streak > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <Flame className="w-3 h-3" />
                        {entry.current_streak}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-black ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                    {getStatValue(entry)}
                  </p>
                  {activeTab === "weekly" && entry.weekly_taps > 0 && (
                    <p className="text-xs text-muted-foreground">{entry.weekly_taps} taps</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-bold text-foreground">No rankings yet</p>
            <p className="text-muted-foreground">Start earning to appear on the leaderboard!</p>
            <Button onClick={() => navigate("/tap")} className="mt-4 rounded-xl">
              Start Earning
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;