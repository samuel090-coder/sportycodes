import BottomNav from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { useBettingData } from "@/hooks/useBettingData";

const SureOdds = () => {
  const { sureOdds } = useBettingData();

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

        <div className="grid gap-4">
          {sureOdds.map((odd) => (
            <Card
              key={odd.id}
              className="bg-gradient-card border-bet-border p-5 hover:shadow-bet transition-all duration-300 animate-fade-in"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">{odd.match}</h3>
                  <p className="text-primary font-semibold">{odd.prediction}</p>
                </div>
                <div className="flex items-center gap-2 bg-bet-success/20 px-3 py-1 rounded-full">
                  <Trophy className="w-4 h-4 text-bet-success" />
                  <span className="text-sm font-bold text-bet-success">{odd.confidence}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-bet-border">
                <span className="text-sm text-muted-foreground">Odds</span>
                <span className="text-2xl font-black text-primary">{odd.odds}</span>
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
