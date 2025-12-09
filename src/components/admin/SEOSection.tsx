import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, RefreshCw, ExternalLink, TrendingUp, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function SEOSection() {
  const [seoSettings, setSeoSettings] = useState({
    siteTitle: "SPORTY CODES - Sure Football Predictions | 2+ Odds Daily | Fixed Matches & Winning Tips",
    metaDescription: "Get daily sure football predictions with 2+ odds, correct scores, and winning betting tips. Access fixed matches, hacked predictions, and expert football analysis. 90%+ win rate guaranteed.",
    metaKeywords: "football predictions, sure odds, 2+ odds daily, football tips, correct score predictions, fixed matches, hacked football predictions, betting tips, winning football site, football analysis, today match prediction, sure bet codes",
    canonicalUrl: "https://yourdomain.com",
    ogImage: "https://yourdomain.com/icon-512.png",
    twitterHandle: "@SportyCodes",
    googleVerification: "",
    bingVerification: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    loadSEOSettings();
  }, []);

  const loadSEOSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'seo_site_title',
          'seo_meta_description',
          'seo_meta_keywords',
          'seo_canonical_url',
          'seo_og_image',
          'seo_twitter_handle',
          'seo_google_verification',
          'seo_bing_verification',
          'seo_last_updated'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings = { ...seoSettings };
        data.forEach((row) => {
          const key = row.setting_key.replace('seo_', '').replace(/_([a-z])/g, (g) => g[1].toUpperCase());
          if (key === 'lastUpdated') {
            setLastUpdated(row.setting_value);
          } else {
            (settings as any)[key] = row.setting_value;
          }
        });
        setSeoSettings(settings);
      }
    } catch (error) {
      console.error('Error loading SEO settings:', error);
    }
  };

  const handleSaveSEO = async () => {
    setIsUpdating(true);
    try {
      const updates = Object.entries(seoSettings).map(([key, value]) => ({
        setting_key: `seo_${key.replace(/([A-Z])/g, '_$1').toLowerCase()}`,
        setting_value: value,
      }));

      // Add last updated timestamp
      updates.push({
        setting_key: 'seo_last_updated',
        setting_value: new Date().toISOString(),
      });

      // Upsert all settings
      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      setLastUpdated(new Date().toISOString());
      toast.success("✓ SEO settings updated successfully!");
    } catch (error: any) {
      console.error('Error updating SEO:', error);
      toast.error("Failed to update SEO settings");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateSitemap = async () => {
    try {
      toast.info("Sitemap is already configured at /sitemap.xml");
      window.open("/sitemap.xml", "_blank");
    } catch (error) {
      toast.error("Failed to generate sitemap");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-cyber-neon-green font-mono flex items-center gap-2">
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            SEO MANAGEMENT
          </h2>
          <p className="text-xs sm:text-sm text-cyber-neon-cyan/60 font-mono mt-1">
            Optimize for Google Search Rankings
          </p>
          {lastUpdated && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* SEO Quick Stats - Based on actual settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-cyber-panel border-cyber-neon-green/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Target Keywords</p>
              <p className="text-base sm:text-lg font-black text-foreground">
                {seoSettings.metaKeywords.split(',').filter(k => k.trim()).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-cyber-panel border-cyber-neon-cyan/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <Search className="w-6 h-6 sm:w-8 sm:h-8 text-cyber-neon-cyan" />
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Title Length</p>
              <p className={`text-base sm:text-lg font-black ${seoSettings.siteTitle.length <= 60 ? 'text-green-500' : 'text-yellow-500'}`}>
                {seoSettings.siteTitle.length}/60
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-cyber-panel border-cyber-neon-purple/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-cyber-neon-purple" />
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Description Length</p>
              <p className={`text-base sm:text-lg font-black ${seoSettings.metaDescription.length <= 160 ? 'text-green-500' : 'text-yellow-500'}`}>
                {seoSettings.metaDescription.length}/160
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 bg-cyber-panel border-primary/30">
          <div className="flex items-center gap-2 sm:gap-3">
            <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Status</p>
              <p className={`text-base sm:text-lg font-black ${lastUpdated ? 'text-green-500' : 'text-yellow-500'}`}>
                {lastUpdated ? 'Configured' : 'Pending'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* SEO Configuration Form */}
      <Card className="p-4 sm:p-6 bg-cyber-panel border-2 border-cyber-neon-green/30">
        <h3 className="text-base sm:text-lg font-black text-cyber-neon-green font-mono mb-4 sm:mb-6">
          PRIMARY SEO SETTINGS
        </h3>
        
        <div className="space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-foreground font-mono">Site Title</Label>
            <Input
              value={seoSettings.siteTitle}
              onChange={(e) => setSeoSettings({ ...seoSettings, siteTitle: e.target.value })}
              className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
              placeholder="SPORTY CODES - Sure Football Predictions"
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {seoSettings.siteTitle.length}/60 characters (Keep under 60 for optimal display)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-foreground font-mono">Meta Description</Label>
            <Textarea
              value={seoSettings.metaDescription}
              onChange={(e) => setSeoSettings({ ...seoSettings, metaDescription: e.target.value })}
              className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm"
              placeholder="Daily sure football predictions with 2+ odds..."
            />
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {seoSettings.metaDescription.length}/160 characters (Keep under 160 for optimal display)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-foreground font-mono">Target Keywords (comma-separated)</Label>
            <Textarea
              value={seoSettings.metaKeywords}
              onChange={(e) => setSeoSettings({ ...seoSettings, metaKeywords: e.target.value })}
              className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm"
              placeholder="football predictions, sure odds, 2+ odds daily, fixed matches..."
            />
            <p className="text-[10px] sm:text-xs text-cyber-neon-green">
              ✓ High-traffic keywords: football predictions, sure odds, betting tips, fixed matches
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm text-foreground font-mono">Canonical URL</Label>
              <Input
                value={seoSettings.canonicalUrl}
                onChange={(e) => setSeoSettings({ ...seoSettings, canonicalUrl: e.target.value })}
                className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
                placeholder="https://yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs sm:text-sm text-foreground font-mono">Twitter Handle</Label>
              <Input
                value={seoSettings.twitterHandle}
                onChange={(e) => setSeoSettings({ ...seoSettings, twitterHandle: e.target.value })}
                className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
                placeholder="@SportyCodes"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs sm:text-sm text-foreground font-mono">OG Image URL</Label>
            <Input
              value={seoSettings.ogImage}
              onChange={(e) => setSeoSettings({ ...seoSettings, ogImage: e.target.value })}
              className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
              placeholder="https://yourdomain.com/icon-512.png"
            />
          </div>

          <div className="pt-4 border-t border-cyber-neon-green/20">
            <h4 className="text-sm sm:text-base font-black text-cyber-neon-cyan font-mono mb-3 sm:mb-4">
              SEARCH ENGINE VERIFICATION
            </h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm text-foreground font-mono">Google Verification Code</Label>
                <Input
                  value={seoSettings.googleVerification}
                  onChange={(e) => setSeoSettings({ ...seoSettings, googleVerification: e.target.value })}
                  className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
                  placeholder="Enter Google Search Console verification code"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm text-foreground font-mono">Bing Verification Code</Label>
                <Input
                  value={seoSettings.bingVerification}
                  onChange={(e) => setSeoSettings({ ...seoSettings, bingVerification: e.target.value })}
                  className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
                  placeholder="Enter Bing Webmaster verification code"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSaveSEO}
            disabled={isUpdating}
            className="w-full sm:flex-1 bg-gradient-to-r from-cyber-neon-green to-green-600 hover:from-green-600 hover:to-cyber-neon-green text-cyber-dark font-black border-2 border-cyber-neon-green shadow-neon-green text-xs sm:text-sm"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "💾 SAVE SEO SETTINGS"
            )}
          </Button>

          <Button
            onClick={handleGenerateSitemap}
            variant="outline"
            className="w-full sm:w-auto border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan/10 font-mono text-xs sm:text-sm"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Sitemap
          </Button>
        </div>
      </Card>

      {/* SEO Tips */}
      <Card className="p-4 sm:p-6 bg-cyber-panel border-2 border-cyber-neon-purple/30">
        <h3 className="text-base sm:text-lg font-black text-cyber-neon-purple font-mono mb-3 sm:mb-4">
          🎯 SEO OPTIMIZATION TIPS
        </h3>
        
        <div className="space-y-3 text-xs sm:text-sm">
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-green-500 text-base sm:text-lg">✓</span>
            <p className="text-foreground"><strong>Automatic Indexing:</strong> Sitemap configured for Google & Bing crawlers</p>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-green-500 text-base sm:text-lg">✓</span>
            <p className="text-foreground"><strong>Structured Data:</strong> JSON-LD schema for rich search results</p>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-green-500 text-base sm:text-lg">✓</span>
            <p className="text-foreground"><strong>Mobile-Optimized:</strong> PWA with fast loading & offline support</p>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-green-500 text-base sm:text-lg">✓</span>
            <p className="text-foreground"><strong>High-Value Keywords:</strong> Targeting "football predictions", "sure odds", "betting tips"</p>
          </div>
          <div className="flex items-start gap-2 sm:gap-3">
            <span className="text-cyber-neon-cyan text-base sm:text-lg">ℹ</span>
            <p className="text-muted-foreground"><strong>Next Steps:</strong> Submit sitemap to Google Search Console & Bing Webmaster Tools</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
