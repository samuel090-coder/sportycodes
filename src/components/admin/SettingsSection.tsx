import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Save, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SettingsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [bankSettings, setBankSettings] = useState({
    bank_name: "",
    account_name: "",
    account_number: ""
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["bank_name", "account_name", "account_number"]);

      if (error) throw error;

      if (data) {
        const settings: any = { ...bankSettings };
        data.forEach(item => {
          settings[item.setting_key] = item.setting_value;
        });
        setBankSettings(settings);
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
      // Upsert each setting
      for (const [key, value] of Object.entries(bankSettings)) {
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full mt-4 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Settings
              </span>
            )}
          </Button>
        </div>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-muted-foreground" />
          App Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          More app settings coming soon. Manage tap-to-earn rates, referral bonuses, and more.
        </p>
      </Card>
    </div>
  );
};
