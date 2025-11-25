import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Loader2, Sparkles } from "lucide-react";
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
  
  const [matchHomeLogoPreview, setMatchHomeLogoPreview] = useState<string>("");
  const [matchAwayLogoPreview, setMatchAwayLogoPreview] = useState<string>("");
  const [sureOddHomeLogoPreview, setSureOddHomeLogoPreview] = useState<string>("");
  const [sureOddAwayLogoPreview, setSureOddAwayLogoPreview] = useState<string>("");
  const [generatingLogo, setGeneratingLogo] = useState<{
    match?: "home" | "away";
    sureOdd?: "home" | "away";
  }>({});

  const generateTeamLogo = async (
    teamName: string,
    field: "homeTeamLogo" | "awayTeamLogo",
    formType: "match" | "sureOdd"
  ) => {
    if (!teamName.trim()) {
      toast.error("Please enter team name first");
      return;
    }

    const logoField = field === "homeTeamLogo" ? "home" : "away";
    setGeneratingLogo(prev => ({ ...prev, [formType]: logoField }));

    try {
      const prompt = `A professional circular football club logo for ${teamName}, modern design, clean and simple, vibrant colors, high quality, on white background`;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_LOVABLE_API_KEY || ""}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "512x512",
          quality: "high",
          output_format: "png",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate logo");
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (!imageUrl) {
        throw new Error("No image URL received");
      }

      if (formType === "match") {
        if (field === "homeTeamLogo") {
          setMatchHomeLogoPreview(imageUrl);
        } else {
          setMatchAwayLogoPreview(imageUrl);
        }
      } else {
        if (field === "homeTeamLogo") {
          setSureOddHomeLogoPreview(imageUrl);
        } else {
          setSureOddAwayLogoPreview(imageUrl);
        }
      }

      toast.success("Logo generated successfully!");
    } catch (error) {
      console.error("Error generating logo:", error);
      toast.error("Failed to generate logo. Please try uploading manually.");
    } finally {
      setGeneratingLogo(prev => ({ ...prev, [formType]: undefined }));
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccount = () => {
    toast.success("Account details updated successfully!");
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const matchData = {
      homeTeam: formData.get("homeTeam") as string,
      awayTeam: formData.get("awayTeam") as string,
      homeTeamLogo: matchHomeLogoPreview || editingMatch?.homeTeamLogo || "",
      awayTeamLogo: matchAwayLogoPreview || editingMatch?.awayTeamLogo || "",
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
    setMatchHomeLogoPreview("");
    setMatchAwayLogoPreview("");
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setMatchHomeLogoPreview(match.homeTeamLogo || "");
    setMatchAwayLogoPreview(match.awayTeamLogo || "");
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
      homeTeamLogo: sureOddHomeLogoPreview || editingSureOdd?.homeTeamLogo || "",
      awayTeamLogo: sureOddAwayLogoPreview || editingSureOdd?.awayTeamLogo || "",
      prediction: formData.get("prediction") as string,
      odds: parseFloat(formData.get("odds") as string),
      confidence: formData.get("confidence") as string,
      betCode: formData.get("betCode") as string,
      status: (formData.get("status") as "not-started" | "scored" | "lost") || "not-started",
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
    setSureOddHomeLogoPreview("");
    setSureOddAwayLogoPreview("");
  };

  const handleEditSureOdd = (sureOdd: SureOdd) => {
    setEditingSureOdd(sureOdd);
    setSureOddHomeLogoPreview(sureOdd.homeTeamLogo || "");
    setSureOddAwayLogoPreview(sureOdd.awayTeamLogo || "");
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
                      Home Team Logo
                    </Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("homeTeamLogoInput")?.click()}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const homeTeam = (document.getElementById("homeTeam") as HTMLInputElement)?.value;
                            generateTeamLogo(homeTeam, "homeTeamLogo", "match");
                          }}
                          disabled={generatingLogo.match === "home"}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          {generatingLogo.match === "home" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>
                        <input
                          id="homeTeamLogoInput"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setMatchHomeLogoPreview)}
                        />
                      </div>
                      {matchHomeLogoPreview && (
                        <img
                          src={matchHomeLogoPreview}
                          alt="Home team preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-bet-border"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="awayTeamLogo" className="text-foreground">
                      Away Team Logo
                    </Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("awayTeamLogoInput")?.click()}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const awayTeam = (document.getElementById("awayTeam") as HTMLInputElement)?.value;
                            generateTeamLogo(awayTeam, "awayTeamLogo", "match");
                          }}
                          disabled={generatingLogo.match === "away"}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          {generatingLogo.match === "away" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>
                        <input
                          id="awayTeamLogoInput"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setMatchAwayLogoPreview)}
                        />
                      </div>
                      {matchAwayLogoPreview && (
                        <img
                          src={matchAwayLogoPreview}
                          alt="Away team preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-bet-border"
                        />
                      )}
                    </div>
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
                      Home Team Logo
                    </Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("sureOddHomeLogoInput")?.click()}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const homeTeam = (document.getElementById("homeTeam") as HTMLInputElement)?.value;
                            generateTeamLogo(homeTeam, "homeTeamLogo", "sureOdd");
                          }}
                          disabled={generatingLogo.sureOdd === "home"}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          {generatingLogo.sureOdd === "home" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>
                        <input
                          id="sureOddHomeLogoInput"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setSureOddHomeLogoPreview)}
                        />
                      </div>
                      {sureOddHomeLogoPreview && (
                        <img
                          src={sureOddHomeLogoPreview}
                          alt="Home team preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-bet-border"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="awayTeamLogo" className="text-foreground">
                      Away Team Logo
                    </Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("sureOddAwayLogoInput")?.click()}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const awayTeam = (document.getElementById("awayTeam") as HTMLInputElement)?.value;
                            generateTeamLogo(awayTeam, "awayTeamLogo", "sureOdd");
                          }}
                          disabled={generatingLogo.sureOdd === "away"}
                          className="border-bet-border text-foreground hover:bg-primary/20"
                        >
                          {generatingLogo.sureOdd === "away" ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>
                        <input
                          id="sureOddAwayLogoInput"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, setSureOddAwayLogoPreview)}
                        />
                      </div>
                      {sureOddAwayLogoPreview && (
                        <img
                          src={sureOddAwayLogoPreview}
                          alt="Away team preview"
                          className="w-16 h-16 rounded-full object-cover border-2 border-bet-border"
                        />
                      )}
                    </div>
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

                <div>
                  <Label htmlFor="status" className="text-foreground">
                    Game Status
                  </Label>
                  <select
                    id="status"
                    name="status"
                    defaultValue={editingSureOdd?.status || "not-started"}
                    className="mt-2 w-full bg-secondary border border-bet-border text-foreground rounded-md px-3 py-2"
                  >
                    <option value="not-started">Not Started</option>
                    <option value="scored">Scored (Won)</option>
                    <option value="lost">Lost</option>
                  </select>
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
                      <TableHead className="text-foreground">Status</TableHead>
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
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              sureOdd.status === "scored"
                                ? "bg-green-500/20 text-green-500"
                                : sureOdd.status === "lost"
                                ? "bg-red-500/20 text-red-500"
                                : "bg-yellow-500/20 text-yellow-500"
                            }`}
                          >
                            {sureOdd.status === "scored"
                              ? "WON"
                              : sureOdd.status === "lost"
                              ? "LOST"
                              : "NOT STARTED"}
                          </span>
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
