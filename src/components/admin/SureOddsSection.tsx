import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Loader2, Sparkles } from "lucide-react";
import { useBettingData, SureOdd } from "@/hooks/useBettingData";
import { supabase } from "@/integrations/supabase/client";
import { BetslipImporter } from "./BetslipImporter";

export const SureOddsSection = () => {
  const { sureOdds, addSureOdd, updateSureOdd, deleteSureOdd } = useBettingData();
  const [editingSureOdd, setEditingSureOdd] = useState<SureOdd | null>(null);
  const [sureOddHomeLogoPreview, setSureOddHomeLogoPreview] = useState<string>("");
  const [sureOddAwayLogoPreview, setSureOddAwayLogoPreview] = useState<string>("");
  const [generatingLogo, setGeneratingLogo] = useState<"home" | "away" | null>(null);

  const generateTeamLogo = async (teamName: string, logoType: "home" | "away") => {
    if (!teamName) {
      toast.error("Please enter a team name first");
      return;
    }

    setGeneratingLogo(logoType);
    try {
      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { teamName },
      });

      if (error) throw error;

      const logoUrl = data?.logoUrl;
      if (!logoUrl) throw new Error("No logo URL received");

      if (logoType === "home") {
        setSureOddHomeLogoPreview(logoUrl);
      } else {
        setSureOddAwayLogoPreview(logoUrl);
      }

      toast.success(`${teamName} logo generated!`);
    } catch (error: any) {
      console.error("Error generating logo:", error);
      toast.error(error.message || "Failed to generate logo");
    } finally {
      setGeneratingLogo(null);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "home" | "away"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (type === "home") {
          setSureOddHomeLogoPreview(result);
        } else {
          setSureOddAwayLogoPreview(result);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to process image");
    }
  };

  const handleSaveSureOdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const matchCount = parseInt(formData.get("matchCount") as string);
    const isMultiple = matchCount > 1;

    const sureOddData = {
      homeTeam: isMultiple ? "" : (formData.get("homeTeam") as string),
      awayTeam: isMultiple ? "" : (formData.get("awayTeam") as string),
      homeTeamLogo: isMultiple ? "" : sureOddHomeLogoPreview || "",
      awayTeamLogo: isMultiple ? "" : sureOddAwayLogoPreview || "",
      prediction: formData.get("prediction") as string,
      odds: parseFloat(formData.get("odds") as string),
      confidence: formData.get("confidence") as string,
      betCode: formData.get("betCode") as string,
      status: formData.get("status") as "not-started" | "scored" | "lost",
      price: parseFloat(formData.get("price") as string),
      matchCount: matchCount,
      scheduledTime: (formData.get("scheduledTime") as string) || null,
      stake: parseFloat(formData.get("stake") as string) || 0,
      payout: parseFloat(formData.get("payout") as string) || 0,
      adZoneId: formData.get("adZoneId") as string || null,
      adEnabled: (formData.get("adEnabled") as string) === "true",
    };

    try {
      if (editingSureOdd) {
        await updateSureOdd(editingSureOdd.id, sureOddData);
        toast.success("Sure odd updated successfully!");
      } else {
        await addSureOdd(sureOddData);
        toast.success("Sure odd added successfully!");
      }

      form.reset();
      setEditingSureOdd(null);
      setSureOddHomeLogoPreview("");
      setSureOddAwayLogoPreview("");
    } catch (error) {
      toast.error("Failed to save sure odd");
    }
  };

  const handleEditSureOdd = (odd: SureOdd) => {
    setEditingSureOdd(odd);
    setSureOddHomeLogoPreview(odd.homeTeamLogo || "");
    setSureOddAwayLogoPreview(odd.awayTeamLogo || "");
  };

  const handleDeleteSureOdd = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sure odd?")) return;

    try {
      await deleteSureOdd(id);
      toast.success("Sure odd deleted");
    } catch (error) {
      toast.error("Failed to delete sure odd");
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Betslip Importer */}
      <BetslipImporter />

      {/* Add/Edit Form */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-6">
        <h3 className="text-2xl font-black text-cyber-neon-green mb-6 font-mono flex items-center gap-2">
          <Sparkles className="w-6 h-6 animate-neon-pulse" />
          {editingSureOdd ? "EDIT PREDICTION" : "ADD NEW PREDICTION"}
        </h3>

        <form onSubmit={handleSaveSureOdd} className="space-y-4">
          {/* Match Count */}
          <div>
            <Label htmlFor="matchCount" className="text-cyber-neon-cyan font-mono text-sm">
              MATCH COUNT
            </Label>
            <Input
              id="matchCount"
              name="matchCount"
              type="number"
              min="1"
              required
              defaultValue={editingSureOdd?.matchCount || 1}
              onChange={(e) => {
                const isMultiple = parseInt(e.target.value) > 1;
                const homeTeamInput = document.getElementById("homeTeam") as HTMLInputElement;
                const awayTeamInput = document.getElementById("awayTeam") as HTMLInputElement;
                if (homeTeamInput && awayTeamInput) {
                  homeTeamInput.required = !isMultiple;
                  awayTeamInput.required = !isMultiple;
                }
              }}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
            />
          </div>

          {/* Team Names - Only for single match */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="homeTeam" className="text-cyber-neon-cyan font-mono text-sm">
                HOME TEAM
              </Label>
              <Input
                id="homeTeam"
                name="homeTeam"
                defaultValue={editingSureOdd?.homeTeam || ""}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const homeTeamInput = document.getElementById("homeTeam") as HTMLInputElement;
                    generateTeamLogo(homeTeamInput.value, "home");
                  }}
                  disabled={generatingLogo === "home"}
                  className="bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-mono"
                >
                  {generatingLogo === "home" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate AI Logo"}
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "home")}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-cyber-neon-cyan text-cyber-dark hover:bg-cyber-neon-green font-mono"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.parentElement as HTMLLabelElement)?.querySelector("input")?.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                </label>
              </div>
              {sureOddHomeLogoPreview && (
                <img src={sureOddHomeLogoPreview} alt="Home team logo" className="w-16 h-16 mt-2 rounded-full" />
              )}
            </div>

            <div>
              <Label htmlFor="awayTeam" className="text-cyber-neon-cyan font-mono text-sm">
                AWAY TEAM
              </Label>
              <Input
                id="awayTeam"
                name="awayTeam"
                defaultValue={editingSureOdd?.awayTeam || ""}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const awayTeamInput = document.getElementById("awayTeam") as HTMLInputElement;
                    generateTeamLogo(awayTeamInput.value, "away");
                  }}
                  disabled={generatingLogo === "away"}
                  className="bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-mono"
                >
                  {generatingLogo === "away" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate AI Logo"}
                </Button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, "away")}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-cyber-neon-cyan text-cyber-dark hover:bg-cyber-neon-green font-mono"
                    onClick={(e) => {
                      e.preventDefault();
                      (e.currentTarget.parentElement as HTMLLabelElement)?.querySelector("input")?.click();
                    }}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Upload
                  </Button>
                </label>
              </div>
              {sureOddAwayLogoPreview && (
                <img src={sureOddAwayLogoPreview} alt="Away team logo" className="w-16 h-16 mt-2 rounded-full" />
              )}
            </div>
          </div>

          {/* Other fields in grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">PREDICTION</Label>
              <Input
                name="prediction"
                defaultValue={editingSureOdd?.prediction || ""}
                required
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">ODDS</Label>
              <Input
                name="odds"
                type="number"
                step="0.01"
                defaultValue={editingSureOdd?.odds || ""}
                required
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">CONFIDENCE</Label>
              <Input
                name="confidence"
                defaultValue={editingSureOdd?.confidence || ""}
                required
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">BET CODE</Label>
              <Input
                name="betCode"
                defaultValue={editingSureOdd?.betCode || ""}
                required
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">PRICE (₦)</Label>
              <Input
                name="price"
                type="number"
                step="0.01"
                defaultValue={editingSureOdd?.price || ""}
                required
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">STATUS</Label>
              <Select name="status" defaultValue={editingSureOdd?.status || "not-started"}>
                <SelectTrigger className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cyber-panel border-cyber-neon-cyan">
                  <SelectItem value="not-started" className="text-cyber-neon-green font-mono">
                    Not Started
                  </SelectItem>
                  <SelectItem value="scored" className="text-cyber-neon-green font-mono">
                    Scored
                  </SelectItem>
                  <SelectItem value="lost" className="text-cyber-neon-green font-mono">
                    Lost
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">STAKE (₦)</Label>
              <Input
                name="stake"
                type="number"
                step="0.01"
                defaultValue={editingSureOdd?.stake || ""}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">PAYOUT (₦)</Label>
              <Input
                name="payout"
                type="number"
                step="0.01"
                defaultValue={editingSureOdd?.payout || ""}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">SCHEDULED TIME</Label>
              <Input
                name="scheduledTime"
                type="datetime-local"
                defaultValue={editingSureOdd?.scheduledTime || ""}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">AD ZONE ID</Label>
              <Input
                name="adZoneId"
                defaultValue={editingSureOdd?.adZoneId || ""}
                placeholder="Optional custom ad zone"
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
              />
            </div>
            <div>
              <Label className="text-cyber-neon-cyan font-mono text-sm">AD ENABLED</Label>
              <Select name="adEnabled" defaultValue={(editingSureOdd?.adEnabled ?? true).toString()}>
                <SelectTrigger className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-cyber-panel border-cyber-neon-cyan">
                  <SelectItem value="true" className="text-cyber-neon-green font-mono">
                    Enabled
                  </SelectItem>
                  <SelectItem value="false" className="text-cyber-neon-green font-mono">
                    Disabled
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1 bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
            >
              {editingSureOdd ? "UPDATE" : "ADD"} SURE ODD
            </Button>
            {editingSureOdd && (
              <Button
                type="button"
                onClick={() => {
                  setEditingSureOdd(null);
                  setSureOddHomeLogoPreview("");
                  setSureOddAwayLogoPreview("");
                }}
                variant="outline"
                className="border-cyber-neon-red text-cyber-neon-red hover:bg-cyber-neon-red/10 font-mono"
              >
                CANCEL
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Sure Odds List */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-cyan/50 shadow-neon-cyan p-6">
        <h3 className="text-xl font-black text-cyber-neon-cyan mb-4 font-mono">ACTIVE SURE ODDS</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-cyber-neon-cyan/30">
                <TableHead className="text-cyber-neon-green font-mono">MATCH</TableHead>
                <TableHead className="text-cyber-neon-green font-mono">CODE</TableHead>
                <TableHead className="text-cyber-neon-green font-mono">STATUS</TableHead>
                <TableHead className="text-cyber-neon-green font-mono">PRICE</TableHead>
                <TableHead className="text-cyber-neon-green font-mono">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sureOdds.map((odd) => (
                <TableRow key={odd.id} className="border-cyber-neon-cyan/20">
                  <TableCell className="text-cyber-neon-cyan font-mono">
                    {odd.matchCount > 1 ? `${odd.matchCount} MATCHES` : `${odd.homeTeam} vs ${odd.awayTeam}`}
                  </TableCell>
                  <TableCell className="text-cyber-neon-green font-mono">{odd.betCode}</TableCell>
                  <TableCell className="text-cyber-neon-purple font-mono uppercase">{odd.status}</TableCell>
                  <TableCell className="text-cyber-neon-green font-mono">₦{odd.price}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSureOdd(odd)}
                        className="text-cyber-neon-cyan hover:text-cyber-neon-green hover:bg-cyber-neon-cyan/10"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSureOdd(odd.id)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
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
    </div>
  );
};
