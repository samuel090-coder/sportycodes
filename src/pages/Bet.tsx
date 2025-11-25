import MatchupCard from "@/components/MatchupCard";
import BottomNav from "@/components/BottomNav";
import { useBettingData } from "@/hooks/useBettingData";

const Bet = () => {
  const { matches } = useBettingData();

  return (
    <div className="min-h-screen bg-bet-dark pb-24">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-black text-primary-foreground">SPORTY CODES</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Place Your Winning Bets</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Live Matches</h2>
          <p className="text-sm text-muted-foreground">Select your winner and place your bet</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {matches.map((match) => (
            <MatchupCard
              key={match.id}
              id={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              homeTeamLogo={match.homeTeamLogo}
              awayTeamLogo={match.awayTeamLogo}
              homeOdds={match.homeOdds}
              awayOdds={match.awayOdds}
              time={match.matchTime}
              status={match.status}
            />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Bet;
