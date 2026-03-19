import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export function MaintenanceSection() {
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("setting_value").eq("setting_key", "site_maintenance").maybeSingle();
      setMaintenance(data?.setting_value === "true");
    };
    load();
  }, []);

  const toggle = async (enabled: boolean) => {
    await supabase.from("app_settings").upsert({ setting_key: "site_maintenance", setting_value: enabled.toString() });
    setMaintenance(enabled);
    toast.success(enabled ? "Site is now in maintenance mode" : "Site is back online");
  };

  return (
    <Card className="bg-gradient-cyber border-2 border-cyber-neon-red/50 shadow-neon-red p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-cyber-neon-red" />
          <div>
            <h3 className="text-lg font-black text-cyber-neon-red font-mono">MAINTENANCE MODE</h3>
            <p className="text-xs text-cyber-neon-red/60 font-mono">Block all users from accessing the site</p>
          </div>
        </div>
        <Switch checked={maintenance} onCheckedChange={toggle} />
      </div>
      {maintenance && (
        <div className="mt-3 p-2 bg-cyber-neon-red/10 rounded border border-cyber-neon-red/30">
          <p className="text-xs text-cyber-neon-red font-mono">⚠️ Site is currently blocked. All non-admin users see a maintenance page.</p>
        </div>
      )}
    </Card>
  );
}
