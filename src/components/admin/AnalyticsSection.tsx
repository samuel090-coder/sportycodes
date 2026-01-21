import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Wallet, 
  Trophy, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  CreditCard,
  MessageSquare,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsData {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalPools: number;
  activePools: number;
  totalBets: number;
  totalPrizeDistributed: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  todayNewUsers: number;
  weeklyActiveUsers: number;
  totalShorts: number;
}

export const AnalyticsSection = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [
        profilesRes,
        depositsRes,
        withdrawalsRes,
        poolsRes,
        entriesRes,
        shortsRes,
        pendingDepositsRes,
        pendingWithdrawalsRes
      ] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("deposit_requests").select("amount, status"),
        supabase.from("withdrawal_requests").select("amount, status"),
        supabase.from("betting_pools").select("id, status, prize_pool"),
        supabase.from("betting_entries").select("id, payout, is_winner"),
        supabase.from("shorts").select("id").eq("is_active", true),
        supabase.from("deposit_requests").select("id").eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id").eq("status", "pending")
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const profiles = profilesRes.data || [];
      const deposits = depositsRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const pools = poolsRes.data || [];
      const entries = entriesRes.data || [];

      const todayNewUsers = profiles.filter(p => 
        new Date(p.created_at) >= today
      ).length;

      const totalDeposits = deposits
        .filter(d => d.status === "approved")
        .reduce((sum, d) => sum + Number(d.amount), 0);

      const totalWithdrawals = withdrawals
        .filter(w => w.status === "approved")
        .reduce((sum, w) => sum + Number(w.amount), 0);

      const totalPrizeDistributed = entries
        .filter(e => e.is_winner && e.payout)
        .reduce((sum, e) => sum + Number(e.payout), 0);

      setAnalytics({
        totalUsers: profiles.length,
        totalDeposits,
        totalWithdrawals,
        totalPools: pools.length,
        activePools: pools.filter(p => p.status === "open").length,
        totalBets: entries.length,
        totalPrizeDistributed,
        pendingDeposits: pendingDepositsRes.data?.length || 0,
        pendingWithdrawals: pendingWithdrawalsRes.data?.length || 0,
        todayNewUsers,
        weeklyActiveUsers: profiles.filter(p => 
          new Date(p.created_at) >= weekAgo
        ).length,
        totalShorts: shortsRes.data?.length || 0
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Total Users",
      value: analytics?.totalUsers.toLocaleString() || "0",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      change: `+${analytics?.todayNewUsers || 0} today`
    },
    {
      label: "Total Deposits",
      value: `₦${(analytics?.totalDeposits || 0).toLocaleString()}`,
      icon: ArrowUpRight,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      change: `${analytics?.pendingDeposits || 0} pending`
    },
    {
      label: "Total Withdrawals",
      value: `₦${(analytics?.totalWithdrawals || 0).toLocaleString()}`,
      icon: ArrowDownRight,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      change: `${analytics?.pendingWithdrawals || 0} pending`
    },
    {
      label: "Active Pools",
      value: analytics?.activePools.toLocaleString() || "0",
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      change: `${analytics?.totalPools || 0} total`
    },
    {
      label: "Total Bets",
      value: analytics?.totalBets.toLocaleString() || "0",
      icon: Target,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      change: "All time"
    },
    {
      label: "Prize Distributed",
      value: `₦${(analytics?.totalPrizeDistributed || 0).toLocaleString()}`,
      icon: Wallet,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
      change: "To winners"
    },
    {
      label: "Active Content",
      value: analytics?.totalShorts.toLocaleString() || "0",
      icon: MessageSquare,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      change: "Shorts posts"
    },
    {
      label: "Weekly Signups",
      value: analytics?.weeklyActiveUsers.toLocaleString() || "0",
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      change: "Last 7 days"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Platform Analytics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="relative group overflow-hidden rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20 border border-border p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.bgColor} blur-2xl opacity-50`} />
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30 p-4">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-5 h-5 text-green-500" />
            <span className="font-bold text-foreground">Pending Deposits</span>
          </div>
          <p className="text-3xl font-black text-green-500">
            {analytics?.pendingDeposits || 0}
          </p>
          <p className="text-sm text-muted-foreground">Awaiting approval</p>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="w-5 h-5 text-red-500" />
            <span className="font-bold text-foreground">Pending Withdrawals</span>
          </div>
          <p className="text-3xl font-black text-red-500">
            {analytics?.pendingWithdrawals || 0}
          </p>
          <p className="text-sm text-muted-foreground">Awaiting processing</p>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-foreground">Active Pools</span>
          </div>
          <p className="text-3xl font-black text-yellow-500">
            {analytics?.activePools || 0}
          </p>
          <p className="text-sm text-muted-foreground">Currently open</p>
        </Card>
      </div>
    </div>
  );
};
