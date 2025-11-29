import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, X } from "lucide-react";
import { subscribeToPushNotifications, checkNotificationStatus } from "@/lib/pushNotifications";

interface NotificationPromptProps {
  userEmail: string;
}

export const NotificationPrompt = ({ userEmail }: NotificationPromptProps) => {
  const [show, setShow] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      if (!userEmail) return;
      
      const subscribed = await checkNotificationStatus(userEmail);
      setIsSubscribed(subscribed);
      
      // Show prompt every time if not subscribed - keep bothering until enabled!
      if (!subscribed) {
        setShow(true);
      }
    };

    checkStatus();
  }, [userEmail]);

  const handleEnable = async () => {
    const success = await subscribeToPushNotifications(userEmail);
    if (success) {
      setIsSubscribed(true);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    // Just hide for now - will show again on next page load
    setShow(false);
  };

  if (!show || isSubscribed) return null;

  return (
    <Card className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border-2 border-primary shadow-lg z-50 animate-fade-in p-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-foreground mb-1">Get Instant Updates!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Enable notifications to receive alerts when new odds are available or your payments are approved.
          </p>

          <div className="flex gap-2">
            <Button
              onClick={handleEnable}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              size="sm"
            >
              Enable Notifications
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
