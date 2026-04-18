import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trophy, Users, Coins, CheckCircle, Clock, Award, XCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BettingPool {
  id: string;
  title: string;
  description: string | null;
  options: any[];
  prize_pool: number;
  entry_fee: number;
  status: string;
  winning_option: number | null;
  creator_id: string;
  creator_deposit: number;
  closes_at: string;
  created_at: string;
  entries_count?: number;
}

interface BettingEntry {
  id: string;
  user_id: string;
  selected_option: number;
  amount: number;
  is_winner: boolean | null;
  payout: number | null;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}

export const BettingPoolsSection = () => {
  const [pools, setPools] = useState<BettingPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<BettingPool | null>(null);
  const [entries, setEntries] = useState<BettingEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [winningOption, setWinningOption] = useState<string>("");
  const [settlementType, setSettlementType] = useState<"win" | "lose">("win");
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    fetchPools();
    
    const channel = supabase
      .channel("admin_betting_pools")
      .on("postgres_changes", { event: "*", schema: "public", table: "betting_pools" }, fetchPools)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPools = async () => {
    setLoading(true);
    try {
      const { data: poolsData, error } = await supabase
        .from("betting_pools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const poolIds = poolsData?.map(p => p.id) || [];
      const { data: entriesData } = await supabase
        .from("betting_entries")
        .select("pool_id")
        .in("pool_id", poolIds);

      const enrichedPools = poolsData?.map(pool => ({
        ...pool,
        options: Array.isArray(pool.options) ? pool.options : [],
        entries_count: entriesData?.filter(e => e.pool_id === pool.id).length || 0
      })) || [];

      setPools(enrichedPools);
    } catch (error) {
      console.error("Error fetching pools:", error);
      toast.error("Failed to load betting pools");
    } finally {
      setLoading(false);
    }
  };

  const fetchPoolEntries = async (pool: BettingPool) => {
    setLoadingEntries(true);
    try {
      const { data: entriesData, error } = await supabase
        .from("betting_entries")
        .select("*")
        .eq("pool_id", pool.id);

      if (error) throw error;

      const userIds = entriesData?.map(e => e.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      const enrichedEntries = entriesData?.map(entry => ({
        ...entry,
        profile: profiles?.find(p => p.id === entry.user_id)
      })) || [];

      setEntries(enrichedEntries);
    } catch (error) {
      console.error("Error fetching entries:", error);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleViewPool = (pool: BettingPool) => {
    setSelectedPool(pool);
    fetchPoolEntries(pool);
  };

  const handleOpenSettle = (pool: BettingPool) => {
    setSelectedPool(pool);
    setWinningOption("");
    setSettlementType("win");
    setSettleOpen(true);
  };

  const handleSettlePool = async () => {
    if (!selectedPool) return;

    // For "win" mode, require a winning option
    if (settlementType === "win" && !winningOption) {
      toast.error("Please select a winning option");
      return;
    }

    setIsSettling(true);
    try {
      const { data: entriesData, error: entriesError } = await supabase
        .from("betting_entries")
        .select("*")
        .eq("pool_id", selectedPool.id);

      if (entriesError) throw entriesError;

      const prizePool = selectedPool.prize_pool;

      // Load house fee percentage
      const { data: feeData } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "house_fee_percentage")
        .maybeSingle();
      
      const houseFeePercent = parseFloat(feeData?.setting_value || "15");
      const houseFee = Math.floor(prizePool * (houseFeePercent / 100));
      const distributablePrize = prizePool - houseFee;

      if (settlementType === "win") {
        // WIN MODE: Distribute to participants who picked the winning option
        const winningIdx = parseInt(winningOption);
        const winningOptionLabel = selectedPool.options[winningIdx]?.text || `Option ${winningIdx + 1}`;
        
        const winners = entriesData?.filter(e => e.selected_option === winningIdx) || [];
        const payoutPerWinner = winners.length > 0 ? Math.floor(distributablePrize / winners.length) : 0;

        // Record house earnings
        if (houseFee > 0) {
          await supabase.from("house_earnings").insert({
            betting_pool_id: selectedPool.id,
            amount: houseFee,
            percentage: houseFeePercent,
            description: `Commission from "${selectedPool.title}"`
          });
        }

        // Mark entries as winners/losers
        for (const entry of entriesData || []) {
          const isWinner = entry.selected_option === winningIdx;
          await supabase
            .from("betting_entries")
            .update({
              is_winner: isWinner,
              payout: isWinner ? payoutPerWinner : 0
            })
            .eq("id", entry.id);
        }

        // Credit winners' wallets
        for (const winner of winners) {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("balance")
            .eq("user_id", winner.user_id)
            .single();

          await supabase
            .from("wallets")
            .update({ balance: (wallet?.balance || 0) + payoutPerWinner })
            .eq("user_id", winner.user_id);

          // Send winner notification (push)
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-pool-winner`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: winner.user_id,
              poolTitle: selectedPool.title,
              amount: payoutPerWinner
            })
          }).catch(console.error);

          // Send branded congrats email
          supabase.functions.invoke('send-email', {
            body: {
              type: 'win_pool',
              userId: winner.user_id,
              data: { poolTitle: selectedPool.title, payoutAmount: payoutPerWinner }
            }
          }).catch(console.error);
        }

        // Update pool status
        await supabase
          .from("betting_pools")
          .update({
            status: "settled",
            winning_option: winningIdx,
            settled_at: new Date().toISOString()
          })
          .eq("id", selectedPool.id);

        // Send results notification
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-pool-results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poolId: selectedPool.id,
            poolTitle: selectedPool.title,
            winningOption: winningIdx,
            winningOptionLabel
          })
        }).catch(console.error);

        toast.success(`Pool settled! ${winners.length} winners received ₦${payoutPerWinner.toLocaleString()} each. House earned ₦${houseFee.toLocaleString()} (${houseFeePercent}%)`);
      } else {
        // LOSE MODE: Return prize pool to creator
        const { data: creatorWallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", selectedPool.creator_id)
          .single();

        await supabase
          .from("wallets")
          .update({ balance: (creatorWallet?.balance || 0) + prizePool })
          .eq("user_id", selectedPool.creator_id);

        // Mark all entries as lost
        for (const entry of entriesData || []) {
          await supabase
            .from("betting_entries")
            .update({ is_winner: false, payout: 0 })
            .eq("id", entry.id);
        }

        // Update pool status as cancelled/lost
        await supabase
          .from("betting_pools")
          .update({
            status: "cancelled",
            settled_at: new Date().toISOString()
          })
          .eq("id", selectedPool.id);

        toast.success(`Pool marked as lost. ₦${prizePool.toLocaleString()} returned to creator.`);
      }

      setSettleOpen(false);
      setSelectedPool(null);
      fetchPools();
    } catch (error: any) {
      console.error("Error settling pool:", error);
      toast.error(error.message || "Failed to settle pool");
    } finally {
      setIsSettling(false);
    }
  };

  const handleClosePool = async (pool: BettingPool) => {
    try {
      await supabase
        .from("betting_pools")
        .update({ status: "closed" })
        .eq("id", pool.id);

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-pool-closed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poolId: pool.id,
          poolTitle: pool.title
        })
      }).catch(console.error);

      toast.success("Pool closed and participants notified");
      fetchPools();
    } catch (error) {
      toast.error("Failed to close pool");
    }
  };

  const handleRefundPool = async (pool: BettingPool) => {
    try {
      const { data: entriesData } = await supabase
        .from("betting_entries")
        .select("*")
        .eq("pool_id", pool.id);

      for (const entry of entriesData || []) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", entry.user_id)
          .single();

        await supabase
          .from("wallets")
          .update({ balance: (wallet?.balance || 0) + entry.amount })
          .eq("user_id", entry.user_id);
      }

      const { data: creatorWallet } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", pool.creator_id)
        .single();

      await supabase
        .from("wallets")
        .update({ balance: (creatorWallet?.balance || 0) + pool.creator_deposit })
        .eq("user_id", pool.creator_id);

      await supabase
        .from("betting_pools")
        .update({ status: "cancelled" })
        .eq("id", pool.id);

      toast.success("Pool cancelled and all participants refunded");
      fetchPools();
    } catch (error) {
      toast.error("Failed to refund pool");
    }
  };

  const handleDeletePool = async (pool: BettingPool) => {
    try {
      // Delete entries first
      await supabase
        .from("betting_entries")
        .delete()
        .eq("pool_id", pool.id);

      // Delete pool
      await supabase
        .from("betting_pools")
        .delete()
        .eq("id", pool.id);

      toast.success("Pool removed from system");
      fetchPools();
    } catch (error) {
      toast.error("Failed to delete pool");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: "bg-green-500/20 text-green-500 border-green-500/30",
      closed: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      settled: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      cancelled: "bg-red-500/20 text-red-500 border-red-500/30"
    };
    return styles[status] || styles.open;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-bet-warning" />
          Betting Pools Management
        </h3>

        {pools.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No betting pools yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Prize Pool</TableHead>
                  <TableHead className="text-muted-foreground">Players</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Closes At</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.map((pool) => (
                  <TableRow key={pool.id} className="border-border">
                    <TableCell className="text-foreground font-medium">{pool.title}</TableCell>
                    <TableCell className="text-bet-warning font-bold">
                      ₦{pool.prize_pool.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {pool.entries_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(pool.status)}>
                        {pool.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(pool.closes_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewPool(pool)}
                        >
                          View
                        </Button>
                        {pool.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClosePool(pool)}
                            className="border-yellow-500 text-yellow-500"
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Close
                          </Button>
                        )}
                        {pool.status === "closed" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenSettle(pool)}
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Award className="w-4 h-4 mr-1" />
                              Settle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefundPool(pool)}
                              className="border-red-500 text-red-500"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Refund
                            </Button>
                          </>
                        )}
                        {(pool.status === "settled" || pool.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePool(pool)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* View Pool Entries Dialog */}
      <Dialog open={!!selectedPool && !settleOpen} onOpenChange={() => setSelectedPool(null)}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-bet-warning" />
              {selectedPool?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Coins className="w-5 h-5 text-bet-warning mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Prize Pool</p>
                <p className="font-bold text-foreground">₦{selectedPool?.prize_pool.toLocaleString()}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Participants</p>
                <p className="font-bold text-foreground">{entries.length}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <Badge variant="outline" className={getStatusBadge(selectedPool?.status || "open")}>
                  {selectedPool?.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {loadingEntries ? (
              <Skeleton className="h-32 w-full" />
            ) : entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No entries yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Pick</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                          {entry.profile?.avatar_url ? (
                            <img src={entry.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-foreground">{entry.profile?.display_name || "User"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {selectedPool?.options[entry.selected_option]?.text || `Option ${entry.selected_option + 1}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">₦{entry.amount}</TableCell>
                      <TableCell>
                        {entry.is_winner === true && (
                          <span className="flex items-center gap-1 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            Won ₦{entry.payout}
                          </span>
                        )}
                        {entry.is_winner === false && (
                          <span className="text-red-500">Lost</span>
                        )}
                        {entry.is_winner === null && (
                          <span className="text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settle Pool Dialog with Win/Lose Toggle */}
      <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Settle Pool: {selectedPool?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Win/Lose Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Settlement Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSettlementType("win")}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    settlementType === "win"
                      ? "border-green-500 bg-green-500/10"
                      : "border-border hover:border-green-500/50"
                  }`}
                >
                  <ThumbsUp className={`w-6 h-6 ${settlementType === "win" ? "text-green-500" : "text-muted-foreground"}`} />
                  <span className={`font-bold ${settlementType === "win" ? "text-green-500" : "text-foreground"}`}>
                    WIN
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Distribute to participants
                  </span>
                </button>
                <button
                  onClick={() => setSettlementType("lose")}
                  className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                    settlementType === "lose"
                      ? "border-red-500 bg-red-500/10"
                      : "border-border hover:border-red-500/50"
                  }`}
                >
                  <ThumbsDown className={`w-6 h-6 ${settlementType === "lose" ? "text-red-500" : "text-muted-foreground"}`} />
                  <span className={`font-bold ${settlementType === "lose" ? "text-red-500" : "text-foreground"}`}>
                    LOSE
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    Return to pool creator
                  </span>
                </button>
              </div>
            </div>

            {settlementType === "win" && (
              <>
                <p className="text-muted-foreground text-sm">
                  Select the winning option. The prize pool of ₦{selectedPool?.prize_pool.toLocaleString()} will be split equally among all winners.
                </p>

                <RadioGroup value={winningOption} onValueChange={setWinningOption}>
                  {selectedPool?.options.map((opt: any, idx: number) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
                      <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer font-medium">
                        {opt.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </>
            )}

            {settlementType === "lose" && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <p className="text-sm text-foreground">
                  The entire prize pool of <strong>₦{selectedPool?.prize_pool.toLocaleString()}</strong> will be returned to the pool creator.
                  All participants will be marked as lost.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSettlePool}
              disabled={isSettling || (settlementType === "win" && !winningOption)}
              className={settlementType === "win" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isSettling ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Settling...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {settlementType === "win" ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
                  Confirm {settlementType === "win" ? "Win" : "Lose"}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
