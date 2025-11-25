import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface MatchupCardProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  time: string;
}

const MatchupCard = ({ id, homeTeam, awayTeam, homeOdds, awayOdds, time }: MatchupCardProps) => {
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away" | null>(null);
  const navigate = useNavigate();

  const handlePlaceBet = () => {
    if (selectedTeam) {
      navigate("/place-bet", {
        state: {
          matchId: id,
          homeTeam,
          awayTeam,
          selectedTeam,
          odds: selectedTeam === "home" ? homeOdds : awayOdds,
        },
      });
    }
  };

  return (
    <Card className="bg-gradient-card border-bet-border overflow-hidden hover:shadow-bet transition-all duration-300 animate-fade-in">
      <div className="p-4">
        <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
          <span className="font-semibold">{time}</span>
          <span className="text-primary">LIVE</span>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center mb-4">
          {/* Home Team */}
          <button
            onClick={() => setSelectedTeam("home")}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              selectedTeam === "home"
                ? "bg-primary text-primary-foreground shadow-bet scale-105"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl">
              ⚽
            </div>
            <span className="text-sm font-bold text-center">{homeTeam}</span>
            <span className="text-xs font-semibold">{homeOdds.toFixed(2)}</span>
          </button>

          {/* VS */}
          <div className="text-center">
            <span className="text-xl font-black text-muted-foreground">VS</span>
          </div>

          {/* Away Team */}
          <button
            onClick={() => setSelectedTeam("away")}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
              selectedTeam === "away"
                ? "bg-primary text-primary-foreground shadow-bet scale-105"
                : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl">
              ⚽
            </div>
            <span className="text-sm font-bold text-center">{awayTeam}</span>
            <span className="text-xs font-semibold">{awayOdds.toFixed(2)}</span>
          </button>
        </div>

        <Button
          onClick={handlePlaceBet}
          disabled={!selectedTeam}
          className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Place Bet
        </Button>
      </div>
    </Card>
  );
};

export default MatchupCard;
