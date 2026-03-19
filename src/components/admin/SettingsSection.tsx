import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Save, Building2, Zap, Gift, Flame, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MaintenanceSection } from "./MaintenanceSection";
import { LiveVideosSection } from "./LiveVideosSection";

export const SettingsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [bankSettings, setBankSettings] = useState({
    bank_name: "",
    account_name: "",
    account_number: ""
  });

  const [tapSettings, setTapSettings] = useState({
    tap_earnings_amount: "0.50",
    max_daily_taps: "100",
    referral_bonus: "50",
    streak_bonus_multiplier: "0.1"
  });

  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value");

      if (error) throw error;

      if (data) {
        const bank: any = { ...bankSettings };
        const tap: any = { ...tapSettings };
        
        data.forEach(item => {
          if (["bank_name", "account_name", "account_number"].includes(item.setting_key)) {
            bank[item.setting_key] = item.setting_value;
          } else if (["tap_earnings_amount", "max_daily_taps", "referral_bonus", "streak_bonus_multiplier"].includes(item.setting_key)) {
            tap[item.setting_key] = item.setting_value;
          } else if (item.setting_key === "whatsapp_number") {
            setWhatsappNumber(item.setting_value);
          }
        });
        
        setBankSettings(bank);
        setTapSettings(tap);
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
      // Combine all settings
      const allSettings = { ...bankSettings, ...tapSettings, whatsapp_number: whatsappNumber };
      
      // Upsert each setting
      for (const [key, value] of Object.entries(allSettings)) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(
            { setting_key: key, setting_value: value },
            { onConflict: "setting_key" }
          );

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
      {/* Tap to Earn Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Tap to Earn Settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Control how much users earn from tapping and other rewards.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Earnings Per Tap (₦)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={tapSettings.tap_earnings_amount}
              onChange={(e) => setTapSettings(prev => ({ ...prev, tap_earnings_amount: e.target.value }))}
              placeholder="0.50"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Max Daily Taps</Label>
            <Input
              type="number"
              value={tapSettings.max_daily_taps}
              onChange={(e) => setTapSettings(prev => ({ ...prev, max_daily_taps: e.target.value }))}
              placeholder="100"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Referral Bonus (₦)
            </Label>
            <Input
              type="number"
              value={tapSettings.referral_bonus}
              onChange={(e) => setTapSettings(prev => ({ ...prev, referral_bonus: e.target.value }))}
              placeholder="50"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Flame className="w-4 h-4" />
              Streak Bonus Multiplier (₦/day)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={tapSettings.streak_bonus_multiplier}
              onChange={(e) => setTapSettings(prev => ({ ...prev, streak_bonus_multiplier: e.target.value }))}
              placeholder="0.1"
              className="bg-background border-border"
            />
          </div>
        </div>

        <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Streak Bonus:</strong> Users earn an extra ₦{tapSettings.streak_bonus_multiplier} per tap for each consecutive day they tap. 
            For example, a 5-day streak = ₦{(parseFloat(tapSettings.streak_bonus_multiplier) * 5).toFixed(2)} extra per tap.
          </p>
        </div>
      </Card>

      {/* WhatsApp Contact */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          WhatsApp Contact
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          This number is used for customer support and payment verification messages.
        </p>

        <div className="space-y-2">
          <Label className="text-foreground">WhatsApp Number (with country code)</Label>
          <Input
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="e.g., +2349067423764"
            className="bg-background border-border"
          />
          <p className="text-xs text-muted-foreground">
            Include country code without spaces (e.g., +234 for Nigeria)
          </p>
        </div>
      </Card>

      {/* Bank Account Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Bank Account Details
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          These details will be shown to users when they want to make deposits.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Bank Name</Label>
            <Input
              value={bankSettings.bank_name}
              onChange={(e) => setBankSettings(prev => ({ ...prev, bank_name: e.target.value }))}
              placeholder="e.g., First Bank, GTBank, OPay"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Account Name</Label>
            <Input
              value={bankSettings.account_name}
              onChange={(e) => setBankSettings(prev => ({ ...prev, account_name: e.target.value }))}
              placeholder="Account holder name"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Account Number</Label>
            <Input
              value={bankSettings.account_number}
              onChange={(e) => setBankSettings(prev => ({ ...prev, account_number: e.target.value }))}
              placeholder="10-digit account number"
              className="bg-background border-border"
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
            Save All Settings
          </span>
        )}
      </Button>
    </div>
  );
};