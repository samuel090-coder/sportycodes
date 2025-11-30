import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { DollarSign, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalAdZoneManager } from "@/components/GlobalAdZoneManager";

export const AdsSection = () => {
  const isMobile = window.innerWidth < 768;
  const [cardsAdsEnabled, setCardsAdsEnabled] = useState(true);
  const [siteAdsEnabled, setSiteAdsEnabled] = useState(true);

  useEffect(() => {
    loadAdSettings();
  }, []);

  const loadAdSettings = async () => {
    try {
      const { data: cardsData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "cards_ads_enabled")
        .maybeSingle();

      const { data: siteData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "site_ads_enabled")
        .maybeSingle();

      setCardsAdsEnabled(cardsData?.setting_value === "true");
      setSiteAdsEnabled(siteData?.setting_value === "true");
    } catch (error) {
      console.error("Error loading ad settings:", error);
    }
  };

  const handleToggleCardsAds = async (enabled: boolean) => {
    try {
      await supabase.from("app_settings").upsert({
        setting_key: "cards_ads_enabled",
        setting_value: enabled.toString(),
      });
      setCardsAdsEnabled(enabled);
      toast.success(`Per-card ads ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update cards ads setting");
    }
  };

  const handleToggleSiteAds = async (enabled: boolean) => {
    try {
      await supabase.from("app_settings").upsert({
        setting_key: "site_ads_enabled",
        setting_value: enabled.toString(),
      });
      setSiteAdsEnabled(enabled);
      toast.success(`Site ads ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      toast.error("Failed to update site ads setting");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Ad Toggle Controls */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-4 md:p-6">
        <h3 className="text-lg md:text-2xl font-black text-cyber-neon-green mb-4 md:mb-6 font-mono flex items-center gap-2">
          <DollarSign className="w-5 h-5 md:w-6 md:h-6 animate-neon-pulse" />
          <span className="text-sm md:text-base">AD CONTROLS</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Per-Card Ads Toggle */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base md:text-lg font-bold text-cyber-neon-cyan font-mono">PER-CARD ADS</h4>
                <p className="text-xs text-cyber-neon-cyan/60 font-mono">Individual sure odd unlock ads</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleCardsAds(!cardsAdsEnabled)}
                className={`relative w-16 h-8 rounded-full transition-colors ${
                  cardsAdsEnabled ? "bg-cyber-neon-green" : "bg-cyber-dark border-2 border-cyber-neon-red"
                }`}
              >
                <div
                  className={`absolute top-1 ${
                    cardsAdsEnabled ? "right-1" : "left-1"
                  } w-6 h-6 rounded-full bg-cyber-panel transition-all shadow-lg`}
                />
              </button>
            </div>
            <p className="text-cyber-neon-cyan/70 text-xs font-mono">
              Status:{" "}
              <span className={cardsAdsEnabled ? "text-cyber-neon-green" : "text-cyber-neon-red"}>
                {cardsAdsEnabled ? "ON" : "OFF"}
              </span>
            </p>
          </div>

          {/* Site-Wide Ads Toggle */}
          <div className="space-y-2 md:space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base md:text-lg font-bold text-cyber-neon-purple font-mono">SITE-WIDE ADS</h4>
                <p className="text-xs text-cyber-neon-purple/60 font-mono">Global ad zone placements</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSiteAds(!siteAdsEnabled)}
                className={`relative w-16 h-8 rounded-full transition-colors ${
                  siteAdsEnabled ? "bg-cyber-neon-green" : "bg-cyber-dark border-2 border-cyber-neon-red"
                }`}
              >
                <div
                  className={`absolute top-1 ${
                    siteAdsEnabled ? "right-1" : "left-1"
                  } w-6 h-6 rounded-full bg-cyber-panel transition-all shadow-lg`}
                />
              </button>
            </div>
            <p className="text-cyber-neon-cyan/70 text-xs font-mono">
              Status:{" "}
              <span className={siteAdsEnabled ? "text-cyber-neon-green" : "text-cyber-neon-red"}>
                {siteAdsEnabled ? "ON" : "OFF"}
              </span>
            </p>
          </div>
        </div>
      </Card>

      {/* Global Ad Zones Manager */}
      <GlobalAdZoneManager />
    </div>
  );
};
