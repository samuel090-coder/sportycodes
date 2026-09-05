import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VipSubscriptionInfo {
  id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  price: number;
}

const REMIND_KEY = "sc_vip_renew_reminder";

const isActive = (sub: VipSubscriptionInfo | null) =>
  !!sub && sub.status === "active" && !!sub.expires_at && new Date(sub.expires_at) > new Date();

/**
 * Single source of truth for premium (VIP) membership status.
 * - auto-expires stale subscriptions server-side (security definer RPC)
 * - keeps status live via realtime + a periodic expiry check
 * - surfaces renewal reminders before expiry
 */
export const useVipStatus = (userId?: string | null, userEmail?: string | null) => {
  const [subscription, setSubscription] = useState<VipSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    // Clear out anything past its expiry date before reading.
    await supabase.rpc("expire_vip_subscriptions").catch(() => {});

    const { data } = await supabase
      .from("vip_subscriptions")
      .select("id, status, starts_at, expires_at, price")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    setSubscription((data?.[0] as VipSubscriptionInfo) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live updates + periodic expiry re-check
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`vip-status-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vip_subscriptions", filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    const interval = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, load]);

  const active = isActive(subscription);
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const daysLeft =
    active && expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

  // Renewal reminders (in-app once a day, push once a day) in the final week
  useEffect(() => {
    if (!active || daysLeft > 7 || !subscription) return;
    const today = new Date().toDateString();
    const key = `${REMIND_KEY}:${subscription.id}`;
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);

    toast.warning(
      daysLeft <= 1
        ? "Your Premium membership expires today. Renew to keep unlimited access."
        : `Your Premium membership expires in ${daysLeft} days. Renew to keep unlimited access.`,
      { duration: 8000 }
    );

    if (userEmail && !userEmail.startsWith("guest_")) {
      supabase.functions
        .invoke("send-push-notification", {
          body: {
            title: "👑 Premium expiring soon",
            body:
              daysLeft <= 1
                ? "Your Premium membership expires today. Renew now to keep unlimited access."
                : `Your Premium membership expires in ${daysLeft} days. Renew now.`,
            userEmail,
            tag: `vip-renew-${subscription.id}`,
            data: { url: "/vip" },
          },
        })
        .catch(() => {});
    }
  }, [active, daysLeft, subscription, userEmail]);

  return { subscription, isVip: active, daysLeft, expiresAt, loadingVip: loading, refreshVip: load };
};
