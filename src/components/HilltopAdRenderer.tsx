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

  useEffect(() => {
    loadAdZones();

    // Subscribe to real-time changes
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [placement]);

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
    // Inject ad scripts dynamically
    adZones.forEach((zone) => {
      const containerId = `ad-container-${zone.id}`;
      const scriptId = `hilltop-ad-${zone.id}`;
      
      // Remove existing elements
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
      const existingContainer = document.getElementById(containerId);
      if (existingContainer) {
        existingContainer.remove();
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
      adZones.forEach((zone) => {
        const scriptId = `hilltop-ad-${zone.id}`;
        const containerId = `ad-container-${zone.id}`;
        const script = document.getElementById(scriptId);
        const container = document.getElementById(containerId);
        if (script) script.remove();
        if (container) container.remove();
      });
    };
  }, [adZones]);

  return null; // This component doesn't render anything visible
};
