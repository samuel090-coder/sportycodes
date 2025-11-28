import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Eye, CreditCard, Play } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationPrompt } from "@/components/NotificationPrompt";

const SureOdds = () => {
  const { sureOdds, isLoading } = useBettingData();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [approvedItems, setApprovedItems] = useState<string[]>([]);
  const [, setRefreshTrigger] = useState(0);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedOdd, setSelectedOdd] = useState<typeof sureOdds[0] | null>(null);

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
      
      // Subscribe to real-time updates for payment approvals
      const paymentChannel = supabase
        .channel('payment-approvals')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payments',
            filter: `user_email=eq.${email}`
          },
          (payload) => {
            console.log('Payment status updated:', payload);
            if (payload.new.status === 'approved') {
              setApprovedItems(prev => [...prev, payload.new.item_id]);
              toast.success('Your payment has been approved! You can now view the code.');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(paymentChannel);
      };
    }
  }, []);

  // Real-time subscription for sure odds updates
  useEffect(() => {
    const oddsChannel = supabase
      .channel('sure-odds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sure_odds'
        },
        (payload) => {
          console.log('Sure odds updated:', payload);
          // Trigger a re-fetch by updating the refresh trigger
          setRefreshTrigger(prev => prev + 1);
          toast.success('New odds available!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(oddsChannel);
    };
  }, []);

  // Auto-refresh to check for scheduled games every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force a re-render to check scheduled times more frequently
      setRefreshTrigger(prev => prev + 1);
    }, 5000); // Check every 5 seconds for near-instant LIVE updates

    return () => clearInterval(interval);
  }, []);

  const notStartedOdds = sureOdds.filter(odd => odd.status === "not-started");
  const wonGames = sureOdds.filter(odd => odd.status === "scored");
  const lostGames = sureOdds.filter(odd => odd.status === "lost");

  const handleViewCode = (odd: typeof sureOdds[0]) => {
    setSelectedOdd(odd);
    setUnlockDialogOpen(true);
  };

  const handlePayOption = () => {
    if (!selectedOdd) return;
    setUnlockDialogOpen(false);
    navigate("/payment", {
      state: {
        type: "sure-odd",
        id: selectedOdd.id,
        stake: selectedOdd.stake,
        payout: selectedOdd.payout,
        prediction: selectedOdd.prediction,
        homeTeam: selectedOdd.homeTeam,
        awayTeam: selectedOdd.awayTeam,
        matchCount: selectedOdd.matchCount,
        price: selectedOdd.price,
      },
    });
  };

  const handleWatchAdOption = async () => {
    if (!selectedOdd) return;
    setUnlockDialogOpen(false);
    
    const email = userEmail || 'guest_' + Date.now();
    if (!userEmail) {
      localStorage.setItem('user_payment_email', email);
      setUserEmail(email);
    }

    try {
      // Check if user has attempted to watch an ad for this odd in the last 24 hours
      const { data: attempts, error: checkError } = await supabase
        .from('ad_view_attempts')
        .select('*')
        .eq('user_email', email)
        .eq('sure_odd_id', selectedOdd.id)
        .order('attempted_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;

      if (attempts && attempts.length > 0) {
        const lastAttempt = new Date(attempts[0].attempted_at);
        const now = new Date();
        const hoursSinceLastAttempt = (now.getTime() - lastAttempt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastAttempt < 24) {
          const hoursLeft = Math.ceil(24 - hoursSinceLastAttempt);
          toast.error(
            `Please wait ${hoursLeft} hours before watching another ad, or use the payment option.`,
            { duration: 5000 }
          );
          return;
        }
      }

      // Record this attempt in the database
      const { error: insertError } = await supabase
        .from('ad_view_attempts')
        .insert({
          user_email: email,
          sure_odd_id: selectedOdd.id,
          granted_access: false
        });

      if (insertError) throw insertError;

      // Check if this odd has a custom ad zone
      const adZoneId = selectedOdd.adZoneId || '10250664'; // Default to existing zone

      toast.info('Loading ad... Please watch completely to unlock.', { duration: 3000 });

      // Dynamically inject ad script for this specific zone
      const adScript = document.createElement('script');
      adScript.setAttribute('data-zone', adZoneId);
      adScript.src = 'https://groleegni.net/vignette.min.js';
      adScript.onload = () => {
        // Create trigger to activate the ad
        const adTrigger = document.createElement('a');
        adTrigger.href = '#';
        adTrigger.style.position = 'fixed';
        adTrigger.style.top = '-1000px';
        document.body.appendChild(adTrigger);
        
        setTimeout(() => {
          adTrigger.click();
          document.body.removeChild(adTrigger);
          
          // Grant access after ad display time
          setTimeout(async () => {
            setApprovedItems(prev => [...prev, selectedOdd.id]);
            
            // Update attempt to mark access granted
            await supabase
              .from('ad_view_attempts')
              .update({ granted_access: true })
              .eq('user_email', email)
              .eq('sure_odd_id', selectedOdd.id)
              .order('attempted_at', { ascending: false })
              .limit(1);

            toast.success('Code unlocked! Thank you for watching.');
            document.head.removeChild(adScript);
          }, 8000);
        }, 500);
      };
      
      document.head.appendChild(adScript);

    } catch (error: any) {
      console.error('Error checking ad attempts:', error);
      toast.error('Failed to load ad. Please try the payment option.');
    }
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
        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center animate-pulse">
                <span className="text-4xl">⚽</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Loading Sure Odds...</h2>
            <p className="text-muted-foreground">
              Please wait while we fetch the latest predictions
            </p>
          </div>
        ) : (
          <>
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
                const isMultipleMatches = odd.matchCount > 1;
                
                return (
                  <Card
                    key={odd.id}
                    className="p-4 hover:shadow-bet transition-all duration-300 animate-fade-in border-2 bg-gradient-card border-bet-border"
                  >
                    {/* Display logic based on match count */}
                    {isMultipleMatches ? (
                      /* Multiple matches - show count */
                      <div className="flex items-center justify-center mb-3">
                        <h3 className="text-2xl font-black text-primary">
                          {odd.matchCount} SURE ODDS
                        </h3>
                      </div>
                    ) : (
                      /* Single match - show team logos and names */
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
                    )}

                    <div className="flex items-center justify-between mb-3">
                      {(() => {
                        if (odd.scheduledTime) {
                          const scheduledDate = new Date(odd.scheduledTime);
                          const now = new Date();
                          const isLive = now >= scheduledDate;
                          
                          if (isLive) {
                            return (
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 animate-pulse">
                                🔴 LIVE NOW
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">
                                NOT STARTED
                              </span>
                            );
                          }
                        } else {
                          return (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500 animate-pulse">
                              🔴 LIVE NOW
                            </span>
                          );
                        }
                      })()}
                      <p className="text-sm font-bold text-primary">
                        {odd.confidence} Confidence
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Stake and Payout Row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center py-2 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-lg border border-green-500/30">
                          <p className="text-[10px] text-green-400 mb-1 uppercase font-bold">Stake</p>
                          <p className="text-lg font-black text-green-400">₦{odd.stake?.toLocaleString() || 0}</p>
                        </div>
                        <div className="text-center py-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg border border-primary/40">
                          <p className="text-[10px] text-primary mb-1 uppercase font-bold">Potential Win</p>
                          <p className="text-lg font-black text-primary">₦{odd.payout?.toLocaleString() || 0}</p>
                        </div>
                      </div>

                      {/* Code Section */}
                      <div className="relative">
                        <div className="text-center py-3 bg-secondary/50 rounded-lg border border-current overflow-hidden">
                          <p className="text-xs text-muted-foreground mb-1 uppercase">Betting Code</p>
                          <p className={`text-xl font-black text-primary ${!userHasAccess ? 'filter blur-sm select-none' : ''}`}>
                            {odd.betCode}
                          </p>
                        </div>
                        {!userHasAccess && (
                          <button
                            type="button"
                            onClick={() => handleViewCode(odd)}
                            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bet-dark/70 text-primary-foreground text-xs font-semibold hover:bg-bet-dark/80 transition-colors"
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

        {/* Show empty state if no data */}
        {notStartedOdds.length === 0 && wonGames.length === 0 && lostGames.length === 0 && (
          <div className="text-center py-16">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
                <span className="text-4xl">📊</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Sure Odds Yet</h2>
            <p className="text-muted-foreground">
              Check back soon for expert predictions and betting codes
            </p>
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

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                      <p className="text-[10px] text-green-400 mb-1 uppercase font-bold">Stake</p>
                      <p className="text-sm font-black text-green-400">₦{odd.stake?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-center py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                      <p className="text-[10px] text-green-400 mb-1 uppercase font-bold">Won</p>
                      <p className="text-sm font-black text-green-400">₦{odd.payout?.toLocaleString() || 0}</p>
                    </div>
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

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center py-2 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-[10px] text-red-400 mb-1 uppercase font-bold">Stake</p>
                      <p className="text-sm font-black text-red-400">₦{odd.stake?.toLocaleString() || 0}</p>
                    </div>
                    <div className="text-center py-2 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-[10px] text-red-400 mb-1 uppercase font-bold">Lost</p>
                      <p className="text-sm font-black text-red-400">₦{odd.payout?.toLocaleString() || 0}</p>
                    </div>
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
          </>
        )}
      </main>
      <BottomNav />

      {/* Unlock Options Dialog */}
      <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
        <DialogContent className="bg-bet-dark border-bet-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">
              Unlock Betting Code
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose how you want to access this prediction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {/* Pay Option */}
            <Button
              onClick={handlePayOption}
              className="w-full h-auto py-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-black text-lg">Pay ₦{selectedOdd?.price}</div>
                  <div className="text-xs opacity-90">Bank Transfer - Instant Access</div>
                </div>
              </div>
            </Button>

            {/* Watch Ad Option - Only show if ad is enabled for this odd */}
            {selectedOdd?.adEnabled && (
              <Button
                onClick={handleWatchAdOption}
                variant="outline"
                className="w-full h-auto py-6 border-2 border-green-500/50 hover:bg-green-500/10"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-6 h-6 text-green-500" />
                  <div className="text-left">
                    <div className="font-black text-lg text-green-500">Watch Ad (FREE)</div>
                    <div className="text-xs text-muted-foreground">24hr Cooldown - Support us with an ad view</div>
                  </div>
                </div>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Push Notification Prompt */}
      {userEmail && <NotificationPrompt userEmail={userEmail} />}
    </div>
  );
};

export default SureOdds;
