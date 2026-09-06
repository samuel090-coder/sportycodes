import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  ChevronLeft,
  CheckCheck,
  Crown,
  Wallet,
  Heart,
  MessageCircle,
  Reply,
  UserPlus,
  Megaphone,
  Trash2,
  Trophy,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

const CATEGORY_META: Record<string, { icon: any; label: string; tint: string }> = {
  vip: { icon: Crown, label: "VIP", tint: "text-bet-warning bg-bet-warning/10" },
  payment: { icon: Wallet, label: "Payments", tint: "text-primary bg-primary/10" },
  like: { icon: Heart, label: "Likes", tint: "text-destructive bg-destructive/10" },
  comment: { icon: MessageCircle, label: "Comments", tint: "text-primary bg-primary/10" },
  reply: { icon: Reply, label: "Replies", tint: "text-primary bg-primary/10" },
  follow: { icon: UserPlus, label: "Followers", tint: "text-cyber-neon-cyan bg-cyber-neon-cyan/10" },
  announcement: { icon: Megaphone, label: "Announcement", tint: "text-bet-warning bg-bet-warning/10" },
  odds: { icon: Trophy, label: "Predictions", tint: "text-bet-win bg-bet-win/10" },
  general: { icon: Bell, label: "Update", tint: "text-muted-foreground bg-muted" },
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, userId, markAsRead, markAllAsRead, remove } =
    useNotifications();

  const open = async (n: AppNotification) => {
    if (!n.is_read) await markAsRead(n.id);
    if (n.url) navigate(n.url);
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
              </h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="rounded-xl gap-1">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-3">
        {!userId ? (
          <Card className="p-8 text-center space-y-4">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Sign in to see your notifications.</p>
            <Button onClick={() => navigate("/auth")} className="rounded-xl">
              Sign in
            </Button>
          </Card>
        ) : loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card className="p-10 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-bold text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Payment updates, VIP reminders and post activity will show up here.
            </p>
          </Card>
        ) : (
          notifications.map((n) => {
            const meta = CATEGORY_META[n.category] ?? CATEGORY_META.general;
            const Icon = meta.icon;
            return (
              <Card
                key={n.id}
                onClick={() => open(n)}
                className={`p-4 flex gap-3 items-start cursor-pointer transition-colors ${
                  n.is_read ? "bg-card" : "bg-primary/5 border-primary/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground text-sm truncate">{n.title}</p>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                  {n.image_url && (
                    <img
                      src={n.image_url}
                      alt=""
                      loading="lazy"
                      className="mt-2 rounded-xl max-h-40 w-full object-cover"
                    />
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">• {timeAgo(n.created_at)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete notification"
                  className="rounded-xl shrink-0 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Notifications;
