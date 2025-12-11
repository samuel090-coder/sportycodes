import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GlobalAdZone {
  id: string;
  zone_id: string;
  zone_name: string;
  placement: string;
  is_active: boolean;
}

/**
 * HilltopAdRenderer - Handles dynamic ad injection based on admin panel settings
 * 
 * HOW AD NETWORKS WORK:
 * 1. POPUNDER/INTERSTITIAL ADS (effectivegatecpm, monetag, etc.):
 *    - These are script-only ads that open new tabs/windows
 *    - They DON'T show visible banners on your page
 *    - They trigger on page load or user interaction
 * 
 * 2. BANNER/DISPLAY ADS:
 *    - Need a container div with specific ID/class
 *    - The ad network fills that container with actual visual ads
 *    - These show on specific locations on your page
 * 
 * Current implementation handles BOTH types.
 */
export const HilltopAdRenderer = ({ placement }: { placement: string }) => {
  const [adZones, setAdZones] = useState<GlobalAdZone[]>([]);
  const [siteAdsEnabled, setSiteAdsEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedScriptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();

    // Subscribe to real-time changes for both ad zones and settings
    const channel = supabase
      .channel(`hilltop-ads-${placement}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_ad_zones',
        },
        () => {
          loadAdZones();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_settings',
        },
        () => {
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placement]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'site_ads_enabled')
        .maybeSingle();

      if (error) {
        console.error('Error loading site ads setting:', error);
        return;
      }

      // Default to false if no setting exists
      const enabled = data?.setting_value === 'true';
      console.log(`[AdRenderer ${placement}] Site ads enabled:`, enabled);
      setSiteAdsEnabled(enabled);
      
      if (enabled) {
        loadAdZones();
      } else {
        // Clear ads when disabled
        setAdZones([]);
        cleanupAdScripts();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadAdZones = async () => {
    const { data, error } = await supabase
      .from('global_ad_zones')
      .select('*')
      .eq('placement', placement)
      .eq('is_active', true);

    if (error) {
      console.error('Error loading ad zones:', error);
      return;
    }

    console.log(`[AdRenderer ${placement}] Loaded ${data?.length || 0} ad zones`);
    setAdZones(data || []);
  };

  useEffect(() => {
    // Only inject ads if site ads are enabled and we have zones
    if (!siteAdsEnabled || adZones.length === 0) {
      cleanupAdScripts();
      return;
    }

    // Process each ad zone
    adZones.forEach((zone) => {
      const scriptId = `ad-script-${zone.id}`;
      
      // Skip if already injected
      if (injectedScriptsRef.current.has(scriptId)) {
        console.log(`[AdRenderer] Script ${zone.zone_name} already injected, skipping`);
        return;
      }

      const zoneContent = zone.zone_id.trim();
      console.log(`[AdRenderer ${placement}] Processing zone: ${zone.zone_name}`);
      console.log(`[AdRenderer ${placement}] Zone content: ${zoneContent.substring(0, 100)}...`);
      
      try {
        // CASE 1: Full script tag provided (e.g., <script src="..."></script>)
        if (zoneContent.includes('<script')) {
          injectFullScriptTag(zone, zoneContent, scriptId);
        }
        // CASE 2: Direct URL to script (e.g., //pl28226008.effectivegatecpm.com/...)
        else if (zoneContent.startsWith('http') || zoneContent.startsWith('//')) {
          injectScriptUrl(zone, zoneContent, scriptId);
        }
        // CASE 3: Just a zone ID number (for networks that need containers)
        else if (/^\d+$/.test(zoneContent)) {
          console.log(`[AdRenderer] Zone ID only (${zoneContent}) - Container ads not fully supported yet`);
        }
        // CASE 4: Unknown format
        else {
          console.warn(`[AdRenderer] Unknown ad format for ${zone.zone_name}:`, zoneContent.substring(0, 50));
        }

        injectedScriptsRef.current.add(scriptId);
      } catch (error) {
        console.error(`[AdRenderer] Error injecting ad ${zone.zone_name}:`, error);
      }
    });

    // Cleanup function
    return () => {
      // Don't cleanup on re-render, only on unmount or when ads disabled
    };
  }, [adZones, siteAdsEnabled, placement]);

  const injectFullScriptTag = (zone: GlobalAdZone, content: string, scriptId: string) => {
    // Extract src attribute if present
    const srcMatch = content.match(/src=["']([^"']+)["']/i);
    
    if (srcMatch) {
      // External script with src
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = srcMatch[1];
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
      console.log(`[AdRenderer] ✅ Injected external script: ${zone.zone_name} -> ${srcMatch[1]}`);
    } else {
      // Inline script content
      const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      if (scriptMatch && scriptMatch[1].trim()) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.textContent = scriptMatch[1];
        document.body.appendChild(script);
        console.log(`[AdRenderer] ✅ Injected inline script: ${zone.zone_name}`);
      }
    }
  };

  const injectScriptUrl = (zone: GlobalAdZone, url: string, scriptId: string) => {
    // Normalize URL (add protocol if missing)
    const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = normalizedUrl;
    script.async = true;
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log(`[AdRenderer] ✅ Script loaded: ${zone.zone_name}`);
    };
    
    script.onerror = (e) => {
      console.error(`[AdRenderer] ❌ Failed to load script: ${zone.zone_name}`, e);
    };
    
    document.body.appendChild(script);
    console.log(`[AdRenderer] ✅ Injected URL script: ${zone.zone_name} -> ${normalizedUrl}`);
  };

  const cleanupAdScripts = () => {
    // Remove all injected ad scripts
    injectedScriptsRef.current.forEach(scriptId => {
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
        console.log(`[AdRenderer] Removed script: ${scriptId}`);
      }
    });
    injectedScriptsRef.current.clear();
    
    // Also cleanup any orphaned ad elements
    document.querySelectorAll('[id^="ad-script-"]').forEach(el => el.remove());
    document.querySelectorAll('[id^="hilltop-ad-"]').forEach(el => el.remove());
  };

  // This component doesn't render visible UI for popunder/interstitial ads
  // Banner ads would need a container - we'll add that feature later if needed
  return null;
};

/**
 * IMPORTANT NOTES FOR ADMIN:
 * 
 * 1. effectivegatecpm.com, monetag.com, etc. are POPUNDER ads
 *    - They open new tabs/windows when user interacts with page
 *    - They DON'T show visible banners on your site
 *    - This is normal behavior for these ad networks
 * 
 * 2. To add an ad, go to Admin > Ads and add:
 *    - Zone ID: Paste the FULL script URL (e.g., //pl28226008.effectivegatecpm.com/xxx.js)
 *    - OR paste the complete <script>...</script> tag
 *    - Zone Name: A friendly name for your reference
 *    - Placement: Where to load the script (header, footer, sidebar)
 * 
 * 3. Ads will ONLY show when:
 *    - "Site-Wide Ads" toggle is ON in admin panel
 *    - The ad zone is marked as "Active"
 * 
 * 4. If you want VISIBLE banner ads on specific page locations,
 *    you need ad networks that support display/banner ads (like Google AdSense)
 */
