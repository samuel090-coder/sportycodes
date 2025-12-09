import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HilltopAdZone {
  id: string;
  zone_id: string;
  zone_name: string;
  placement: string;
  is_active: boolean;
}

export const HilltopAdRenderer = ({ placement }: { placement: string }) => {
  const [adZones, setAdZones] = useState<HilltopAdZone[]>([]);
  const [siteAdsEnabled, setSiteAdsEnabled] = useState(false);

  useEffect(() => {
    loadSettings();

    // Subscribe to real-time changes for both ad zones and settings
    const channel = supabase
      .channel('hilltop-ads')
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
      setSiteAdsEnabled(enabled);
      
      if (enabled) {
        loadAdZones();
      } else {
        // Clear ads when disabled
        setAdZones([]);
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

    setAdZones(data || []);
  };

  useEffect(() => {
    // Only inject ads if site ads are enabled and we have zones
    if (!siteAdsEnabled || adZones.length === 0) {
      // Cleanup any existing ad scripts when disabled
      cleanupAdScripts();
      return;
    }

    // Inject ad scripts dynamically
    adZones.forEach((zone) => {
      const scriptId = `hilltop-ad-${zone.id}`;
      
      // Remove existing script before adding new one
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      const zoneContent = zone.zone_id.trim();
      
      // Check if it's a script tag (contains <script)
      if (zoneContent.includes('<script')) {
        // Extract and execute script content
        const scriptMatch = zoneContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        if (scriptMatch) {
          const scriptContent = scriptMatch[1];
          const script = document.createElement('script');
          script.id = scriptId;
          script.textContent = scriptContent;
          document.body.appendChild(script);
          console.log(`Ad zone ${zone.zone_name}: Injected inline script`);
        }
      } else if (zoneContent.startsWith('http')) {
        // It's a direct URL - create script with src
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = zoneContent;
        script.async = true;
        document.body.appendChild(script);
        console.log(`Ad zone ${zone.zone_name}: Injected URL script - ${zoneContent}`);
      } else {
        console.warn(`Ad zone ${zone.zone_name}: Unknown format - ${zoneContent.substring(0, 50)}...`);
      }
    });

    // Cleanup function
    return () => {
      cleanupAdScripts();
    };
  }, [adZones, siteAdsEnabled]);

  const cleanupAdScripts = () => {
    // Remove all hilltop ad scripts
    document.querySelectorAll('[id^="hilltop-ad-"]').forEach(el => el.remove());
    document.querySelectorAll('[id^="ad-container-"]').forEach(el => el.remove());
  };

  return null; // This component doesn't render anything visible
};
