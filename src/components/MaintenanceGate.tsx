import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const [maintenance, setMaintenance] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const [{ data: setting }, { data: { user } }] = await Promise.all([
          supabase.from("app_settings").select("setting_value").eq("setting_key", "site_maintenance").maybeSingle(),
          supabase.auth.getUser(),
        ]);

        // Only enable maintenance if explicitly set to "true"
        const isMaintenance = setting?.setting_value === "true";
        setMaintenance(isMaintenance);

        if (user && isMaintenance) {
          const { data } = await supabase.rpc("is_admin_user", { _user_id: user.id });
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error("MaintenanceGate check failed:", err);
        // On error, default to NOT blocking users
        setMaintenance(false);
      }
      setLoading(false);
    };
    check();

    const channel = supabase
      .channel("maintenance-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings", filter: "setting_key=eq.site_maintenance" },
        (payload) => {
          const record = payload.new as any;
          if (record && record.setting_value) {
            setMaintenance(record.setting_value === "true");
          } else {
            // Row deleted or empty = maintenance OFF
            setMaintenance(false);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;

  if (maintenance && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-3">Under Maintenance</h1>
          <p className="text-muted-foreground text-lg">
            This site is currently under maintenance. Please check back later.
          </p>
          <div className="mt-8 flex justify-center">
            <div className="w-16 h-1 rounded-full bg-destructive/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
