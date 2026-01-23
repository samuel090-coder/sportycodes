import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Crown, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VIPSubscription {
  id: string;
  user_id: string;
  price: number;
  status: string;
  payment_reference: string | null;
  payment_screenshot_url: string | null;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  profile?: {
    display_name: string;
  };
}

export const VIPSubscriptionsSection = () => {
  const [subscriptions, setSubscriptions] = useState<VIPSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [vipPrice, setVipPrice] = useState("2000");
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    loadSubscriptions();
    loadVipPrice();

    const channel = supabase
      .channel("admin_vip_subs")
      .on("postgres_changes", { event: "*", schema: "public", table: "vip_subscriptions" }, loadSubscriptions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vip_subscriptions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get profiles
      const userIds = data?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      const enriched = data?.map(sub => ({
        ...sub,
        profile: profiles?.find(p => p.id === sub.user_id)
      })) || [];

      setSubscriptions(enriched);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadVipPrice = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "vip_monthly_price")
      .maybeSingle();
    
    if (data?.setting_value) {
      setVipPrice(data.setting_value);
    }
  };

  const handleSavePrice = async () => {
    setSavingPrice(true);
    try {
      await supabase.from("app_settings").upsert({
        setting_key: "vip_monthly_price",
        setting_value: vipPrice
      });
      toast.success("VIP price updated!");
    } catch (error) {
      toast.error("Failed to update price");
    } finally {
      setSavingPrice(false);
    }
  };

  const handleApprove = async (sub: VIPSubscription) => {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await supabase
        .from("vip_subscriptions")
        .update({
          status: "active",
          starts_at: now.toISOString(),
          expires_at: expiresAt.toISOString()
        })
        .eq("id", sub.id);

      toast.success("VIP subscription approved!");
      loadSubscriptions();
    } catch (error) {
      toast.error("Failed to approve subscription");
    }
  };

  const handleReject = async (sub: VIPSubscription) => {
    try {
      await supabase
        .from("vip_subscriptions")
        .update({ status: "cancelled" })
        .eq("id", sub.id);

      toast.success("Subscription rejected");
      loadSubscriptions();
    } catch (error) {
      toast.error("Failed to reject subscription");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      active: "bg-green-500/20 text-green-500 border-green-500/30",
      expired: "bg-muted text-muted-foreground border-border",
      cancelled: "bg-red-500/20 text-red-500 border-red-500/30"
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* VIP Price Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-bet-warning" />
          VIP Pricing
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>Monthly VIP Price (₦)</Label>
            <Input
              type="number"
              value={vipPrice}
              onChange={(e) => setVipPrice(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <Button onClick={handleSavePrice} disabled={savingPrice}>
            {savingPrice ? "Saving..." : "Save Price"}
          </Button>
        </div>
      </Card>

      {/* Subscriptions List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-bet-warning" />
          VIP Subscriptions
        </h3>

        {subscriptions.length === 0 ? (
          <div className="text-center py-8">
            <Crown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No VIP subscriptions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Expires</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id} className="border-border">
                    <TableCell className="text-foreground font-medium">
                      {sub.profile?.display_name || "Unknown"}
                    </TableCell>
                    <TableCell className="text-bet-warning font-bold">
                      ₦{sub.price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(sub.status)}>
                        {sub.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {sub.expires_at 
                        ? new Date(sub.expires_at).toLocaleDateString()
                        : "-"
                      }
                    </TableCell>
                    <TableCell>
                      {sub.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(sub)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(sub)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {sub.status === "active" && (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
