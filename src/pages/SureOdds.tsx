import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";
import { useNavigate } from "react-router-dom";

const SureOdds = () => {
  const { sureOdds } = useBettingData();
  const navigate = useNavigate();

  const notStartedOdds = sureOdds.filter(odd => odd.status === "not-started");
  const passGames = sureOdds.filter(odd => odd.status === "scored" || odd.status === "lost");

  const handleViewCode = (sureOddId: string) => {
    navigate("/payment", {
      state: {
        type: "sure-odd",
        id: sureOddId,
      },
    });
  };

  return (
    <div className="min-h-screen bg-bet-dark pb-24">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-black text-primary-foreground">SURE ODDS</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Copy sure betting codes from verified predictions</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Not Started Games */}
        {notStartedOdds.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Active Predictions</h2>
              <p className="text-sm text-muted-foreground">Carefully analyzed matches with high win probability</p>
            </div>

            <div className="grid gap-6">
              {notStartedOdds.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-6 hover:shadow-bet transition-all duration-300 animate-fade-in border-2 bg-gradient-card border-bet-border"
                >
                  {/* Team Logos and Names - Always Visible */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="flex flex-col items-center gap-2">
                      {odd.homeTeamLogo ? (
                        <img
                          src={odd.homeTeamLogo}
                          alt={`${odd.homeTeam} logo`}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div className="w-16 h-16 bg-bet-dark rounded-full flex items-center justify-center text-3xl" style={{ display: odd.homeTeamLogo ? "none" : "flex" }}>
                        ⚽
                      </div>
                      <span className="text-base font-bold text-foreground">{odd.homeTeam}</span>
                    </div>

                    <span className="text-2xl font-black text-muted-foreground">VS</span>

                    <div className="flex flex-col items-center gap-2">
                      {odd.awayTeamLogo ? (
                        <img
                          src={odd.awayTeamLogo}
                          alt={`${odd.awayTeam} logo`}
                          className="w-16 h-16 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div className="w-16 h-16 bg-bet-dark rounded-full flex items-center justify-center text-3xl" style={{ display: odd.awayTeamLogo ? "none" : "flex" }}>
                        ⚽
                      </div>
                      <span className="text-base font-bold text-foreground">{odd.awayTeam}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-center mb-4">
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-bold ${
                      odd.status === "scored" 
                        ? "bg-green-500 text-white" 
                        : "bg-red-500 text-white"
                    }`}>
                      {odd.status === "scored" ? "WON ✓" : "LOST ✗"}
                    </span>
                  </div>

                  {/* Percentage Win */}
                  <div className="text-center mb-4">
                    <p className="text-xl font-black text-foreground">
                      {odd.confidence} Confidence
                    </p>
                  </div>

                  {/* Revealed Betting Code */}
                  <div className="mb-6">
                    <div className="text-center py-6 bg-secondary/50 rounded-lg border-2 border-current">
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Betting Code</p>
                      <p className="text-3xl font-black text-primary">
                        {odd.betCode}
                      </p>
                    </div>
                  </div>

                  {/* Revealed Market Info */}
                  <div className="text-center py-4 bg-secondary/50 rounded-lg border-2 border-current">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Market</p>
                    <p className="text-lg font-bold text-foreground">{odd.prediction}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default SureOdds;
