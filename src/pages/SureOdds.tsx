import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";
import { useNavigate } from "react-router-dom";

const SureOdds = () => {
  const { sureOdds } = useBettingData();
  const navigate = useNavigate();

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
          <p className="text-sm text-primary-foreground/80 mt-1">High Confidence Predictions</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Expert Predictions</h2>
          <p className="text-sm text-muted-foreground">Carefully analyzed matches with high win probability</p>
        </div>

        <div className="grid gap-6">
          {sureOdds.map((odd) => (
            <Card
              key={odd.id}
              className="bg-gradient-card border-bet-border p-6 hover:shadow-bet transition-all duration-300 animate-fade-in"
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

              {/* Percentage Win - Always Visible */}
              <div className="text-center mb-4">
                <p className="text-2xl font-black text-bet-success">
                  {odd.confidence} Sure Win
                </p>
              </div>

              {/* Blurred Betting Code - Main Element */}
              <div className="relative mb-6">
                <div className="text-center py-8 bg-secondary/50 rounded-lg border-2 border-bet-border">
                  <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">Betting Code</p>
                  <p className="text-4xl font-black text-primary blur-lg select-none">
                    {odd.betCode}
                  </p>
                </div>
                
                {/* Eye Icon to Reveal - Redirects to Payment */}
                <button
                  onClick={() => handleViewCode(odd.id)}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-primary hover:opacity-90 transition-all duration-300 p-4 rounded-full shadow-bet"
                  aria-label="Unlock betting code"
                >
                  <Eye className="w-8 h-8 text-primary-foreground" />
                </button>
              </div>

              {/* Hidden Market Info - Only shown after payment */}
              <div className="text-center py-4 bg-secondary/50 rounded-lg border-2 border-bet-border relative">
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Market</p>
                <p className="text-lg font-bold text-foreground blur-md select-none">{odd.prediction}</p>
              </div>
            </Card>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SureOdds;
