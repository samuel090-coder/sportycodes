import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Radio,
  MessageSquare,
  CreditCard,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface MonthBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
  messages: number;
  payments: number;
  volume: number;
}

interface UsageData {
  totalSignups: number;
  signupsToday: number;
  signups30d: number;
  active24h: number;
  active7d: number;
  active30d: number;
  months: MonthBucket[];
  messages30d: number;
  payments30d: number;
  volume30d: number;
}

const buildMonths = (count: number): MonthBucket[] => {
  const now = new Date();
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    out.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleString("en-US", { month: "short" }),
      start,
      end,
      messages: 0,
      payments: 0,
      volume: 0,
    });
  }
  return out;
};

export const UsageSection = () => {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState(0);
  const [authedConnections, setAuthedConnections] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const months = buildMonths(6);
      const windowStart = months[0].start.toISOString();

      const since = (days: number) =>
        new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const day1 = since(1);
      const day7 = since(7);
      const day30 = since(30);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const [
        profilesRes,
        roomMsgRes,
        supportMsgRes,
        shortsRes,
        depositsRes,
        withdrawalsRes,
        tapsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase
          .from("room_messages")
          .select("user_id, created_at")
          .gte("created_at", windowStart),
        supabase
          .from("support_messages")
          .select("sender_id, created_at")
          .gte("created_at", windowStart),
        supabase
          .from("shorts")
          .select("user_id, created_at")
          .gte("created_at", windowStart),
        supabase
          .from("deposit_requests")
          .select("user_id, amount, status, created_at")
          .gte("created_at", windowStart),
        supabase
          .from("withdrawal_requests")
          .select("user_id, amount, status, created_at")
          .gte("created_at", windowStart),
        supabase
          .from("daily_taps")
          .select("user_id, tap_date")
          .gte("tap_date", day30.toISOString().slice(0, 10)),
      ]);

      const profiles = profilesRes.data || [];
      const roomMsgs = roomMsgRes.data || [];
      const supportMsgs = supportMsgRes.data || [];
      const shorts = shortsRes.data || [];
      const deposits = depositsRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const taps = tapsRes.data || [];

      const a24 = new Set<string>();
      const a7 = new Set<string>();
      const a30 = new Set<string>();

      const mark = (userId: string | null | undefined, at: Date) => {
        if (!userId) return;
        if (at >= day30) a30.add(userId);
        if (at >= day7) a7.add(userId);
        if (at >= day1) a24.add(userId);
      };

      roomMsgs.forEach((m: any) => mark(m.user_id, new Date(m.created_at)));
      supportMsgs.forEach((m: any) => mark(m.sender_id, new Date(m.created_at)));
      shorts.forEach((s: any) => mark(s.user_id, new Date(s.created_at)));
      deposits.forEach((d: any) => mark(d.user_id, new Date(d.created_at)));
      withdrawals.forEach((w: any) => mark(w.user_id, new Date(w.created_at)));
      taps.forEach((t: any) => mark(t.user_id, new Date(`${t.tap_date}T12:00:00`)));

      const bucketFor = (at: Date) =>
        months.find((m) => at >= m.start && at < m.end);

      [...roomMsgs, ...supportMsgs].forEach((m: any) => {
        const b = bucketFor(new Date(m.created_at));
        if (b) b.messages += 1;
      });

      [...deposits, ...withdrawals].forEach((p: any) => {
        const b = bucketFor(new Date(p.created_at));
        if (!b) return;
        b.payments += 1;
        if (p.status === "approved") b.volume += Number(p.amount) || 0;
      });

      const inLast30 = (iso: string) => new Date(iso) >= day30;
      const messages30d =
        roomMsgs.filter((m: any) => inLast30(m.created_at)).length +
        supportMsgs.filter((m: any) => inLast30(m.created_at)).length;
      const recentPayments = [...deposits, ...withdrawals].filter((p: any) =>
        inLast30(p.created_at)
      );

      setData({
        totalSignups: profiles.length,
        signupsToday: profiles.filter(
          (p: any) => new Date(p.created_at) >= todayStart
        ).length,
        signups30d: profiles.filter((p: any) => new Date(p.created_at) >= day30)
          .length,
        active24h: a24.size,
        active7d: a7.size,
        active30d: a30.size,
        months,
        messages30d,
        payments30d: recentPayments.length,
        volume30d: recentPayments
          .filter((p: any) => p.status === "approved")
          .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
      });
    } catch (e) {
      console.error("Error fetching usage data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  // Live realtime connection counter via presence
  useEffect(() => {
    const channel = supabase.channel("global-presence", {
      config: { presence: { key: `admin-${Math.random().toString(36).slice(2, 8)}` } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const entries = Object.values(state).flat();
      setConnections(entries.length);
      setAuthedConnections(entries.filter((e: any) => e?.user_id).length);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ admin: true, online_at: new Date().toISOString() });
          sync();
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const chartData = useMemo(
    () =>
      (data?.months || []).map((m) => ({
        name: m.label,
        Messages: m.messages,
        Payments: m.payments,
      })),
    [data]
  );

  const volumeData = useMemo(
    () =>
      (data?.months || []).map((m) => ({
        name: m.label,
        Volume: Math.round(m.volume),
      })),
    [data]
  );

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
      label: "Total Sign-ups",
      value: (data?.totalSignups || 0).toLocaleString(),
      sub: `+${data?.signupsToday || 0} today`,
      icon: UserPlus,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "New (30 days)",
      value: (data?.signups30d || 0).toLocaleString(),
      sub: "Recent growth",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Active Users (24h)",
      value: (data?.active24h || 0).toLocaleString(),
      sub: `${data?.active7d || 0} weekly · ${data?.active30d || 0} monthly`,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Realtime Connections",
      value: connections.toLocaleString(),
      sub: `${authedConnections} signed in · live`,
      icon: Radio,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      label: "Messages (30 days)",
      value: (data?.messages30d || 0).toLocaleString(),
      sub: "Rooms + support",
      icon: MessageSquare,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      label: "Payments (30 days)",
      value: (data?.payments30d || 0).toLocaleString(),
      sub: "Deposits + withdrawals",
      icon: CreditCard,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      label: "Approved Volume (30d)",
      value: `₦${Math.round(data?.volume30d || 0).toLocaleString()}`,
      sub: "Processed value",
      icon: TrendingUp,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      label: "Msgs / Active User",
      value:
        data && data.active30d > 0
          ? (data.messages30d / data.active30d).toFixed(1)
          : "0",
      sub: "Last 30 days",
      icon: Activity_,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Usage Dashboard
          </h3>
          <Button variant="outline" size="sm" onClick={fetchUsage}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-secondary/50 to-secondary/20 border border-border p-4 hover:border-primary/50 transition-all"
            >
              <div className={`inline-flex p-2 rounded-lg mb-3 ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1 break-all">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              <div
                className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.bgColor} blur-2xl opacity-50`}
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <h4 className="font-bold text-foreground mb-4">
            Monthly message & payment volume
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Legend />
                <Bar dataKey="Messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Payments" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <h4 className="font-bold text-foreground mb-4">
            Approved payment value per month (₦)
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Small alias so the stats array can reference an activity icon
function Activity_(props: React.ComponentProps<typeof MessageSquare>) {
  return <MessageSquare {...props} />;
}
