import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const PlaceBet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { homeTeam, awayTeam, selectedTeam, odds } = location.state || {};

  const [isSureWin, setIsSureWin] = useState(false);
  const [goalPrediction, setGoalPrediction] = useState("");
  const [betAmount, setBetAmount] = useState("");

  const selectedTeamName = selectedTeam === "home" ? homeTeam : awayTeam;
  const finalOdds = isSureWin && goalPrediction ? odds * 1.5 : odds;
  const potentialWin = betAmount ? (parseFloat(betAmount) * finalOdds).toFixed(2) : "0.00";

  const handleProceed = () => {
    if (betAmount && parseFloat(betAmount) > 0) {
      navigate("/payment", {
        state: {
          betAmount,
          potentialWin,
          selectedTeamName,
          homeTeam,
          awayTeam,
          isSureWin,
          goalPrediction,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-bet-dark pb-8">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-primary-foreground">Place Your Bet</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Match Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match</span>
              <span className="font-bold text-foreground">
                {homeTeam} vs {awayTeam}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Pick</span>
              <span className="font-bold text-primary">{selectedTeamName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Odds</span>
              <span className="font-bold text-foreground">{finalOdds.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <div className="space-y-4">
            <div>
              <Label htmlFor="betAmount" className="text-foreground">
                Bet Amount (₦)
              </Label>
              <Input
                id="betAmount"
                type="number"
                placeholder="Enter amount"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="mt-2 bg-secondary border-bet-border text-foreground"
              />
            </div>

            <div className="flex items-center gap-3 p-4 bg-secondary rounded-lg border border-bet-border">
              <input
                type="checkbox"
                id="sureWin"
                checked={isSureWin}
                onChange={(e) => setIsSureWin(e.target.checked)}
                className="w-5 h-5 accent-primary"
              />
              <Label htmlFor="sureWin" className="text-foreground cursor-pointer flex-1">
                Sure Win (Predict Goals for 1.5x Odds)
              </Label>
            </div>

            {isSureWin && (
              <div className="animate-slide-up">
                <Label htmlFor="goals" className="text-foreground">
                  Predict Total Goals
                </Label>
                <Input
                  id="goals"
                  type="number"
                  placeholder="e.g., 3"
                  value={goalPrediction}
                  onChange={(e) => setGoalPrediction(e.target.value)}
                  className="mt-2 bg-secondary border-bet-border text-foreground"
                />
              </div>
            )}

            <div className="pt-4 border-t border-bet-border">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Potential Win</span>
                <span className="text-3xl font-black text-primary">₦{potentialWin}</span>
              </div>

              <Button
                onClick={handleProceed}
                disabled={!betAmount || parseFloat(betAmount) <= 0 || (isSureWin && !goalPrediction)}
                className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold text-lg py-6 disabled:opacity-50"
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default PlaceBet;
