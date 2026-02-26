import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import {
  subscribeToPushNotifications,
  checkNotificationStatus,
} from "@/lib/pushNotifications";
import { toast } from "sonner";

interface DailyTipsSubscribeProps {
  userEmail: string;
  variant?: "banner" | "inline";
}

const DailyTipsSubscribe = ({
  userEmail,
  variant = "banner",
}: DailyTipsSubscribeProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!userEmail) return;
    checkNotificationStatus(userEmail).then((status) => {
      setIsSubscribed(status);
      setChecking(false);
    });
  }, [userEmail]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    const success = await subscribeToPushNotifications(userEmail);
    if (success) {
      setIsSubscribed(true);
      toast.success("🎉 You're in! Daily sure tips coming to your phone.");
    }
    setIsLoading(false);
  };

  if (checking) return null;

  if (isSubscribed) {
    if (variant === "inline") return null;
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-bet-success/10 border border-bet-success/20 rounded-2xl">
        <CheckCircle2 className="w-5 h-5 text-bet-success flex-shrink-0" />
        <p className="text-sm text-bet-success font-medium">
          ✅ Daily tips notifications active
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Button
        onClick={handleSubscribe}
        disabled={isLoading}
        size="sm"
        className="bg-gradient-to-r from-primary to-bet-warning text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/30"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-1" />
        ) : (
          <Bell className="w-4 h-4 mr-1" />
        )}
        🔔 Get Tips
      </Button>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={isLoading}
      className="w-full relative overflow-hidden bg-gradient-to-r from-primary via-bet-warning to-primary rounded-2xl p-4 shadow-xl shadow-primary/20 border border-primary/30 group transition-all hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]"
    >
      {/* Animated shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      <div className="relative flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Bell className="w-6 h-6 text-white animate-bounce" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-white font-black text-base leading-tight">
            🔔 Get Daily Sure Tips – Free
          </p>
          <p className="text-white/80 text-xs mt-0.5">
            3x daily alerts: Morning picks • Live updates • Night recap
          </p>
        </div>
      </div>
    </button>
  );
};

export default DailyTipsSubscribe;
