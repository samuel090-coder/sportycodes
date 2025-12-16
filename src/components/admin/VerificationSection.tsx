import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, RefreshCw, CheckCircle2, AlertCircle, Copy, ExternalLink, Search, Globe, Megaphone, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface VerificationMethod {
  key: string;
  name: string;
  description: string;
  placeholder: string;
  helpUrl?: string;
  category: "search" | "ads" | "social" | "security" | "analytics";
  format: "meta" | "code" | "file" | "dns";
}

const VERIFICATION_METHODS: VerificationMethod[] = [
  // Search Engines
  { key: "google_search_console", name: "Google Search Console", description: "Verify ownership for Google Search", placeholder: "sCVF7Rdwr4o4DJVDm2KL...", helpUrl: "https://search.google.com/search-console", category: "search", format: "meta" },
  { key: "bing_webmaster", name: "Bing Webmaster Tools", description: "Verify for Bing/Yahoo search", placeholder: "Enter Bing verification code", helpUrl: "https://www.bing.com/webmasters", category: "search", format: "meta" },
  { key: "yandex_webmaster", name: "Yandex Webmaster", description: "Russian search engine verification", placeholder: "Enter Yandex verification code", helpUrl: "https://webmaster.yandex.com", category: "search", format: "meta" },
  { key: "baidu_site_verification", name: "Baidu Webmaster", description: "Chinese search engine verification", placeholder: "Enter Baidu verification code", helpUrl: "https://ziyuan.baidu.com", category: "search", format: "meta" },
  { key: "naver_site_verification", name: "Naver Webmaster", description: "Korean search engine verification", placeholder: "Enter Naver verification code", helpUrl: "https://searchadvisor.naver.com", category: "search", format: "meta" },
  { key: "seznam_verification", name: "Seznam Webmaster", description: "Czech search engine verification", placeholder: "Enter Seznam verification code", helpUrl: "https://search.seznam.cz", category: "search", format: "meta" },
  { key: "sogou_site_verification", name: "Sogou Webmaster", description: "Chinese search engine verification", placeholder: "Enter Sogou verification code", category: "search", format: "meta" },
  
  // Ad Networks
  { key: "google_adsense", name: "Google AdSense", description: "AdSense publisher verification", placeholder: "ca-pub-XXXXXXXXXXXXXXXX", helpUrl: "https://adsense.google.com", category: "ads", format: "meta" },
  { key: "google_adsense_script", name: "AdSense Code Snippet", description: "Full AdSense script code", placeholder: '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXX"></script>', category: "ads", format: "code" },
  { key: "monetag_verification", name: "Monetag Verification", description: "Monetag ad network verification", placeholder: "Enter Monetag verification code", helpUrl: "https://monetag.com", category: "ads", format: "meta" },
  { key: "propeller_ads", name: "PropellerAds", description: "PropellerAds network verification", placeholder: "Enter PropellerAds verification code", helpUrl: "https://propellerads.com", category: "ads", format: "meta" },
  { key: "adsterra_verification", name: "Adsterra", description: "Adsterra ad network verification", placeholder: "Enter Adsterra verification code", helpUrl: "https://adsterra.com", category: "ads", format: "meta" },
  { key: "media_net", name: "Media.net", description: "Media.net ad network verification", placeholder: "Enter Media.net verification code", helpUrl: "https://www.media.net", category: "ads", format: "meta" },
  { key: "ezoic_verification", name: "Ezoic", description: "Ezoic platform verification", placeholder: "Enter Ezoic verification code", helpUrl: "https://www.ezoic.com", category: "ads", format: "meta" },
  { key: "hilltopads_verification", name: "HilltopAds", description: "HilltopAds network verification", placeholder: "Enter HilltopAds verification code", helpUrl: "https://hilltopads.com", category: "ads", format: "meta" },
  { key: "effectivegatecpm", name: "EffectiveGate CPM", description: "EffectiveGate ad network", placeholder: "Enter verification code", category: "ads", format: "meta" },
  
  // Social Platforms
  { key: "facebook_domain_verification", name: "Facebook Domain Verification", description: "Verify domain ownership for Facebook", placeholder: "Enter Facebook domain verification code", helpUrl: "https://business.facebook.com/settings/owned-domains", category: "social", format: "meta" },
  { key: "pinterest_verification", name: "Pinterest", description: "Verify for Pinterest Rich Pins", placeholder: "Enter Pinterest verification code", helpUrl: "https://www.pinterest.com/settings/claim", category: "social", format: "meta" },
  { key: "twitter_verification", name: "Twitter/X Domain", description: "Twitter Cards domain verification", placeholder: "Enter Twitter domain verification", helpUrl: "https://developer.twitter.com/en/docs/twitter-for-websites/cards", category: "social", format: "meta" },
  { key: "linkedin_verification", name: "LinkedIn", description: "LinkedIn domain verification", placeholder: "Enter LinkedIn verification code", helpUrl: "https://www.linkedin.com", category: "social", format: "meta" },
  { key: "tiktok_verification", name: "TikTok", description: "TikTok domain verification", placeholder: "Enter TikTok verification code", category: "social", format: "meta" },
  
  // Security & Trust
  { key: "norton_safe_web", name: "Norton Safe Web", description: "Norton security verification", placeholder: "Enter Norton verification code", helpUrl: "https://safeweb.norton.com", category: "security", format: "meta" },
  { key: "mcafee_siteadvisor", name: "McAfee SiteAdvisor", description: "McAfee security verification", placeholder: "Enter McAfee verification code", helpUrl: "https://www.siteadvisor.com", category: "security", format: "meta" },
  { key: "trustpilot_verification", name: "Trustpilot", description: "Trustpilot business verification", placeholder: "Enter Trustpilot verification code", helpUrl: "https://business.trustpilot.com", category: "security", format: "meta" },
  { key: "sucuri_verification", name: "Sucuri Security", description: "Sucuri security verification", placeholder: "Enter Sucuri verification code", helpUrl: "https://sucuri.net", category: "security", format: "meta" },
  
  // Analytics & Tracking
  { key: "google_analytics", name: "Google Analytics", description: "GA4 Measurement ID", placeholder: "G-XXXXXXXXXX", helpUrl: "https://analytics.google.com", category: "analytics", format: "code" },
  { key: "microsoft_clarity", name: "Microsoft Clarity", description: "Clarity project ID", placeholder: "Enter Clarity project ID", helpUrl: "https://clarity.microsoft.com", category: "analytics", format: "code" },
  { key: "hotjar_verification", name: "Hotjar", description: "Hotjar site verification", placeholder: "Enter Hotjar site ID", helpUrl: "https://www.hotjar.com", category: "analytics", format: "code" },
  { key: "alexa_verify", name: "Alexa (Amazon)", description: "Alexa site verification", placeholder: "Enter Alexa verification code", category: "analytics", format: "meta" },
];

export function VerificationSection() {
  const [verifications, setVerifications] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    loadVerifications();
  }, []);

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'verification_%');

      if (error) throw error;

      if (data) {
        const loaded: Record<string, string> = {};
        data.forEach((row) => {
          const key = row.setting_key.replace('verification_', '');
          if (key === 'last_updated') {
            setLastUpdated(row.setting_value);
          } else {
            loaded[key] = row.setting_value;
          }
        });
        setVerifications(loaded);
      }
    } catch (error) {
      console.error('Error loading verifications:', error);
    }
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const updates = Object.entries(verifications)
        .filter(([_, value]) => value && value.trim())
        .map(([key, value]) => ({
          setting_key: `verification_${key}`,
          setting_value: value.trim(),
        }));

      updates.push({
        setting_key: 'verification_last_updated',
        setting_value: new Date().toISOString(),
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'setting_key' });
        if (error) throw error;
      }

      setLastUpdated(new Date().toISOString());
      toast.success("✓ Verification codes saved! Update index.html to apply changes.");
    } catch (error: any) {
      console.error('Error saving verifications:', error);
      toast.error("Failed to save verification codes");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getConfiguredCount = (category: string) => {
    return VERIFICATION_METHODS.filter(
      m => m.category === category && verifications[m.key]?.trim()
    ).length;
  };

  const getTotalCount = (category: string) => {
    return VERIFICATION_METHODS.filter(m => m.category === category).length;
  };

  const generateMetaTags = () => {
    const tags: string[] = [];
    
    VERIFICATION_METHODS.forEach(method => {
      const value = verifications[method.key];
      if (!value?.trim()) return;
      
      if (method.format === "meta") {
        switch (method.key) {
          case "google_search_console":
            tags.push(`<meta name="google-site-verification" content="${value}" />`);
            break;
          case "bing_webmaster":
            tags.push(`<meta name="msvalidate.01" content="${value}" />`);
            break;
          case "yandex_webmaster":
            tags.push(`<meta name="yandex-verification" content="${value}" />`);
            break;
          case "baidu_site_verification":
            tags.push(`<meta name="baidu-site-verification" content="${value}" />`);
            break;
          case "naver_site_verification":
            tags.push(`<meta name="naver-site-verification" content="${value}" />`);
            break;
          case "seznam_verification":
            tags.push(`<meta name="seznam-wmt" content="${value}" />`);
            break;
          case "sogou_site_verification":
            tags.push(`<meta name="sogou_site_verification" content="${value}" />`);
            break;
          case "google_adsense":
            tags.push(`<meta name="google-adsense-account" content="${value}" />`);
            break;
          case "monetag_verification":
            tags.push(`<meta name="monetag" content="${value}" />`);
            break;
          case "propeller_ads":
            tags.push(`<meta name="propeller" content="${value}" />`);
            break;
          case "adsterra_verification":
            tags.push(`<meta name="adsterra-verification" content="${value}" />`);
            break;
          case "media_net":
            tags.push(`<meta name="medianet-verification" content="${value}" />`);
            break;
          case "ezoic_verification":
            tags.push(`<meta name="ezoic-site-verification" content="${value}" />`);
            break;
          case "hilltopads_verification":
            tags.push(`<meta name="hilltopads-verification" content="${value}" />`);
            break;
          case "effectivegatecpm":
            tags.push(`<meta name="${value}" content="${value}" />`);
            break;
          case "facebook_domain_verification":
            tags.push(`<meta name="facebook-domain-verification" content="${value}" />`);
            break;
          case "pinterest_verification":
            tags.push(`<meta name="p:domain_verify" content="${value}" />`);
            break;
          case "twitter_verification":
            tags.push(`<meta name="twitter:site" content="${value}" />`);
            break;
          case "linkedin_verification":
            tags.push(`<meta name="linkedin-domain-verification" content="${value}" />`);
            break;
          case "tiktok_verification":
            tags.push(`<meta name="tiktok-verification" content="${value}" />`);
            break;
          case "norton_safe_web":
            tags.push(`<meta name="norton-safeweb-site-verification" content="${value}" />`);
            break;
          case "mcafee_siteadvisor":
            tags.push(`<meta name="mcafee-verification" content="${value}" />`);
            break;
          case "trustpilot_verification":
            tags.push(`<meta name="trustpilot-one-time-domain-verification-id" content="${value}" />`);
            break;
          case "sucuri_verification":
            tags.push(`<meta name="sucuri-verification" content="${value}" />`);
            break;
          case "alexa_verify":
            tags.push(`<meta name="alexaVerifyID" content="${value}" />`);
            break;
          default:
            tags.push(`<meta name="${method.key.replace(/_/g, '-')}" content="${value}" />`);
        }
      }
    });
    
    return tags.join('\n');
  };

  const renderVerificationFields = (category: string) => {
    const methods = VERIFICATION_METHODS.filter(m => m.category === category);
    
    return (
      <div className="space-y-4">
        {methods.map(method => (
          <div key={method.key} className="space-y-2 p-3 sm:p-4 bg-cyber-dark/50 rounded-lg border border-border/30">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Label className="text-xs sm:text-sm text-foreground font-mono font-bold">
                    {method.name}
                  </Label>
                  {verifications[method.key]?.trim() && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>
              {method.helpUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-cyber-neon-cyan"
                  onClick={() => window.open(method.helpUrl, '_blank')}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            {method.format === "code" ? (
              <Textarea
                value={verifications[method.key] || ''}
                onChange={(e) => setVerifications({ ...verifications, [method.key]: e.target.value })}
                className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-[10px] sm:text-xs min-h-[80px]"
                placeholder={method.placeholder}
              />
            ) : (
              <Input
                value={verifications[method.key] || ''}
                onChange={(e) => setVerifications({ ...verifications, [method.key]: e.target.value })}
                className="bg-cyber-dark border-cyber-neon-green/30 text-foreground font-mono text-xs sm:text-sm"
                placeholder={method.placeholder}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "search": return <Search className="w-4 h-4" />;
      case "ads": return <Megaphone className="w-4 h-4" />;
      case "social": return <Share2 className="w-4 h-4" />;
      case "security": return <Shield className="w-4 h-4" />;
      case "analytics": return <Globe className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-cyber-neon-green font-mono flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            SITE VERIFICATION
          </h2>
          <p className="text-xs sm:text-sm text-cyber-neon-cyan/60 font-mono mt-1">
            Verify ownership with 25+ platforms
          </p>
          {lastUpdated && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {["search", "ads", "social", "security", "analytics"].map(cat => (
          <Card key={cat} className="p-3 bg-cyber-panel border-cyber-neon-green/30">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyber-dark">
                {getCategoryIcon(cat)}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground capitalize">{cat}</p>
                <p className="text-sm font-bold text-foreground">
                  {getConfiguredCount(cat)}/{getTotalCount(cat)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Verification Methods Tabs */}
      <Card className="p-4 sm:p-6 bg-cyber-panel border-2 border-cyber-neon-green/30">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex flex-wrap gap-1 bg-cyber-dark/50 p-1 h-auto">
            <TabsTrigger value="search" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-cyber-neon-green data-[state=active]:text-cyber-dark">
              <Search className="w-3 h-3 mr-1 hidden sm:inline" />
              Search ({getConfiguredCount("search")})
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-cyber-neon-green data-[state=active]:text-cyber-dark">
              <Megaphone className="w-3 h-3 mr-1 hidden sm:inline" />
              Ads ({getConfiguredCount("ads")})
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-cyber-neon-green data-[state=active]:text-cyber-dark">
              <Share2 className="w-3 h-3 mr-1 hidden sm:inline" />
              Social ({getConfiguredCount("social")})
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-cyber-neon-green data-[state=active]:text-cyber-dark">
              <Shield className="w-3 h-3 mr-1 hidden sm:inline" />
              Security ({getConfiguredCount("security")})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 min-w-[80px] text-xs sm:text-sm data-[state=active]:bg-cyber-neon-green data-[state=active]:text-cyber-dark">
              <Globe className="w-3 h-3 mr-1 hidden sm:inline" />
              Analytics ({getConfiguredCount("analytics")})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 sm:mt-6">
            <TabsContent value="search" className="mt-0">
              <div className="mb-4 p-3 bg-cyber-neon-cyan/10 rounded-lg border border-cyber-neon-cyan/30">
                <p className="text-xs text-cyber-neon-cyan">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Search engine verification helps your site get indexed faster and provides access to webmaster tools.
                </p>
              </div>
              {renderVerificationFields("search")}
            </TabsContent>

            <TabsContent value="ads" className="mt-0">
              <div className="mb-4 p-3 bg-cyber-neon-purple/10 rounded-lg border border-cyber-neon-purple/30">
                <p className="text-xs text-cyber-neon-purple">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Ad network verification codes prove site ownership for monetization. Some networks require script snippets.
                </p>
              </div>
              {renderVerificationFields("ads")}
            </TabsContent>

            <TabsContent value="social" className="mt-0">
              <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <p className="text-xs text-blue-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Social platform verification enables rich previews, analytics, and domain-level features.
                </p>
              </div>
              {renderVerificationFields("social")}
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                <p className="text-xs text-green-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Security verification builds trust with users by showing your site is verified by trusted services.
                </p>
              </div>
              {renderVerificationFields("security")}
            </TabsContent>

            <TabsContent value="analytics" className="mt-0">
              <div className="mb-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                <p className="text-xs text-orange-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Analytics verification codes connect your site to tracking and analysis platforms.
                </p>
              </div>
              {renderVerificationFields("analytics")}
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSave}
            disabled={isUpdating}
            className="w-full sm:flex-1 bg-gradient-to-r from-cyber-neon-green to-green-600 hover:from-green-600 hover:to-cyber-neon-green text-cyber-dark font-black border-2 border-cyber-neon-green shadow-neon-green text-xs sm:text-sm"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "💾 SAVE ALL VERIFICATION CODES"
            )}
          </Button>
        </div>
      </Card>

      {/* Generated Meta Tags Preview */}
      <Card className="p-4 sm:p-6 bg-cyber-panel border-2 border-cyber-neon-purple/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-black text-cyber-neon-purple font-mono">
            📋 GENERATED META TAGS
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(generateMetaTags())}
            className="border-cyber-neon-purple text-cyber-neon-purple hover:bg-cyber-neon-purple/10"
          >
            <Copy className="w-4 h-4 mr-1" />
            Copy All
          </Button>
        </div>
        
        <div className="bg-cyber-dark rounded-lg p-3 sm:p-4 border border-border/30 max-h-[300px] overflow-auto">
          <pre className="text-[10px] sm:text-xs text-cyber-neon-cyan font-mono whitespace-pre-wrap break-all">
            {generateMetaTags() || "<!-- No verification codes configured yet -->"}
          </pre>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <p className="text-xs text-yellow-400">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            <strong>How to apply:</strong> Copy the meta tags above and add them to the &lt;head&gt; section of your index.html file, or contact support to update them automatically.
          </p>
        </div>
      </Card>
    </div>
  );
}
