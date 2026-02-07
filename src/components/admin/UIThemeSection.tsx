import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Palette, Moon, Sun, Sparkles, Volume2, 
  VolumeX, Bell, BellOff, Save, Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const UIThemeSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [themeSettings, setThemeSettings] = useState({
    default_mode: "dark",
    auto_switch_time: true
  });

  const [animationSettings, setAnimationSettings] = useState({
    transitions: true,
    success_animations: true,
    loading_skeletons: true,
    parallax_effects: true,
    floating_elements: true,
    particle_effects: true
  });

  const [soundSettings, setSoundSettings] = useState({
    in_app_sounds: true,
    notification_sound: true,
    vibration: true
  });

  const [notificationSettings, setNotificationSettings] = useState({
    quiet_hours_start: "22:00",
    quiet_hours_end: "07:00",
    per_type_toggles: true,
    priority_levels: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ui_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["theme", "animations", "sounds", "notifications"]);

      if (error) throw error;

      if (data) {
        data.forEach((item) => {
          if (item.setting_key === "theme") {
            setThemeSettings(item.setting_value as typeof themeSettings);
          } else if (item.setting_key === "animations") {
            setAnimationSettings(item.setting_value as typeof animationSettings);
          } else if (item.setting_key === "sounds") {
            setSoundSettings(item.setting_value as typeof soundSettings);
          } else if (item.setting_key === "notifications") {
            setNotificationSettings(item.setting_value as typeof notificationSettings);
          }
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load UI settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { setting_key: "theme", setting_value: themeSettings },
        { setting_key: "animations", setting_value: animationSettings },
        { setting_key: "sounds", setting_value: soundSettings },
        { setting_key: "notifications", setting_value: notificationSettings }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("ui_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("UI settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Theme Settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control the default theme and auto-switching behavior.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-primary" />
              <div>
                <Label className="text-foreground">Default Theme Mode</Label>
                <p className="text-xs text-muted-foreground">Set the default theme for new users</p>
              </div>
            </div>
            <select
              value={themeSettings.default_mode}
              onChange={(e) => setThemeSettings(prev => ({ ...prev, default_mode: e.target.value }))}
              className="h-10 px-3 rounded-md border border-border bg-background text-foreground"
            >
              <option value="dark">Dark Mode</option>
              <option value="light">Light Mode</option>
              <option value="system">System Default</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-yellow-500" />
              <div>
                <Label className="text-foreground">Auto-Switch Based on Time</Label>
                <p className="text-xs text-muted-foreground">Automatically switch to light mode during day</p>
              </div>
            </div>
            <Switch
              checked={themeSettings.auto_switch_time}
              onCheckedChange={(checked) => setThemeSettings(prev => ({ ...prev, auto_switch_time: checked }))}
            />
          </div>
        </div>
      </Card>

      {/* Animation Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          Animation Settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control animations and visual effects across the app.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: "transitions", label: "Page Transitions", desc: "Animated page transitions" },
            { key: "success_animations", label: "Success Animations", desc: "Celebrations on wins" },
            { key: "loading_skeletons", label: "Loading Skeletons", desc: "Skeleton placeholders" },
            { key: "parallax_effects", label: "Parallax Effects", desc: "Scroll depth effects" },
            { key: "floating_elements", label: "Floating Elements", desc: "Floating decorations" },
            { key: "particle_effects", label: "Particle Effects", desc: "Confetti and particles" }
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <div>
                <Label className="text-foreground">{item.label}</Label>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={animationSettings[item.key as keyof typeof animationSettings]}
                onCheckedChange={(checked) => 
                  setAnimationSettings(prev => ({ ...prev, [item.key]: checked }))
                }
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Sound Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-green-500" />
          Sound & Haptics
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control sound effects and vibration feedback.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5" />
              <div>
                <Label className="text-foreground">In-App Sound Effects</Label>
                <p className="text-xs text-muted-foreground">Tap sounds, coin sounds, etc.</p>
              </div>
            </div>
            <Switch
              checked={soundSettings.in_app_sounds}
              onCheckedChange={(checked) => setSoundSettings(prev => ({ ...prev, in_app_sounds: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" />
              <div>
                <Label className="text-foreground">Notification Sounds</Label>
                <p className="text-xs text-muted-foreground">Sound for push notifications</p>
              </div>
            </div>
            <Switch
              checked={soundSettings.notification_sound}
              onCheckedChange={(checked) => setSoundSettings(prev => ({ ...prev, notification_sound: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <div>
                <Label className="text-foreground">Vibration Feedback</Label>
                <p className="text-xs text-muted-foreground">Haptic feedback on actions</p>
              </div>
            </div>
            <Switch
              checked={soundSettings.vibration}
              onCheckedChange={(checked) => setSoundSettings(prev => ({ ...prev, vibration: checked }))}
            />
          </div>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <BellOff className="w-5 h-5 text-orange-500" />
          Quiet Hours Settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set default quiet hours when notifications are silenced.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Quiet Hours Start
            </Label>
            <Input
              type="time"
              value={notificationSettings.quiet_hours_start}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, quiet_hours_start: e.target.value }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Quiet Hours End
            </Label>
            <Input
              type="time"
              value={notificationSettings.quiet_hours_end}
              onChange={(e) => setNotificationSettings(prev => ({ ...prev, quiet_hours_end: e.target.value }))}
              className="bg-background border-border"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div>
              <Label className="text-foreground">Per-Type Toggles</Label>
              <p className="text-xs text-muted-foreground">Allow users to control each notification type</p>
            </div>
            <Switch
              checked={notificationSettings.per_type_toggles}
              onCheckedChange={(checked) => 
                setNotificationSettings(prev => ({ ...prev, per_type_toggles: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div>
              <Label className="text-foreground">Priority Levels</Label>
              <p className="text-xs text-muted-foreground">Enable high/normal/low priority for notifications</p>
            </div>
            <Switch
              checked={notificationSettings.priority_levels}
              onCheckedChange={(checked) => 
                setNotificationSettings(prev => ({ ...prev, priority_levels: checked }))
              }
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90"
        size="lg"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save UI & Theme Settings
          </span>
        )}
      </Button>
    </div>
  );
};
