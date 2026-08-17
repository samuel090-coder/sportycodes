import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Joins a global realtime presence channel so the admin usage dashboard
 * can count how many clients are currently connected.
 */
const PresenceTracker = () => {
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const userId = data.session?.user?.id ?? null;
      const key = userId ?? `guest-${Math.random().toString(36).slice(2, 10)}`;

      channel = supabase.channel("global-presence", {
        config: { presence: { key } },
      });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel?.track({
            user_id: userId,
            guest: !userId,
            online_at: new Date().toISOString(),
          });
        }
      });
    };

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

export default PresenceTracker;
