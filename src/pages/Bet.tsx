import MatchupCard from "@/components/MatchupCard";
import BottomNav from "@/components/BottomNav";

const Bet = () => {
  const matches = [
    {
      id: "1",
      homeTeam: "Man City",
      awayTeam: "Arsenal",
      homeOdds: 2.15,
      awayOdds: 3.40,
      time: "Today 18:00",
    },
    {
      id: "2",
      homeTeam: "Liverpool",
      awayTeam: "Chelsea",
      homeOdds: 1.85,
      awayOdds: 4.20,
      time: "Today 20:30",
    },
    {
      id: "3",
      homeTeam: "Barcelona",
      awayTeam: "Real Madrid",
      homeOdds: 2.50,
      awayOdds: 2.80,
      time: "Tomorrow 21:00",
    },
    {
      id: "4",
      homeTeam: "Bayern",
      awayTeam: "Dortmund",
      homeOdds: 1.95,
      awayOdds: 3.75,
      time: "Tomorrow 19:30",
    },
  ];

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
            <MatchupCard key={match.id} {...match} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Bet;
