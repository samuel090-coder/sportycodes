import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Percent, TrendingUp, Coins, PiggyBank } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HouseEarning {
  id: string;
  betting_pool_id: string | null;
  amount: number;
  percentage: number;
  description: string | null;
  created_at: string;
}

export const HouseEarningsSection = () => {
  const [earnings, setEarnings] = useState<HouseEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [feePercentage, setFeePercentage] = useState("15");
  const [savingFee, setSavingFee] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    loadEarnings();
    loadFeePercentage();
  }, []);

  const loadEarnings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("house_earnings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setEarnings(data || []);
      setTotalEarnings(data?.reduce((sum, e) => sum + e.amount, 0) || 0);
    } catch (error) {
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeePercentage = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "house_fee_percentage")
      .maybeSingle();
    
    if (data?.setting_value) {
      setFeePercentage(data.setting_value);
    }
  };

  const handleSaveFee = async () => {
    const fee = parseFloat(feePercentage);
    if (isNaN(fee) || fee < 0 || fee > 50) {
      toast.error("Fee must be between 0% and 50%");
      return;
    }

    setSavingFee(true);
    try {
      await supabase.from("app_settings").upsert({
        setting_key: "house_fee_percentage",
        setting_value: feePercentage
      });
      toast.success(`House fee set to ${feePercentage}%`);
    } catch (error) {
      toast.error("Failed to update house fee");
    } finally {
      setSavingFee(false);
    }
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/10 border-green-500/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-green-500/20">
              <PiggyBank className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="text-2xl font-bold text-green-500">₦{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/20">
              <Percent className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Fee</p>
              <p className="text-2xl font-bold text-primary">{feePercentage}%</p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-bet-warning/20 to-bet-warning/10 border-bet-warning/30 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-bet-warning/20">
              <TrendingUp className="w-6 h-6 text-bet-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transactions</p>
              <p className="text-2xl font-bold text-bet-warning">{earnings.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fee Configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          House Fee Configuration
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label>House Fee Percentage (%)</Label>
            <Input
              type="number"
              min="0"
              max="50"
              step="1"
              value={feePercentage}
              onChange={(e) => setFeePercentage(e.target.value)}
              className="bg-secondary/50"
            />
            <p className="text-xs text-muted-foreground">
              This percentage is deducted from betting pool prizes before distribution
            </p>
          </div>
          <Button onClick={handleSaveFee} disabled={savingFee}>
            {savingFee ? "Saving..." : "Save Fee"}
          </Button>
        </div>
      </Card>

      {/* Earnings History */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-bet-warning" />
          Earnings History
        </h3>

        {earnings.length === 0 ? (
          <div className="text-center py-8">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No house earnings yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Earnings will appear here when betting pools are settled
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Fee %</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((earning) => (
                  <TableRow key={earning.id} className="border-border">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(earning.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-green-500 font-bold">
                      +₦{earning.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {earning.percentage}%
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {earning.description || "Betting pool commission"}
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
