import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Save, Building2, Zap, Gift, Flame, MessageCircle, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

  const [depositBranding, setDepositBranding] = useState({
    deposit_title: "Secure Deposit",
    deposit_generate_cta: "Tap to Generate Virtual Secure Account",
    deposit_generating_text: "Generating your one-time secure account...",
    deposit_revealed_text: "Transfer the exact amount, then tap I have paid.",
    deposit_security_note: "🔒 A unique, encrypted account number is generated for this transaction only.",
    deposit_brand_tag: "Virtual Secure Account",
  });

  const [apkSettings, setApkSettings] = useState({
    apk_banner_enabled: "true",
    apk_download_url: "",
    apk_banner_title: "Get the SPORTY CODES App",
    apk_banner_text: "Download the official Android APK for the fastest, smoothest experience.",
    apk_version: "1.0.0",
  });

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
        const branding: any = { ...depositBranding };
        const apk: any = { ...apkSettings };

        data.forEach(item => {
          if (["bank_name", "account_name", "account_number"].includes(item.setting_key)) {
            bank[item.setting_key] = item.setting_value;
          } else if (["tap_earnings_amount", "max_daily_taps", "referral_bonus", "streak_bonus_multiplier"].includes(item.setting_key)) {
            tap[item.setting_key] = item.setting_value;
          } else if (item.setting_key === "whatsapp_number") {
            setWhatsappNumber(item.setting_value);
          } else if (item.setting_key in apk) {
            apk[item.setting_key] = item.setting_value;
          } else if (item.setting_key in branding) {
            branding[item.setting_key] = item.setting_value;
          }
        });

        setBankSettings(bank);
        setTapSettings(tap);
        setDepositBranding(branding);
        setApkSettings(apk);
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
      const allSettings = { ...bankSettings, ...tapSettings, ...depositBranding, ...apkSettings, whatsapp_number: whatsappNumber };
      
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

      {/* Rotating deposit accounts */}
      <BankAccountsSection />

      {/* Bank Account Settings (legacy fallback) */}
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

      {/* Deposit Page Branding */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Deposit Page Branding & Copy
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Text shown across the deposit/payment flow. Updates reflect instantly for all users.
        </p>

        <div className="space-y-4">
          {[
            { key: "deposit_title", label: "Modal Title", placeholder: "Secure Deposit" },
            { key: "deposit_brand_tag", label: "Account Card Tag", placeholder: "Virtual Secure Account" },
            { key: "deposit_generate_cta", label: "Generate Button Text", placeholder: "Tap to Generate Virtual Secure Account" },
            { key: "deposit_generating_text", label: "Generating Message", placeholder: "Generating your one-time secure account..." },
            { key: "deposit_revealed_text", label: "Revealed Message", placeholder: "Transfer the exact amount, then tap I have paid." },
            { key: "deposit_security_note", label: "Security Footnote", placeholder: "🔒 A unique, encrypted account..." },
          ].map((f) => (
            <div key={f.key} className="space-y-2">
              <Label className="text-foreground">{f.label}</Label>
              <Input
                value={(depositBranding as any)[f.key]}
                onChange={(e) => setDepositBranding(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="bg-background border-border"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* APK Download Banner */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          APK Download Banner
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          A center-screen banner inviting users to download the Android APK. Users can choose "Do not show again".
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-3">
            <div>
              <Label className="text-foreground">Enable Banner</Label>
              <p className="text-xs text-muted-foreground">Show the APK download popup to all users.</p>
            </div>
            <Switch
              checked={apkSettings.apk_banner_enabled === "true"}
              onCheckedChange={(v) =>
                setApkSettings(prev => ({ ...prev, apk_banner_enabled: v ? "true" : "false" }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">APK Download URL</Label>
            <Input
              value={apkSettings.apk_download_url}
              onChange={(e) => setApkSettings(prev => ({ ...prev, apk_download_url: e.target.value }))}
              placeholder="https://example.com/sporty-codes.apk"
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Direct link to the .apk file. Leave empty to hide the banner.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Banner Title</Label>
              <Input
                value={apkSettings.apk_banner_title}
                onChange={(e) => setApkSettings(prev => ({ ...prev, apk_banner_title: e.target.value }))}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">App Version</Label>
              <Input
                value={apkSettings.apk_version}
                onChange={(e) => setApkSettings(prev => ({ ...prev, apk_version: e.target.value }))}
                placeholder="1.0.0"
                className="bg-background border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Banner Message</Label>
            <Textarea
              value={apkSettings.apk_banner_text}
              onChange={(e) => setApkSettings(prev => ({ ...prev, apk_banner_text: e.target.value }))}
              rows={3}
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

      {/* Maintenance Mode */}
      <MaintenanceSection />

      {/* Live Videos */}
      <LiveVideosSection />
    </div>
  );
};