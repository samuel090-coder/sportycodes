import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface MatchupCardProps {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeOdds: number;
  awayOdds: number;
  time: string;
  status: "not-started" | "live" | "completed";
}

const MatchupCard = ({
  id,
  homeTeam,
  awayTeam,
  homeTeamLogo,
  awayTeamLogo,
  homeOdds,
  awayOdds,
  time,
  status,
}: MatchupCardProps) => {
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
          {status === "live" && (
            <div className="flex items-center gap-2 bg-bet-success/20 px-2 py-1 rounded-full animate-pulse-glow">
              <div className="w-2 h-2 bg-bet-success rounded-full animate-pulse" />
              <span className="text-xs font-bold text-bet-success">LIVE</span>
            </div>
          )}
          {status === "completed" && (
            <span className="text-xs font-bold text-muted-foreground px-2 py-1 rounded-full bg-muted/50">
              COMPLETED
            </span>
          )}
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
            {homeTeamLogo ? (
              <img
                src={homeTeamLogo}
                alt={`${homeTeam} logo`}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl">
                ⚽
              </div>
            )}
            <div className="fallback-icon w-12 h-12 bg-bet-dark rounded-full items-center justify-center text-2xl" style={{ display: "none" }}>
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
            {awayTeamLogo ? (
              <img
                src={awayTeamLogo}
                alt={`${awayTeam} logo`}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".fallback-icon");
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
            ) : (
              <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl">
                ⚽
              </div>
            )}
            <div className="fallback-icon w-12 h-12 bg-bet-dark rounded-full items-center justify-center text-2xl" style={{ display: "none" }}>
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
