import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  BellOff, 
  Wallet, 
  Clock, 
  UserPlus, 
  Heart, 
  MessageCircle, 
  Gift, 
  Flame,
  Save
} from "lucide-react";
import { subscribeToPushNotifications, unsubscribeFromPushNotifications, checkNotificationStatus } from "@/lib/pushNotifications";

interface NotificationPreferences {
  deposit_approved: boolean;
  withdrawal_completed: boolean;
  daily_tap_reminder: boolean;
  new_follower: boolean;
  post_likes: boolean;
  post_comments: boolean;
  referral_signup: boolean;
  streak_reminder: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  daily_tips_morning: boolean;
  daily_tips_afternoon: boolean;
  daily_tips_night: boolean;
}

const LEAGUES = [
  { id: "epl", label: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 English Premier League" },
  { id: "laliga", label: "🇪🇸 La Liga" },
  { id: "ucl", label: "🏆 Champions League" },
  { id: "seriea", label: "🇮🇹 Serie A" },
  { id: "bundesliga", label: "🇩🇪 Bundesliga" },
  { id: "ligue1", label: "🇫🇷 Ligue 1" },
  { id: "uel", label: "🏅 Europa League" },
];

interface NotificationSettingsProps {
  userId: string;
  userEmail: string;
}

const NotificationSettings = ({ userId, userEmail }: NotificationSettingsProps) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    deposit_approved: true,
    withdrawal_completed: true,
    daily_tap_reminder: true,
    new_follower: true,
    post_likes: true,
    post_comments: true,
    referral_signup: true,
    streak_reminder: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    daily_tips_morning: true,
    daily_tips_afternoon: true,
    daily_tips_night: true,
  });
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  useEffect(() => {
    loadPreferences();
    checkPushStatus();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setPreferences({
          deposit_approved: data.deposit_approved ?? true,
          withdrawal_completed: data.withdrawal_completed ?? true,
          daily_tap_reminder: data.daily_tap_reminder ?? true,
          new_follower: data.new_follower ?? true,
          post_likes: data.post_likes ?? true,
          post_comments: data.post_comments ?? true,
          referral_signup: data.referral_signup ?? true,
          streak_reminder: data.streak_reminder ?? true,
          quiet_hours_enabled: data.quiet_hours_enabled ?? false,
          quiet_hours_start: data.quiet_hours_start ?? "22:00",
          quiet_hours_end: data.quiet_hours_end ?? "07:00",
          daily_tips_morning: (data as any).daily_tips_morning ?? true,
          daily_tips_afternoon: (data as any).daily_tips_afternoon ?? true,
          daily_tips_night: (data as any).daily_tips_night ?? true,
        });
      }

      // Load league preferences from push_subscriptions
      const { data: subData } = await supabase
        .from("push_subscriptions")
        .select("preferred_leagues")
        .eq("user_email", userEmail)
        .maybeSingle();
      if (subData && (subData as any).preferred_leagues) {
        setSelectedLeagues((subData as any).preferred_leagues);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPushStatus = async () => {
    const status = await checkNotificationStatus(userEmail);
    setIsPushEnabled(status);
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] as any }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        } as any, { onConflict: "user_id" });

      if (error) throw error;

      // Save league preferences to push_subscriptions
      await supabase
        .from("push_subscriptions")
        .update({ preferred_leagues: selectedLeagues } as any)
        .eq("user_email", userEmail);

      toast.success("Preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLeague = (leagueId: string) => {
    setSelectedLeagues((prev) =>
      prev.includes(leagueId)
        ? prev.filter((l) => l !== leagueId)
        : [...prev, leagueId]
    );
  };

  const togglePushNotifications = async () => {
    setIsEnablingPush(true);
    try {
      if (isPushEnabled) {
        const success = await unsubscribeFromPushNotifications(userEmail);
        if (success) {
          setIsPushEnabled(false);
          toast.success("Push notifications disabled");
        }
      } else {
        const success = await subscribeToPushNotifications(userEmail);
        if (success) {
          setIsPushEnabled(true);
          toast.success("Push notifications enabled!");
        }
      }
    } catch (error) {
      toast.error("Failed to update push notifications");
    } finally {
      setIsEnablingPush(false);
    }
  };

  const notificationOptions = [
    { key: "deposit_approved", label: "Deposit Approved", icon: Wallet, description: "When your deposit is verified" },
    { key: "withdrawal_completed", label: "Withdrawal Completed", icon: Wallet, description: "When your withdrawal is processed" },
    { key: "daily_tap_reminder", label: "Daily Tap Reminder", icon: Clock, description: "Reminder to claim your daily earnings" },
    { key: "new_follower", label: "New Follower", icon: UserPlus, description: "When someone follows you" },
    { key: "post_likes", label: "Post Likes", icon: Heart, description: "When someone likes your post" },
    { key: "post_comments", label: "Post Comments", icon: MessageCircle, description: "When someone comments on your post" },
    { key: "referral_signup", label: "Referral Signup", icon: Gift, description: "When someone signs up with your code" },
    { key: "streak_reminder", label: "Streak Reminder", icon: Flame, description: "Don't lose your daily streak!" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notification Master Toggle */}
      <div className="bg-gradient-to-r from-primary/10 to-cyber-neon-purple/10 rounded-xl border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              {isPushEnabled ? (
                <Bell className="w-6 h-6 text-primary" />
              ) : (
                <BellOff className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-bold text-foreground">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                {isPushEnabled ? "Notifications are enabled" : "Enable to receive alerts"}
              </p>
            </div>
          </div>
          <Button
            onClick={togglePushNotifications}
            disabled={isEnablingPush}
            variant={isPushEnabled ? "outline" : "default"}
            className="rounded-xl"
          >
            {isEnablingPush ? "..." : isPushEnabled ? "Disable" : "Enable"}
          </Button>
        </div>
      </div>

      {/* Daily Tips Schedule */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          ⚽ Daily Sure Tips Schedule
        </h4>
        {[
          { key: "daily_tips_morning", label: "☀️ Morning Alert (7:30 AM)", description: "Best predictions & key matches" },
          { key: "daily_tips_afternoon", label: "⚽ Afternoon Update (2:30 PM)", description: "Live updates & confirmed tips" },
          { key: "daily_tips_night", label: "🌙 Night Recap (10:30 PM)", description: "Results & tomorrow's teaser" },
        ].map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-bet-warning/5 rounded-xl border border-primary/20"
          >
            <div>
              <p className="font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={!!preferences[key as keyof NotificationPreferences]}
              onCheckedChange={() => handleToggle(key as keyof NotificationPreferences)}
              disabled={!isPushEnabled}
            />
          </div>
        ))}
      </div>

      {/* Preferred Leagues */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          🏟️ Preferred Leagues
        </h4>
        <p className="text-xs text-muted-foreground">Select leagues you want tips for (all if none selected)</p>
        <div className="flex flex-wrap gap-2">
          {LEAGUES.map((league) => (
            <button
              key={league.id}
              onClick={() => toggleLeague(league.id)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedLeagues.includes(league.id)
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-card/60 border-border/30 text-muted-foreground hover:border-primary/30"
              }`}
            >
              {league.label}
            </button>
          ))}
        </div>
      </div>

      {/* Individual Preferences */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Other Notification Types
        </h4>
        
        {notificationOptions.map(({ key, label, icon: Icon, description }) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-card/60 rounded-xl border border-border/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={!!preferences[key as keyof NotificationPreferences]}
              onCheckedChange={() => handleToggle(key as keyof NotificationPreferences)}
              disabled={!isPushEnabled}
            />
          </div>
        ))}
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Quiet Hours
        </h4>
        <div className="p-3 bg-card/60 rounded-xl border border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Enable Quiet Hours</p>
                <p className="text-xs text-muted-foreground">No notifications during set times</p>
              </div>
            </div>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={() => setPreferences(prev => ({ ...prev, quiet_hours_enabled: !prev.quiet_hours_enabled }))}
            />
          </div>
          {preferences.quiet_hours_enabled && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => setPreferences(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
                  className="w-full h-9 px-2 bg-background border border-border rounded-lg text-foreground text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => setPreferences(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
                  className="w-full h-9 px-2 bg-background border border-border rounded-lg text-foreground text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={savePreferences}
        disabled={isSaving}
        className="w-full rounded-xl h-12"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
};

export default NotificationSettings;