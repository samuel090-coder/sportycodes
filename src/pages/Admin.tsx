import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useBettingData, Match, SureOdd } from "@/hooks/useBettingData";

const Admin = () => {
  const {
    matches,
    sureOdds,
    addMatch,
    updateMatch,
    deleteMatch,
    addSureOdd,
    updateSureOdd,
    deleteSureOdd,
  } = useBettingData();

  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "1234567890",
    accountName: "SPORTY CODES",
    bankName: "GTBank",
  });

  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingSureOdd, setEditingSureOdd] = useState<SureOdd | null>(null);

  const handleSaveAccount = () => {
    toast.success("Account details updated successfully!");
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const matchData = {
      homeTeam: formData.get("homeTeam") as string,
      awayTeam: formData.get("awayTeam") as string,
      homeTeamLogo: formData.get("homeTeamLogo") as string,
      awayTeamLogo: formData.get("awayTeamLogo") as string,
      homeOdds: parseFloat(formData.get("homeOdds") as string),
      awayOdds: parseFloat(formData.get("awayOdds") as string),
      matchTime: formData.get("matchTime") as string,
      status: formData.get("status") as "not-started" | "live" | "completed",
      betCode: formData.get("betCode") as string,
    };

    if (editingMatch) {
      updateMatch(editingMatch.id, matchData);
      toast.success("Match updated successfully!");
      setEditingMatch(null);
    } else {
      addMatch(matchData);
      toast.success("Match added successfully!");
    }
    (e.target as HTMLFormElement).reset();
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteMatch = (id: string) => {
    deleteMatch(id);
    toast.success("Match deleted successfully!");
  };

  const handleSaveSureOdd = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const sureOddData = {
      homeTeam: formData.get("homeTeam") as string,
      awayTeam: formData.get("awayTeam") as string,
      homeTeamLogo: formData.get("homeTeamLogo") as string,
      awayTeamLogo: formData.get("awayTeamLogo") as string,
      prediction: formData.get("prediction") as string,
      odds: parseFloat(formData.get("odds") as string),
      confidence: formData.get("confidence") as string,
      betCode: formData.get("betCode") as string,
    };

    if (editingSureOdd) {
      updateSureOdd(editingSureOdd.id, sureOddData);
      toast.success("Sure Odd updated successfully!");
      setEditingSureOdd(null);
    } else {
      addSureOdd(sureOddData);
      toast.success("Sure Odd added successfully!");
    }
    (e.target as HTMLFormElement).reset();
  };

  const handleEditSureOdd = (sureOdd: SureOdd) => {
    setEditingSureOdd(sureOdd);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSureOdd = (id: string) => {
    deleteSureOdd(id);
    toast.success("Sure Odd deleted successfully!");
  };

  return (
    <div className="min-h-screen bg-bet-dark pb-8">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-black text-primary-foreground">Admin Dashboard</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Manage your betting platform</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-bet-card">
            <TabsTrigger value="account" className="data-[state=active]:bg-primary">
              Account Details
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-primary">
              Manage Matches
            </TabsTrigger>
            <TabsTrigger value="sure-odds" className="data-[state=active]:bg-primary">
              Manage Sure Odds
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-6">Update Payment Account</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bankName" className="text-foreground">
                    Bank Name
                  </Label>
                  <Input
                    id="bankName"
                    value={accountDetails.bankName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, bankName: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="accountName" className="text-foreground">
                    Account Name
                  </Label>
                  <Input
                    id="accountName"
                    value={accountDetails.accountName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountName: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber" className="text-foreground">
                    Account Number
                  </Label>
                  <Input
                    id="accountNumber"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <Button
                  onClick={handleSaveAccount}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in mb-6">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {editingMatch ? "Edit Match" : "Add New Match"}
              </h2>
              <form onSubmit={handleSaveMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeam" className="text-foreground">
                      Home Team
                    </Label>
                    <Input
                      id="homeTeam"
                      name="homeTeam"
                      required
                      defaultValue={editingMatch?.homeTeam}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayTeam" className="text-foreground">
                      Away Team
                    </Label>
                    <Input
                      id="awayTeam"
                      name="awayTeam"
                      required
                      defaultValue={editingMatch?.awayTeam}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeamLogo" className="text-foreground">
                      Home Team Logo URL
                    </Label>
                    <Input
                      id="homeTeamLogo"
                      name="homeTeamLogo"
                      placeholder="https://example.com/logo.png"
                      defaultValue={editingMatch?.homeTeamLogo}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayTeamLogo" className="text-foreground">
                      Away Team Logo URL
                    </Label>
                    <Input
                      id="awayTeamLogo"
                      name="awayTeamLogo"
                      placeholder="https://example.com/logo.png"
                      defaultValue={editingMatch?.awayTeamLogo}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeOdds" className="text-foreground">
                      Home Odds
                    </Label>
                    <Input
                      id="homeOdds"
                      name="homeOdds"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingMatch?.homeOdds}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayOdds" className="text-foreground">
                      Away Odds
                    </Label>
                    <Input
                      id="awayOdds"
                      name="awayOdds"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingMatch?.awayOdds}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="matchTime" className="text-foreground">
                      Match Time
                    </Label>
                    <Input
                      id="matchTime"
                      name="matchTime"
                      required
                      placeholder="e.g., Today 18:00"
                      defaultValue={editingMatch?.matchTime}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="status" className="text-foreground">
                      Match Status
                    </Label>
                    <Select name="status" defaultValue={editingMatch?.status || "not-started"}>
                      <SelectTrigger className="mt-2 bg-secondary border-bet-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-started">Not Started</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="betCode" className="text-foreground">
                    Betting Code
                  </Label>
                  <Input
                    id="betCode"
                    name="betCode"
                    required
                    placeholder="e.g., MU2L8-45X9K"
                    defaultValue={editingMatch?.betCode}
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold"
                  >
                    {editingMatch ? "Update Match" : "Add Match"}
                  </Button>
                  {editingMatch && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingMatch(null)}
                      className="border-bet-border text-foreground"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-6">All Matches</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Match</TableHead>
                      <TableHead className="text-foreground">Odds</TableHead>
                      <TableHead className="text-foreground">Time</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell className="text-foreground font-medium">
                          {match.homeTeam} vs {match.awayTeam}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {match.homeOdds} / {match.awayOdds}
                        </TableCell>
                        <TableCell className="text-foreground">{match.matchTime}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                              match.status === "live"
                                ? "bg-bet-success/20 text-bet-success"
                                : match.status === "not-started"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {match.status === "live"
                              ? "LIVE"
                              : match.status === "not-started"
                              ? "NOT STARTED"
                              : "COMPLETED"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditMatch(match)}
                              className="border-bet-border text-foreground hover:bg-primary/20"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMatch(match.id)}
                              className="border-bet-border text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sure-odds">
            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in mb-6">
              <h2 className="text-xl font-bold text-foreground mb-6">
                {editingSureOdd ? "Edit Sure Odd" : "Add New Sure Odd"}
              </h2>
              <form onSubmit={handleSaveSureOdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeam" className="text-foreground">
                      Home Team
                    </Label>
                    <Input
                      id="homeTeam"
                      name="homeTeam"
                      required
                      placeholder="e.g., PSG"
                      defaultValue={editingSureOdd?.homeTeam}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayTeam" className="text-foreground">
                      Away Team
                    </Label>
                    <Input
                      id="awayTeam"
                      name="awayTeam"
                      required
                      placeholder="e.g., Monaco"
                      defaultValue={editingSureOdd?.awayTeam}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeamLogo" className="text-foreground">
                      Home Team Logo URL
                    </Label>
                    <Input
                      id="homeTeamLogo"
                      name="homeTeamLogo"
                      placeholder="https://example.com/logo.png"
                      defaultValue={editingSureOdd?.homeTeamLogo}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayTeamLogo" className="text-foreground">
                      Away Team Logo URL
                    </Label>
                    <Input
                      id="awayTeamLogo"
                      name="awayTeamLogo"
                      placeholder="https://example.com/logo.png"
                      defaultValue={editingSureOdd?.awayTeamLogo}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="prediction" className="text-foreground">
                    Prediction
                  </Label>
                  <Input
                    id="prediction"
                    name="prediction"
                    required
                    placeholder="e.g., Over 2.5 Goals"
                    defaultValue={editingSureOdd?.prediction}
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="odds" className="text-foreground">
                      Odds
                    </Label>
                    <Input
                      id="odds"
                      name="odds"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingSureOdd?.odds}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confidence" className="text-foreground">
                      Confidence (e.g., 95%)
                    </Label>
                    <Input
                      id="confidence"
                      name="confidence"
                      required
                      placeholder="95%"
                      defaultValue={editingSureOdd?.confidence}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="betCode" className="text-foreground">
                      Betting Code
                    </Label>
                    <Input
                      id="betCode"
                      name="betCode"
                      required
                      placeholder="PSG5M2-GH8PL"
                      defaultValue={editingSureOdd?.betCode}
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold"
                  >
                    {editingSureOdd ? "Update Sure Odd" : "Add Sure Odd"}
                  </Button>
                  {editingSureOdd && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingSureOdd(null)}
                      className="border-bet-border text-foreground"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-6">All Sure Odds</h2>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Match</TableHead>
                      <TableHead className="text-foreground">Prediction</TableHead>
                      <TableHead className="text-foreground">Odds</TableHead>
                      <TableHead className="text-foreground">Confidence</TableHead>
                      <TableHead className="text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sureOdds.map((sureOdd) => (
                      <TableRow key={sureOdd.id}>
                        <TableCell className="text-foreground font-medium">
                          {sureOdd.homeTeam} vs {sureOdd.awayTeam}
                        </TableCell>
                        <TableCell className="text-foreground">{sureOdd.prediction}</TableCell>
                        <TableCell className="text-foreground font-bold">
                          {sureOdd.odds}
                        </TableCell>
                        <TableCell className="text-bet-success font-bold">
                          {sureOdd.confidence}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSureOdd(sureOdd)}
                              className="border-bet-border text-foreground hover:bg-primary/20"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSureOdd(sureOdd.id)}
                              className="border-bet-border text-destructive hover:bg-destructive/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
