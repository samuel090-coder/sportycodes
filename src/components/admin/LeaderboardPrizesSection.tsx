import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trophy, Save, Gift, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Prize {
  id: string;
  rank_position: number;
  prize_amount: number;
  prize_type: string;
  is_active: boolean;
}

interface Distribution {
  id: string;
  user_id: string;
  prize_amount: number;
  rank_position: number;
  week_start: string;
  week_end: string;
  distributed_at: string;
}

export const LeaderboardPrizesSection = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [prizesRes, distRes] = await Promise.all([
      supabase.from("leaderboard_prizes").select("*").order("rank_position"),
      supabase.from("prize_distributions").select("*").order("distributed_at", { ascending: false }).limit(20),
    ]);
    if (prizesRes.data) setPrizes(prizesRes.data);
    if (distRes.data) setDistributions(distRes.data);
    setIsLoading(false);
  };

  const updatePrize = (id: string, field: string, value: any) => {
    setPrizes(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const savePrizes = async () => {
    setIsSaving(true);
    try {
      for (const prize of prizes) {
        await supabase.from("leaderboard_prizes").update({
          prize_amount: prize.prize_amount,
          is_active: prize.is_active,
        }).eq("id", prize.id);
      }
      toast.success("Prize amounts updated!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const distributeWeeklyPrizes = async () => {
    setIsDistributing(true);
    try {
      // Get top earners from leaderboard view
      const { data: topEarners } = await supabase
        .from("leaderboard")
        .select("id, display_name, weekly_earnings")
        .order("weekly_earnings", { ascending: false })
        .limit(prizes.length);

      if (!topEarners || topEarners.length === 0) {
        toast.error("No earners found for this week");
        return;
      }

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const activePrizes = prizes.filter(p => p.is_active);

      for (let i = 0; i < Math.min(topEarners.length, activePrizes.length); i++) {
        const earner = topEarners[i];
        const prize = activePrizes[i];

        if (!earner.id) continue;

        // Credit wallet
        await supabase.rpc("add_tap_earnings", {
          _user_id: earner.id,
          _amount: prize.prize_amount,
        });

        // Record distribution
        await supabase.from("prize_distributions").insert({
          user_id: earner.id,
          prize_amount: prize.prize_amount,
          rank_position: prize.rank_position,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        });
      }

      toast.success("Weekly prizes distributed successfully!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to distribute prizes");
    } finally {
      setIsDistributing(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* Prize Configuration */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Weekly Leaderboard Prizes
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure automatic rewards for top weekly earners. Prizes are distributed to users ranked by weekly earnings.
        </p>

        <div className="space-y-3">
          {prizes.map((prize) => (
            <div key={prize.id} className="flex items-center gap-4 p-3 bg-secondary/30 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary">
                #{prize.rank_position}
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Prize Amount (₦)</Label>
                <Input
                  type="number"
                  value={prize.prize_amount}
                  onChange={(e) => updatePrize(prize.id, "prize_amount", parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background border-border"
                />
              </div>
              <Button
                variant={prize.is_active ? "default" : "outline"}
                size="sm"
                onClick={() => updatePrize(prize.id, "is_active", !prize.is_active)}
                className="rounded-xl"
              >
                {prize.is_active ? "Active" : "Off"}
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={savePrizes} disabled={isSaving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Prizes"}
          </Button>
          <Button onClick={distributeWeeklyPrizes} disabled={isDistributing} variant="outline" className="flex-1">
            <Gift className="w-4 h-4 mr-2" />
            {isDistributing ? "Distributing..." : "Distribute Now"}
          </Button>
        </div>
      </Card>

      {/* Distribution History */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Distribution History
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No distributions yet
                  </TableCell>
                </TableRow>
              ) : distributions.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-bold">#{d.rank_position}</TableCell>
                  <TableCell className="text-green-500 font-bold">₦{d.prize_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.week_start} - {d.week_end}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(d.distributed_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
