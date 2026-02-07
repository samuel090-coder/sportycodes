import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Trophy, Plus, Users, Calendar, DollarSign, 
  Crown, Play, Square, Gift, Trash2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Jackpot {
  id: string;
  title: string;
  description: string;
  prize_pool: number;
  entry_fee: number;
  starts_at: string;
  ends_at: string;
  status: string;
  winner_id: string | null;
}

interface JackpotWithEntries extends Jackpot {
  entry_count?: number;
}

export const JackpotPoolsSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [jackpots, setJackpots] = useState<JackpotWithEntries[]>([]);

  const [newJackpot, setNewJackpot] = useState({
    title: "",
    description: "",
    prize_pool: 10000,
    entry_fee: 100,
    starts_at: "",
    ends_at: ""
  });

  useEffect(() => {
    loadJackpots();
  }, []);

  const loadJackpots = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekly_jackpots")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get entry counts for each jackpot
      const jackpotsWithEntries = await Promise.all(
        (data || []).map(async (jackpot) => {
          const { count } = await supabase
            .from("jackpot_entries")
            .select("*", { count: "exact", head: true })
            .eq("jackpot_id", jackpot.id);
          
          return { ...jackpot, entry_count: count || 0 };
        })
      );

      setJackpots(jackpotsWithEntries);
    } catch (error) {
      console.error("Error loading jackpots:", error);
      toast.error("Failed to load jackpots");
    } finally {
      setIsLoading(false);
    }
  };

  const createJackpot = async () => {
    if (!newJackpot.title || !newJackpot.starts_at || !newJackpot.ends_at) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("weekly_jackpots")
        .insert({
          ...newJackpot,
          status: "upcoming"
        });

      if (error) throw error;

      toast.success("Jackpot created successfully!");
      setNewJackpot({
        title: "",
        description: "",
        prize_pool: 10000,
        entry_fee: 100,
        starts_at: "",
        ends_at: ""
      });
      loadJackpots();
    } catch (error) {
      console.error("Error creating jackpot:", error);
      toast.error("Failed to create jackpot");
    }
  };

  const updateJackpotStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("weekly_jackpots")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Jackpot ${status}!`);
      loadJackpots();
    } catch (error) {
      console.error("Error updating jackpot:", error);
      toast.error("Failed to update jackpot");
    }
  };

  const selectRandomWinner = async (jackpot: JackpotWithEntries) => {
    try {
      // Get all entries for this jackpot
      const { data: entries, error: entriesError } = await supabase
        .from("jackpot_entries")
        .select("user_id")
        .eq("jackpot_id", jackpot.id);

      if (entriesError) throw entriesError;

      if (!entries || entries.length === 0) {
        toast.error("No entries in this jackpot");
        return;
      }

      // Select random winner
      const randomIndex = Math.floor(Math.random() * entries.length);
      const winnerId = entries[randomIndex].user_id;

      // Update jackpot with winner
      const { error: updateError } = await supabase
        .from("weekly_jackpots")
        .update({ 
          winner_id: winnerId,
          status: "completed"
        })
        .eq("id", jackpot.id);

      if (updateError) throw updateError;

      // Credit winner's wallet using RPC
      await supabase.rpc("add_tap_earnings", { 
        _user_id: winnerId, 
        _amount: jackpot.prize_pool 
      });

      toast.success("Winner selected and prize distributed!");
      loadJackpots();
    } catch (error) {
      console.error("Error selecting winner:", error);
      toast.error("Failed to select winner");
    }
  };

  const deleteJackpot = async (id: string) => {
    try {
      const { error } = await supabase
        .from("weekly_jackpots")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Jackpot deleted");
      loadJackpots();
    } catch (error) {
      console.error("Error deleting jackpot:", error);
      toast.error("Failed to delete jackpot");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-blue-500/20 text-blue-400";
      case "active": return "bg-green-500/20 text-green-400";
      case "completed": return "bg-gray-500/20 text-gray-400";
      case "cancelled": return "bg-red-500/20 text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create New Jackpot */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Create Weekly Jackpot
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set up a new jackpot pool for users to enter and win big prizes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Jackpot Title</Label>
            <Input
              value={newJackpot.title}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Weekly Mega Jackpot"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Prize Pool (₦)</Label>
            <Input
              type="number"
              value={newJackpot.prize_pool}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, prize_pool: parseFloat(e.target.value) || 0 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Entry Fee (₦)</Label>
            <Input
              type="number"
              value={newJackpot.entry_fee}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, entry_fee: parseFloat(e.target.value) || 0 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Starts At</Label>
            <Input
              type="datetime-local"
              value={newJackpot.starts_at}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, starts_at: e.target.value }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Ends At</Label>
            <Input
              type="datetime-local"
              value={newJackpot.ends_at}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, ends_at: e.target.value }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2 md:col-span-2 lg:col-span-1">
            <Label className="text-foreground">Description (Optional)</Label>
            <Input
              value={newJackpot.description}
              onChange={(e) => setNewJackpot(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Win big this week!"
              className="bg-background border-border"
            />
          </div>
        </div>

        <Button onClick={createJackpot} className="mt-6 w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Jackpot
        </Button>
      </Card>

      {/* Jackpots List */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          All Jackpots
        </h3>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Prize Pool</TableHead>
                <TableHead>Entry Fee</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jackpots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No jackpots created yet
                  </TableCell>
                </TableRow>
              ) : (
                jackpots.map((jackpot) => (
                  <TableRow key={jackpot.id}>
                    <TableCell className="font-medium">{jackpot.title}</TableCell>
                    <TableCell className="text-green-500 font-bold">
                      ₦{jackpot.prize_pool.toLocaleString()}
                    </TableCell>
                    <TableCell>₦{jackpot.entry_fee.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {jackpot.entry_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div>{format(new Date(jackpot.starts_at), "MMM d, HH:mm")}</div>
                      <div>to {format(new Date(jackpot.ends_at), "MMM d, HH:mm")}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(jackpot.status)}>
                        {jackpot.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {jackpot.status === "upcoming" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateJackpotStatus(jackpot.id, "active")}
                            className="text-green-500"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {jackpot.status === "active" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateJackpotStatus(jackpot.id, "completed")}
                              className="text-orange-500"
                            >
                              <Square className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => selectRandomWinner(jackpot)}
                              className="text-yellow-500"
                            >
                              <Gift className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {jackpot.status !== "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteJackpot(jackpot.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};
