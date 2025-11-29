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
    // Inject HilltopAds scripts dynamically
    adZones.forEach((zone) => {
      const scriptId = `hilltop-ad-${zone.id}`;
      
      // Remove existing script if it exists
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      // Create new script element
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = zone.zone_id; // The zone_id contains the full script URL
      script.async = true;
      document.body.appendChild(script);
    });

    // Cleanup function
    return () => {
      adZones.forEach((zone) => {
        const scriptId = `hilltop-ad-${zone.id}`;
        const script = document.getElementById(scriptId);
        if (script) {
          script.remove();
        }
      });
    };
  }, [adZones]);

  return null; // This component doesn't render anything visible
};
