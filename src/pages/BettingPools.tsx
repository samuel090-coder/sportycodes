import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Plus, 
  Trophy, 
  Users, 
  Coins,
  Clock,
  Target,
  Zap,
  Crown,
  TrendingUp,
  X
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { promptDeposit } from "@/lib/insufficientFunds";

interface BettingPool {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  match_details: any;
  options: any[];
  entry_fee: number;
  prize_pool: number;
  creator_deposit: number;
  winning_option: number | null;
  status: string;
  closes_at: string;
  created_at: string;
  creator?: {
    display_name: string;
    avatar_url: string;
  };
  entries_count?: number;
  user_entry?: any;
}

const BettingPools = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [pools, setPools] = useState<BettingPool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [betOpen, setBetOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<BettingPool | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [options, setOptions] = useState(["Home Win", "Draw", "Away Win"]);
  const [entryFee, setEntryFee] = useState("100");
  const [creatorDeposit, setCreatorDeposit] = useState("1000");
  const [closesAt, setClosesAt] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadPools();
      loadWallet();
      subscribeToUpdates();
    }
  }, [user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
  };

  const loadWallet = async () => {
    const { data } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    setWalletBalance(data?.balance || 0);
  };

  const loadPools = async () => {
    setIsLoading(true);
    try {
      // Only show OPEN pools to users (closed/settled/cancelled pools are hidden)
      const { data: poolsData, error } = await supabase
        .from("betting_pools")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get creator profiles
      const creatorIds = [...new Set(poolsData?.map(p => p.creator_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", creatorIds);

      // Get entries count for each pool
      const poolIds = poolsData?.map(p => p.id) || [];
      const { data: entries } = await supabase
        .from("betting_entries")
        .select("pool_id, user_id, selected_option")
        .in("pool_id", poolIds);

      const enrichedPools = poolsData?.map(pool => ({
        ...pool,
        options: Array.isArray(pool.options) ? pool.options : [],
        creator: profiles?.find(p => p.id === pool.creator_id),
        entries_count: entries?.filter(e => e.pool_id === pool.id).length || 0,
        user_entry: entries?.find(e => e.pool_id === pool.id && e.user_id === user.id)
      })) || [];

      setPools(enrichedPools);
    } catch (error) {
      console.error("Error loading pools:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel("betting_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "betting_pools" }, loadPools)
      .on("postgres_changes", { event: "*", schema: "public", table: "betting_entries" }, loadPools)
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleCreatePool = async () => {
    if (!user || !title.trim() || !closesAt) {
      toast.error("Please fill all required fields");
      return;
    }

    const depositAmount = parseFloat(creatorDeposit);
    if (depositAmount > walletBalance) {
      promptDeposit({ context: "Not enough to fund this pool." });
      return;
    }

    setIsCreating(true);
    try {
      // Deduct from wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({ balance: walletBalance - depositAmount })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // Create pool
      const { error } = await supabase.from("betting_pools").insert({
        creator_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        match_details: { home_team: homeTeam, away_team: awayTeam },
        options: options.filter(o => o.trim()).map((text, i) => ({ text, index: i })),
        entry_fee: parseFloat(entryFee),
        creator_deposit: depositAmount,
        prize_pool: depositAmount,
        closes_at: new Date(closesAt).toISOString()
      });

      if (error) throw error;

      toast.success("Betting pool created! 🎉");
      setCreateOpen(false);
      resetForm();
      loadWallet();
    } catch (error: any) {
      toast.error(error.message || "Failed to create pool");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedPool || selectedOption === null) return;

    if (selectedPool.entry_fee > walletBalance) {
      promptDeposit();
      return;
    }

    try {
      // Deduct from wallet
      await supabase
        .from("wallets")
        .update({ balance: walletBalance - selectedPool.entry_fee })
        .eq("user_id", user.id);

      // Create entry
      const { error } = await supabase.from("betting_entries").insert({
        pool_id: selectedPool.id,
        user_id: user.id,
        selected_option: selectedOption,
        amount: selectedPool.entry_fee
      });

      if (error) throw error;

      // Update prize pool
      await supabase
        .from("betting_pools")
        .update({ prize_pool: selectedPool.prize_pool + selectedPool.entry_fee })
        .eq("id", selectedPool.id);

      toast.success("Bet placed! Good luck! 🍀");
      setBetOpen(false);
      setSelectedPool(null);
      setSelectedOption(null);
      loadWallet();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setHomeTeam("");
    setAwayTeam("");
    setOptions(["Home Win", "Draw", "Away Win"]);
    setEntryFee("100");
    setCreatorDeposit("1000");
    setClosesAt("");
  };

  const getTimeRemaining = (closesAt: string) => {
    const diff = new Date(closesAt).getTime() - Date.now();
    if (diff <= 0) return "Closed";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-primary/10 via-cyber-neon-purple/10 to-cyber-neon-cyan/10 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-black text-foreground flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-bet-warning" />
                  BETTING POOLS
                </h1>
                <p className="text-xs text-muted-foreground">Predict & Win Big</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-card/80 px-3 py-1.5 rounded-full border border-primary/30">
                <span className="text-sm font-bold text-primary">₦{walletBalance.toLocaleString()}</span>
              </div>
              <Button onClick={() => setCreateOpen(true)} size="sm" className="rounded-full">
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {pools.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No Active Pools</h2>
            <p className="text-muted-foreground mb-6">Be the first to create a betting pool!</p>
            <Button onClick={() => setCreateOpen(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Create Pool
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-bet-warning to-cyber-neon-cyan rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative bg-card/80 backdrop-blur-xl rounded-xl border border-border/50 p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          pool.status === "open" 
                            ? "bg-bet-won/20 text-bet-won" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {pool.status.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeRemaining(pool.closes_at)}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{pool.title}</h3>
                      {pool.match_details?.home_team && (
                        <p className="text-sm text-muted-foreground">
                          {pool.match_details.home_team} vs {pool.match_details.away_team}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Coins className="w-4 h-4 text-bet-warning mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Prize Pool</p>
                      <p className="text-sm font-bold text-foreground">₦{pool.prize_pool.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Target className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Entry Fee</p>
                      <p className="text-sm font-bold text-foreground">₦{pool.entry_fee.toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 text-center">
                      <Users className="w-4 h-4 text-cyber-neon-cyan mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Players</p>
                      <p className="text-sm font-bold text-foreground">{pool.entries_count}</p>
                    </div>
                  </div>

                  {/* Options Preview */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {pool.options.map((opt: any, i: number) => (
                      <span 
                        key={i}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          pool.user_entry?.selected_option === i
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-muted-foreground"
                        }`}
                      >
                        {opt.text}
                      </span>
                    ))}
                  </div>

                  {/* Action */}
                  {pool.user_entry ? (
                    <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        You picked: {pool.options[pool.user_entry.selected_option]?.text}
                      </span>
                    </div>
                  ) : pool.status === "open" ? (
                    <Button
                      onClick={() => { setSelectedPool(pool); setBetOpen(true); }}
                      className="w-full rounded-xl bg-gradient-to-r from-primary to-bet-warning"
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Place Bet - ₦{pool.entry_fee}
                    </Button>
                  ) : (
                    <div className="text-center py-2 text-muted-foreground text-sm">
                      Pool Closed
                    </div>
                  )}

                  {/* Creator Badge */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                      {pool.creator?.avatar_url ? (
                        <img src={pool.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Crown className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      by {pool.creator?.display_name || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Pool Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-4 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-bet-warning" />
              Create Betting Pool
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Pool Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chelsea vs Arsenal - Who Wins?"
                className="bg-secondary/50 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Home Team</Label>
                <Input
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="Chelsea"
                  className="bg-secondary/50 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Away Team</Label>
                <Input
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="Arsenal"
                  className="bg-secondary/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Match details, predictions..."
                className="bg-secondary/50 rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Betting Options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="bg-secondary/50 rounded-xl"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOptions(opts => opts.filter((_, idx) => idx !== i))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOptions(opts => [...opts, ""])}
                  className="w-full rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entry Fee (₦)</Label>
                <Input
                  type="number"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  className="bg-secondary/50 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Your Deposit (₦)</Label>
                <Input
                  type="number"
                  value={creatorDeposit}
                  onChange={(e) => setCreatorDeposit(e.target.value)}
                  className="bg-secondary/50 rounded-xl"
                />
              </div>
            </div>

            <div className="p-3 bg-bet-warning/10 rounded-xl border border-bet-warning/20">
              <p className="text-xs text-bet-warning">
                💡 Your deposit (₦{parseFloat(creatorDeposit || "0").toLocaleString()}) starts the prize pool. 
                Winners will split the total pool equally!
              </p>
            </div>

            <div className="space-y-2">
              <Label>Closes At *</Label>
              <Input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="bg-secondary/50 rounded-xl"
              />
            </div>

            <Button
              onClick={handleCreatePool}
              disabled={isCreating || !title.trim() || !closesAt}
              className="w-full rounded-xl h-12 bg-gradient-to-r from-primary to-bet-warning"
            >
              {isCreating ? "Creating..." : "Create Pool & Deposit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Place Bet Modal */}
      <Dialog open={betOpen} onOpenChange={setBetOpen}>
        <DialogContent className="bg-card border-border rounded-2xl max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {selectedPool?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedPool && (
            <div className="space-y-4 mt-4">
              <div className="bg-gradient-to-r from-primary/10 to-bet-warning/10 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Prize Pool</p>
                <p className="text-3xl font-black text-foreground">₦{selectedPool.prize_pool.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Entry: ₦{selectedPool.entry_fee} | {selectedPool.entries_count} players
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Your Prediction</Label>
                {selectedPool.options.map((opt: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedOption(i)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      selectedOption === i
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50"
                    }`}
                  >
                    <span className="font-bold text-foreground">{opt.text}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl">
                <span className="text-sm text-muted-foreground">Your Balance</span>
                <span className="font-bold text-foreground">₦{walletBalance.toLocaleString()}</span>
              </div>

              <Button
                onClick={handlePlaceBet}
                disabled={selectedOption === null || selectedPool.entry_fee > walletBalance}
                className="w-full rounded-xl h-12 bg-gradient-to-r from-primary to-bet-warning"
              >
                <Coins className="w-4 h-4 mr-2" />
                Place Bet - ₦{selectedPool.entry_fee}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default BettingPools;