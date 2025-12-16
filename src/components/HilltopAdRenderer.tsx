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
 * SUPPORTS TWO AD TYPES:
 * 1. POPUNDER/INTERSTITIAL ADS: Script-only, opens new tabs (no visible element)
 * 2. NATIVE/BANNER ADS: Script + Container div (visible ad on page)
 */
export const HilltopAdRenderer = ({ placement }: { placement: string }) => {
  const [adZones, setAdZones] = useState<GlobalAdZone[]>([]);
  const [siteAdsEnabled, setSiteAdsEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedScriptsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadSettings();

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

      const enabled = data?.setting_value === 'true';
      console.log(`[AdRenderer ${placement}] Site ads enabled:`, enabled);
      setSiteAdsEnabled(enabled);
      
      if (enabled) {
        loadAdZones();
      } else {
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
    if (!siteAdsEnabled || adZones.length === 0) {
      cleanupAdScripts();
      return;
    }

    adZones.forEach((zone) => {
      const scriptId = `ad-script-${zone.id}`;
      
      if (injectedScriptsRef.current.has(scriptId)) {
        return;
      }

      const zoneContent = zone.zone_id.trim();
      console.log(`[AdRenderer ${placement}] Processing zone: ${zone.zone_name}`);
      
      try {
        // Check if this is a native ad with container (has both script and div)
        if (zoneContent.includes('<script') && zoneContent.includes('<div')) {
          injectNativeAdWithContainer(zone, zoneContent, scriptId);
        }
        // Full script tag only
        else if (zoneContent.includes('<script')) {
          injectFullScriptTag(zone, zoneContent, scriptId);
        }
        // Direct URL to script
        else if (zoneContent.startsWith('http') || zoneContent.startsWith('//')) {
          injectScriptUrl(zone, zoneContent, scriptId);
        }
        else {
          console.warn(`[AdRenderer] Unknown ad format for ${zone.zone_name}`);
        }

        injectedScriptsRef.current.add(scriptId);
      } catch (error) {
        console.error(`[AdRenderer] Error injecting ad ${zone.zone_name}:`, error);
      }
    });

  }, [adZones, siteAdsEnabled, placement]);

  const injectNativeAdWithContainer = (zone: GlobalAdZone, content: string, scriptId: string) => {
    // Extract container div ID
    const divMatch = content.match(/<div\s+id=["']([^"']+)["'][^>]*>/i);
    const containerId = divMatch ? divMatch[1] : null;
    
    // Extract script src
    const srcMatch = content.match(/src=["']([^"']+)["']/i);
    
    if (containerId && srcMatch && containerRef.current) {
      // Create the container div inside our component's container
      const adContainer = document.createElement('div');
      adContainer.id = containerId;
      adContainer.className = 'native-ad-container';
      containerRef.current.appendChild(adContainer);
      
      // Create and inject the script
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = srcMatch[1];
      script.async = true;
      script.setAttribute('data-cfasync', 'false');
      script.type = 'text/javascript';
      
      script.onload = () => {
        console.log(`[AdRenderer] ✅ Native ad loaded: ${zone.zone_name}`);
      };
      
      script.onerror = (e) => {
        console.error(`[AdRenderer] ❌ Failed to load native ad: ${zone.zone_name}`, e);
      };
      
      // Append script after container is in DOM
      document.body.appendChild(script);
      console.log(`[AdRenderer] ✅ Injected native ad with container: ${zone.zone_name} (container: ${containerId})`);
    } else {
      console.warn(`[AdRenderer] Could not parse native ad format for ${zone.zone_name}`);
    }
  };

  const injectFullScriptTag = (zone: GlobalAdZone, content: string, scriptId: string) => {
    const srcMatch = content.match(/src=["']([^"']+)["']/i);
    
    if (srcMatch) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = srcMatch[1];
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
      console.log(`[AdRenderer] ✅ Injected external script: ${zone.zone_name}`);
    } else {
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
    console.log(`[AdRenderer] ✅ Injected URL script: ${zone.zone_name}`);
  };

  const cleanupAdScripts = () => {
    injectedScriptsRef.current.forEach(scriptId => {
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
      }
    });
    injectedScriptsRef.current.clear();
    
    // Cleanup container contents
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    
    document.querySelectorAll('[id^="ad-script-"]').forEach(el => el.remove());
  };

  // Check if we have any native ads that need a container
  const hasNativeAds = adZones.some(zone => 
    zone.zone_id.includes('<script') && zone.zone_id.includes('<div')
  );

  // Only render container if site ads enabled AND we have native ads
  if (!siteAdsEnabled || adZones.length === 0) {
    return null;
  }

  // Render a container for native/banner ads
  return (
    <div 
      ref={containerRef}
      className="native-ad-wrapper w-full flex justify-center items-center py-2 bg-bet-dark/50"
      style={{ minHeight: hasNativeAds ? '100px' : '0' }}
    />
  );
};