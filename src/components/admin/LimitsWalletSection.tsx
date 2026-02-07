import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Wallet, TrendingUp, TrendingDown, Shield, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const LimitsWalletSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dailyLimits, setDailyLimits] = useState({
    max_bets_per_day: 50,
    max_bet_amount: 50000
  });

  const [withdrawalSettings, setWithdrawalSettings] = useState({
    min_withdrawal: 1000,
    max_withdrawal: 500000
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("gamification_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["daily_limits", "withdrawal_settings"]);

      if (error) throw error;

      if (data) {
        data.forEach((item) => {
          if (item.setting_key === "daily_limits") {
            setDailyLimits(item.setting_value as typeof dailyLimits);
          } else if (item.setting_key === "withdrawal_settings") {
            setWithdrawalSettings(item.setting_value as typeof withdrawalSettings);
          }
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { setting_key: "daily_limits", setting_value: dailyLimits },
        { setting_key: "withdrawal_settings", setting_value: withdrawalSettings }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("gamification_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("Settings saved successfully!");
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Betting Limits */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Daily Betting Limits
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control how many bets users can place per day and maximum bet amounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Max Bets Per Day</Label>
            <Input
              type="number"
              value={dailyLimits.max_bets_per_day}
              onChange={(e) => setDailyLimits(prev => ({ ...prev, max_bets_per_day: parseInt(e.target.value) || 0 }))}
              placeholder="50"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of bets a user can place in a single day
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Max Bet Amount (₦)</Label>
            <Input
              type="number"
              value={dailyLimits.max_bet_amount}
              onChange={(e) => setDailyLimits(prev => ({ ...prev, max_bet_amount: parseInt(e.target.value) || 0 }))}
              placeholder="50000"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Maximum amount for a single bet
            </p>
          </div>
        </div>
      </Card>

      {/* Withdrawal Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Withdrawal Thresholds
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set minimum and maximum withdrawal amounts.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Minimum Withdrawal (₦)
            </Label>
            <Input
              type="number"
              value={withdrawalSettings.min_withdrawal}
              onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, min_withdrawal: parseInt(e.target.value) || 0 }))}
              placeholder="1000"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Maximum Withdrawal (₦)
            </Label>
            <Input
              type="number"
              value={withdrawalSettings.max_withdrawal}
              onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, max_withdrawal: parseInt(e.target.value) || 0 }))}
              placeholder="500000"
              className="bg-background border-border"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 Users will see these limits when making withdrawal requests. Amounts outside this range will be rejected.
          </p>
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
            Save Limits & Wallet Settings
          </span>
        )}
      </Button>
    </div>
  );
};
