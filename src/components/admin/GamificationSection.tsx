import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Gamepad2, Trophy, Flame, Star, Target, Gift, 
  Medal, TrendingUp, Save, Plus, Trash2 
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

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_value: number;
  reward_xp: number;
  reward_coins: number;
  is_active: boolean;
}

export const GamificationSection = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const [streakSettings, setStreakSettings] = useState({
    bonus_multiplier: 0.1,
    max_multiplier: 2.0
  });

  const [levelSettings, setLevelSettings] = useState({
    xp_per_level: 100,
    xp_multiplier: 1.5
  });

  const [achievementRewards, setAchievementRewards] = useState({
    follower_milestone: [10, 50, 100, 500],
    referral_badges: [5, 10, 25]
  });

  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    challenge_type: "taps",
    target_value: 10,
    reward_xp: 50,
    reward_coins: 5
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load gamification settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("gamification_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["streak_settings", "level_settings", "achievement_rewards"]);

      if (settingsError) throw settingsError;

      if (settingsData) {
        settingsData.forEach((item) => {
          if (item.setting_key === "streak_settings") {
            setStreakSettings(item.setting_value as typeof streakSettings);
          } else if (item.setting_key === "level_settings") {
            setLevelSettings(item.setting_value as typeof levelSettings);
          } else if (item.setting_key === "achievement_rewards") {
            setAchievementRewards(item.setting_value as typeof achievementRewards);
          }
        });
      }

      // Load challenges
      const { data: challengesData, error: challengesError } = await supabase
        .from("daily_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load gamification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { setting_key: "streak_settings", setting_value: streakSettings },
        { setting_key: "level_settings", setting_value: levelSettings },
        { setting_key: "achievement_rewards", setting_value: achievementRewards }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("gamification_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("Gamification settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const addChallenge = async () => {
    if (!newChallenge.title) {
      toast.error("Please enter a challenge title");
      return;
    }

    try {
      const { error } = await supabase
        .from("daily_challenges")
        .insert({
          ...newChallenge,
          is_active: true
        });

      if (error) throw error;

      toast.success("Challenge added!");
      setNewChallenge({
        title: "",
        description: "",
        challenge_type: "taps",
        target_value: 10,
        reward_xp: 50,
        reward_coins: 5
      });
      loadSettings();
    } catch (error) {
      console.error("Error adding challenge:", error);
      toast.error("Failed to add challenge");
    }
  };

  const toggleChallenge = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("daily_challenges")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      loadSettings();
    } catch (error) {
      console.error("Error toggling challenge:", error);
      toast.error("Failed to update challenge");
    }
  };

  const deleteChallenge = async (id: string) => {
    try {
      const { error } = await supabase
        .from("daily_challenges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Challenge deleted");
      loadSettings();
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("Failed to delete challenge");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Streak Settings */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Streak Settings
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how streak bonuses work for consecutive daily activity.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Bonus Multiplier Per Day</Label>
            <Input
              type="number"
              step="0.01"
              value={streakSettings.bonus_multiplier}
              onChange={(e) => setStreakSettings(prev => ({ ...prev, bonus_multiplier: parseFloat(e.target.value) || 0 }))}
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Extra earnings per streak day (e.g., 0.1 = 10% per day)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Maximum Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={streakSettings.max_multiplier}
              onChange={(e) => setStreakSettings(prev => ({ ...prev, max_multiplier: parseFloat(e.target.value) || 1 }))}
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Cap for streak multiplier (e.g., 2.0 = 100% max bonus)
            </p>
          </div>
        </div>
      </Card>

      {/* Level Progression */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Level Progression
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure XP requirements for leveling up.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-foreground">Base XP Per Level</Label>
            <Input
              type="number"
              value={levelSettings.xp_per_level}
              onChange={(e) => setLevelSettings(prev => ({ ...prev, xp_per_level: parseInt(e.target.value) || 100 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">XP Multiplier Per Level</Label>
            <Input
              type="number"
              step="0.1"
              value={levelSettings.xp_multiplier}
              onChange={(e) => setLevelSettings(prev => ({ ...prev, xp_multiplier: parseFloat(e.target.value) || 1.5 }))}
              className="bg-background border-border"
            />
            <p className="text-xs text-muted-foreground">
              Each level requires XP * multiplier more (e.g., 1.5x)
            </p>
          </div>
        </div>
      </Card>

      {/* Achievement Milestones */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Medal className="w-5 h-5 text-yellow-500" />
          Achievement Milestones
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Set milestone thresholds for badges and achievements.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              Follower Milestones (comma-separated)
            </Label>
            <Input
              value={achievementRewards.follower_milestone.join(", ")}
              onChange={(e) => setAchievementRewards(prev => ({ 
                ...prev, 
                follower_milestone: e.target.value.split(",").map(v => parseInt(v.trim()) || 0).filter(v => v > 0)
              }))}
              placeholder="10, 50, 100, 500"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Referral Milestones (comma-separated)
            </Label>
            <Input
              value={achievementRewards.referral_badges.join(", ")}
              onChange={(e) => setAchievementRewards(prev => ({ 
                ...prev, 
                referral_badges: e.target.value.split(",").map(v => parseInt(v.trim()) || 0).filter(v => v > 0)
              }))}
              placeholder="5, 10, 25"
              className="bg-background border-border"
            />
          </div>
        </div>
      </Card>

      {/* Save Settings Button */}
      <Button
        onClick={saveSettings}
        disabled={isSaving}
        className="w-full bg-primary hover:bg-primary/90"
        size="lg"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Gamification Settings
          </span>
        )}
      </Button>

      {/* Daily Challenges */}
      <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
        <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-500" />
          Daily Challenges
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Create and manage daily challenges for users.
        </p>

        {/* Add New Challenge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-secondary/30 rounded-lg">
          <div className="space-y-2">
            <Label className="text-foreground">Challenge Title</Label>
            <Input
              value={newChallenge.title}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Complete 10 taps"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Type</Label>
            <select
              value={newChallenge.challenge_type}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, challenge_type: e.target.value }))}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground"
            >
              <option value="taps">Taps</option>
              <option value="bets">Bets Placed</option>
              <option value="wins">Wins</option>
              <option value="referrals">Referrals</option>
              <option value="streak">Streak Days</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Target Value</Label>
            <Input
              type="number"
              value={newChallenge.target_value}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, target_value: parseInt(e.target.value) || 1 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">XP Reward</Label>
            <Input
              type="number"
              value={newChallenge.reward_xp}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, reward_xp: parseInt(e.target.value) || 0 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Coin Reward (₦)</Label>
            <Input
              type="number"
              value={newChallenge.reward_coins}
              onChange={(e) => setNewChallenge(prev => ({ ...prev, reward_coins: parseFloat(e.target.value) || 0 }))}
              className="bg-background border-border"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={addChallenge} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Challenge
            </Button>
          </div>
        </div>

        {/* Challenges Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Rewards</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No challenges created yet
                  </TableCell>
                </TableRow>
              ) : (
                challenges.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell className="font-medium">{challenge.title}</TableCell>
                    <TableCell className="capitalize">{challenge.challenge_type}</TableCell>
                    <TableCell>{challenge.target_value}</TableCell>
                    <TableCell>
                      <span className="text-primary">{challenge.reward_xp} XP</span>
                      {challenge.reward_coins > 0 && (
                        <span className="text-green-500 ml-2">₦{challenge.reward_coins}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={challenge.is_active}
                        onCheckedChange={() => toggleChallenge(challenge.id, challenge.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteChallenge(challenge.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
