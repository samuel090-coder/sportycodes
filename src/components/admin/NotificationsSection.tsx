import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bell, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const NotificationsSection = () => {
  const [testNotifTitle, setTestNotifTitle] = useState("🎯 Test Notification");
  const [testNotifBody, setTestNotifBody] = useState(
    "This is a test push notification from SPORTY CODES admin panel!"
  );
  const [testNotifEmail, setTestNotifEmail] = useState("");
  const [sendingTestNotif, setSendingTestNotif] = useState(false);

  const handleTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!testNotifEmail) {
      toast.error("Please enter a user email");
      return;
    }

    setSendingTestNotif(true);
    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          title: testNotifTitle,
          body: testNotifBody,
          userEmail: testNotifEmail,
        },
      });

      if (error) throw error;

      toast.success("Test notification sent successfully!");
      setTestNotifEmail("");
    } catch (error: any) {
      console.error("Error sending test notification:", error);
      toast.error(error.message || "Failed to send test notification");
    } finally {
      setSendingTestNotif(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-6">
        <h3 className="text-2xl font-black text-cyber-neon-purple mb-6 font-mono flex items-center gap-2">
          <Bell className="w-6 h-6 animate-neon-pulse" />
          TEST PUSH NOTIFICATIONS
        </h3>

        <form onSubmit={handleTestNotification} className="space-y-4">
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">NOTIFICATION TITLE</Label>
            <Input
              value={testNotifTitle}
              onChange={(e) => setTestNotifTitle(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
              placeholder="e.g., 🎯 New Sure Odds Available"
              required
            />
          </div>

          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">NOTIFICATION BODY</Label>
            <Textarea
              value={testNotifBody}
              onChange={(e) => setTestNotifBody(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono min-h-[100px]"
              placeholder="Message content..."
              required
            />
          </div>

          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">USER EMAIL (TEST TARGET)</Label>
            <Input
              type="email"
              value={testNotifEmail}
              onChange={(e) => setTestNotifEmail(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
              placeholder="user@example.com"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={sendingTestNotif}
            className="w-full bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
          >
            {sendingTestNotif ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                SENDING...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                SEND TEST NOTIFICATION
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-cyber-neon-cyan/10 border border-cyber-neon-cyan/30 rounded-lg">
          <p className="text-xs text-cyber-neon-cyan/80 font-mono">
            💡 <strong>TIP:</strong> Make sure the user has enabled notifications and is subscribed to receive push
            notifications.
          </p>
        </div>
      </Card>
    </div>
  );
};
