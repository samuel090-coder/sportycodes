import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const VIP_PRICE_KEY = "vip_monthly_price";
export const DEFAULT_VIP_PRICE = 2000;

/**
 * Single source of truth for the premium (VIP) monthly price.
 * Reads app_settings and stays in sync in real time with admin changes.
 */
export const useVipPrice = () => {
  const [price, setPrice] = useState<number>(DEFAULT_VIP_PRICE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", VIP_PRICE_KEY)
        .maybeSingle();

      if (!active) return;
      const parsed = parseFloat(String(data?.setting_value ?? ""));
      setPrice(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VIP_PRICE);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("vip-price-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
          filter: `setting_key=eq.${VIP_PRICE_KEY}`,
        },
        (payload) => {
          const value = (payload.new as any)?.setting_value;
          const parsed = parseFloat(String(value ?? ""));
          if (Number.isFinite(parsed) && parsed > 0) setPrice(parsed);
        }
      )
      .subscribe();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
    };
  }, []);

  return { vipPrice: price, loadingPrice: loading };
};
