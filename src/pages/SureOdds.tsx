import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";
import { useNavigate } from "react-router-dom";

const SureOdds = () => {
  const { sureOdds } = useBettingData();
  const navigate = useNavigate();

  const notStartedOdds = sureOdds.filter(odd => odd.status === "not-started");
  const wonGames = sureOdds.filter(odd => odd.status === "scored");
  const lostGames = sureOdds.filter(odd => odd.status === "lost");

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
        {/* Not Started Games - At Top */}
        {notStartedOdds.length > 0 && (
          <div className="mb-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Active Predictions</h2>
              <p className="text-sm text-muted-foreground">Carefully analyzed matches with high win probability</p>
            </div>

            <div className="grid gap-4">
              {notStartedOdds.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-4 hover:shadow-bet transition-all duration-300 animate-fade-in border-2 bg-gradient-card border-bet-border"
                >
                  {/* Team Logos and Names */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      {odd.homeTeamLogo ? (
                        <img
                          src={odd.homeTeamLogo}
                          alt={`${odd.homeTeam} logo`}
                          className="w-12 h-12 object-contain rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl" style={{ display: odd.homeTeamLogo ? "none" : "flex" }}>
                        ⚽
                      </div>
                      <span className="text-sm font-bold text-foreground">{odd.homeTeam}</span>
                    </div>

                    <span className="text-lg font-black text-muted-foreground px-2">VS</span>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-sm font-bold text-foreground text-right">{odd.awayTeam}</span>
                      {odd.awayTeamLogo ? (
                        <img
                          src={odd.awayTeamLogo}
                          alt={`${odd.awayTeam} logo`}
                          className="w-12 h-12 object-contain rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div className="w-12 h-12 bg-bet-dark rounded-full flex items-center justify-center text-2xl" style={{ display: odd.awayTeamLogo ? "none" : "flex" }}>
                        ⚽
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                      NOT STARTED
                    </span>
                    <p className="text-sm font-bold text-primary">
                      {odd.confidence} Confidence
                    </p>
                  </div>

                  <div className="mb-3">
                    <div className="text-center py-3 bg-secondary/50 rounded-lg border border-current">
                      <p className="text-xs text-muted-foreground mb-1 uppercase">Code</p>
                      <p className="text-xl font-black text-primary">
                        {odd.betCode}
                      </p>
                    </div>
                  </div>

                  <div className="text-center py-2 bg-secondary/50 rounded-lg border border-current">
                    <p className="text-xs text-muted-foreground mb-1 uppercase">Market</p>
                    <p className="text-sm font-bold text-foreground">{odd.prediction}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Won Games Section - At Bottom */}
        {wonGames.length > 0 && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-green-500 mb-1">✓ Won Games</h2>
              <p className="text-xs text-muted-foreground">Successful predictions</p>
            </div>

            <div className="grid gap-3">
              {wonGames.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-3 transition-all duration-300 animate-fade-in border bg-green-500/10 border-green-500/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {odd.homeTeamLogo ? (
                        <img
                          src={odd.homeTeamLogo}
                          alt={`${odd.homeTeam} logo`}
                          className="w-10 h-10 object-contain rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-bet-dark rounded-full flex items-center justify-center text-xl">⚽</div>
                      )}
                      <span className="text-xs font-bold text-foreground">{odd.homeTeam}</span>
                    </div>

                    <span className="text-sm font-black text-muted-foreground px-1">VS</span>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-xs font-bold text-foreground text-right">{odd.awayTeam}</span>
                      {odd.awayTeamLogo ? (
                        <img
                          src={odd.awayTeamLogo}
                          alt={`${odd.awayTeam} logo`}
                          className="w-10 h-10 object-contain rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-bet-dark rounded-full flex items-center justify-center text-xl">⚽</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                      WON ✓
                    </span>
                    <p className="text-xs font-bold text-foreground">{odd.confidence}</p>
                    <span className="text-xs text-muted-foreground">Code: {odd.betCode}</span>
                  </div>

                  <div className="text-center py-1 bg-secondary/30 rounded text-xs text-foreground">
                    {odd.prediction}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Lost Games Section - At Bottom */}
        {lostGames.length > 0 && (
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-red-500 mb-1">✗ Lost Games</h2>
              <p className="text-xs text-muted-foreground">These predictions didn't win</p>
            </div>

            <div className="grid gap-3">
              {lostGames.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-3 transition-all duration-300 animate-fade-in border bg-red-500/10 border-red-500/50"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      {odd.homeTeamLogo ? (
                        <img
                          src={odd.homeTeamLogo}
                          alt={`${odd.homeTeam} logo`}
                          className="w-10 h-10 object-contain rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-bet-dark rounded-full flex items-center justify-center text-xl">⚽</div>
                      )}
                      <span className="text-xs font-bold text-foreground">{odd.homeTeam}</span>
                    </div>

                    <span className="text-sm font-black text-muted-foreground px-1">VS</span>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <span className="text-xs font-bold text-foreground text-right">{odd.awayTeam}</span>
                      {odd.awayTeamLogo ? (
                        <img
                          src={odd.awayTeamLogo}
                          alt={`${odd.awayTeam} logo`}
                          className="w-10 h-10 object-contain rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-bet-dark rounded-full flex items-center justify-center text-xl">⚽</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                      LOST ✗
                    </span>
                    <p className="text-xs font-bold text-foreground">{odd.confidence}</p>
                    <span className="text-xs text-muted-foreground">Code: {odd.betCode}</span>
                  </div>

                  <div className="text-center py-1 bg-secondary/30 rounded text-xs text-foreground">
                    {odd.prediction}
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
