import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SureOdds = () => {
  const { sureOdds } = useBettingData();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [approvedItems, setApprovedItems] = useState<string[]>([]);

  useEffect(() => {
    // Get user email from localStorage
    const email = localStorage.getItem('user_payment_email');
    setUserEmail(email);

    // Check if user has approved payments
    const checkPaymentStatus = async () => {
      if (!email) return;

      try {
        const { data, error } = await supabase
          .from('payments')
          .select('item_id, item_type, status')
          .eq('user_email', email)
          .eq('status', 'approved')
          .eq('item_type', 'sure-odd');

        if (error) throw error;

        if (data) {
          const approvedIds = data.map(payment => payment.item_id).filter(Boolean);
          setApprovedItems(approvedIds);
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    if (email) {
      checkPaymentStatus();
    }
  }, []);

  const notStartedOdds = sureOdds.filter(odd => odd.status === "not-started");
  const wonGames = sureOdds.filter(odd => odd.status === "scored");
  const lostGames = sureOdds.filter(odd => odd.status === "lost");

  const handleViewCode = (sureOddId: string, price: number) => {
    navigate("/payment", {
      state: {
        type: "sure-odd",
        id: sureOddId,
        betAmount: price,
        potentialWin: price * 2,
      },
    });
  };

  const hasAccess = (oddId: string) => {
    return approvedItems.includes(oddId);
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
              {notStartedOdds.map((odd) => {
                const userHasAccess = hasAccess(odd.id);
                
                return (
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

                    <div className="space-y-3">
                      {/* Code Section */}
                      <div className="relative">
                        <div className="text-center py-3 bg-secondary/50 rounded-lg border border-current overflow-hidden">
                          <p className="text-xs text-muted-foreground mb-1 uppercase">Code</p>
                          <p className={`text-xl font-black text-primary ${!userHasAccess ? 'filter blur-sm select-none' : ''}`}>
                            {odd.betCode}
                          </p>
                        </div>
                        {!userHasAccess && (
                          <button
                            type="button"
                            onClick={() => handleViewCode(odd.id, odd.price)}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bet-dark/70 text-primary-foreground text-xs font-semibold"
                          >
                            <Eye className="w-5 h-5" />
                            <span>Pay ₦{odd.price} to view code</span>
                          </button>
                        )}
                      </div>

                      {/* Market Info */}
                      <div className="relative">
                        <div className="text-center py-2 bg-secondary/50 rounded-lg border border-current overflow-hidden">
                          <p className="text-xs text-muted-foreground mb-1 uppercase">Market</p>
                          <p className={`text-sm font-bold text-foreground ${!userHasAccess ? 'filter blur-sm select-none' : ''}`}>
                            {odd.prediction}
                          </p>
                        </div>
                        {!userHasAccess && (
                          <div className="absolute inset-0 flex items-center justify-center bg-bet-dark/60 pointer-events-none">
                            <span className="text-[11px] text-primary-foreground/80 font-semibold">
                              Complete payment to reveal market
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pass Games Section - Past Results at Bottom */}
        {(wonGames.length > 0 || lostGames.length > 0) && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground mb-2">Pass Games</h2>
              <p className="text-sm text-muted-foreground">Previous predictions results for transparency</p>
            </div>

            <div className="grid gap-4">
              {/* Won Games */}
              {wonGames.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-4 hover:shadow-bet transition-all duration-300 animate-fade-in border-2 bg-green-500/10 border-green-500/30"
                >
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
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500">
                      WON ✓
                    </span>
                    <p className="text-sm font-bold text-primary">
                      {odd.confidence} Confidence
                    </p>
                  </div>

                  <div className="text-center py-2 bg-secondary/50 rounded-lg border border-current">
                    <p className="text-xs text-muted-foreground mb-1 uppercase">Result</p>
                    <p className="text-sm font-bold text-foreground">{odd.prediction}</p>
                  </div>
                </Card>
              ))}

              {/* Lost Games */}
              {lostGames.map((odd) => (
                <Card
                  key={odd.id}
                  className="p-4 hover:shadow-bet transition-all duration-300 animate-fade-in border-2 bg-red-500/10 border-red-500/30"
                >
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
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-500">
                      LOST ✗
                    </span>
                    <p className="text-sm font-bold text-primary">
                      {odd.confidence} Confidence
                    </p>
                  </div>

                  <div className="text-center py-2 bg-secondary/50 rounded-lg border border-current">
                    <p className="text-xs text-muted-foreground mb-1 uppercase">Result</p>
                    <p className="text-sm font-bold text-foreground">{odd.prediction}</p>
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
