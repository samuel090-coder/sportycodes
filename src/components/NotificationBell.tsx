import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
  iconClassName?: string;
}

/** Entry point to the per-user notification center. */
const NotificationBell = ({ className, iconClassName }: NotificationBellProps) => {
  const navigate = useNavigate();
  const { unreadCount, userId } = useNotifications();

  if (!userId) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
      onClick={() => navigate("/notifications")}
      className={cn("relative rounded-xl", className)}
    >
      <Bell className={cn("w-5 h-5", iconClassName)} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default NotificationBell;
