import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Coins, Dice1, Swords, HelpCircle, Ticket, TrendingUp, Hash, Gavel, Trophy, Flame, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomGamesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  userId: string;
}

const GAME_TYPES = [
  { type: "coin_flip", label: "Coin Flip", icon: Coins, desc: "50/50 heads or tails", players: 2 },
  { type: "dice_roll", label: "Dice Battle", icon: Dice1, desc: "Highest roll wins", players: 2 },
  { type: "rps", label: "Rock Paper Scissors", icon: Swords, desc: "Classic RPS showdown", players: 2 },
  { type: "trivia", label: "Trivia Quiz", icon: HelpCircle, desc: "Answer questions to win", players: 10 },
  { type: "raffle", label: "Lucky Raffle", icon: Ticket, desc: "Buy tickets, random winner", players: 50 },
  { type: "prediction", label: "Prediction", icon: TrendingUp, desc: "Predict the outcome", players: 20 },
  { type: "number_guess", label: "Number Guess", icon: Hash, desc: "Guess the hidden number", players: 10 },
  { type: "auction", label: "Auction", icon: Gavel, desc: "Highest bid wins", players: 20 },
  { type: "challenge", label: "Dare Challenge", icon: Flame, desc: "Dare someone for coins", players: 2 },
  { type: "jackpot", label: "Room Jackpot", icon: Trophy, desc: "Pool grows, random winner", players: 100 },
  { type: "spin_win", label: "Spin & Win", icon: RotateCcw, desc: "Spin for a chance to win", players: 10 },
];

export function RoomGamesSheet({ open, onOpenChange, roomId, userId }: RoomGamesSheetProps) {
  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedGame, setSelectedGame] = useState<typeof GAME_TYPES[0] | null>(null);
  const [entryFee, setEntryFee] = useState("100");
  const [gameTitle, setGameTitle] = useState("");
  const [gameData, setGameData] = useState<any>({});
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const resetState = () => {
    setStep("select");
    setSelectedGame(null);
    setEntryFee("100");
    setGameTitle("");
    setGameData({});
  };

  const selectGame = (game: typeof GAME_TYPES[0]) => {
    setSelectedGame(game);
    setGameTitle(`${game.label} — ₦${entryFee}`);
    setStep("configure");
  };

  const createGame = async () => {
    if (!selectedGame) return;
    setCreating(true);

    const fee = Math.max(0, parseFloat(entryFee) || 0);

    try {
      // Check wallet
      if (fee > 0) {
        const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
        if (!wallet || Number(wallet.balance) < fee) {
          toast({ title: "Insufficient balance", description: `Need ₦${fee} to create this game`, variant: "destructive" });
          setCreating(false);
          return;
        }
        // Deduct entry fee from creator
        await supabase.from("wallets").update({ balance: Number(wallet.balance) - fee }).eq("user_id", userId);
      }

      // Create game
      const { data: game, error } = await supabase.from("room_games").insert({
        room_id: roomId,
        created_by: userId,
        game_type: selectedGame.type,
        title: gameTitle || selectedGame.label,
        entry_fee: fee,
        prize_pool: fee,
        max_players: selectedGame.players,
        status: "open",
        game_data: gameData,
      }).select().single();

      if (error) throw error;

      // Create creator's entry
      await supabase.from("room_game_entries").insert({
        game_id: game.id,
        user_id: userId,
        entry_data: {},
      });

      // Post to chat
      await supabase.from("room_messages").insert({
        room_id: roomId,
        user_id: userId,
        content: null,
        message_type: "game",
        metadata: { game_id: game.id, game_type: selectedGame.type, title: gameTitle || selectedGame.label, entry_fee: fee },
      });

      toast({ title: "Game created! 🎮" });
      resetState();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[75vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            {step === "select" ? "Pick a Game" : "Configure Game"}
          </SheetTitle>
        </SheetHeader>

        {step === "select" ? (
          <div className="mt-3 max-h-[58vh] overflow-y-auto space-y-2 pr-1">
            {GAME_TYPES.map((game) => {
              const Icon = game.icon;
              return (
                <button
                  key={game.type}
                  onClick={() => selectGame(game)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{game.label}</p>
                    <p className="text-xs text-muted-foreground">{game.desc} · Max {game.players} players</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-card border border-primary/30 rounded-xl">
              {selectedGame && (() => { const Icon = selectedGame.icon; return <Icon className="w-5 h-5 text-primary" />; })()}
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedGame?.label}</p>
                <p className="text-xs text-muted-foreground">{selectedGame?.desc}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Game Title</Label>
              <Input
                value={gameTitle}
                onChange={(e) => setGameTitle(e.target.value)}
                placeholder={selectedGame?.label}
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Entry Fee (₦)</Label>
              <Input
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0 = free"
                min="0"
              />
              <p className="text-xs text-muted-foreground">You'll pay this to enter as the first player</p>
            </div>

            {/* Game-specific config */}
            {selectedGame?.type === "trivia" && (
              <div className="space-y-2">
                <Label className="text-foreground">Question</Label>
                <Input
                  value={gameData.question || ""}
                  onChange={(e) => setGameData({ ...gameData, question: e.target.value })}
                  placeholder="What is the question?"
                />
                <Label className="text-foreground">Answer</Label>
                <Input
                  value={gameData.answer || ""}
                  onChange={(e) => setGameData({ ...gameData, answer: e.target.value })}
                  placeholder="Correct answer"
                />
              </div>
            )}

            {selectedGame?.type === "number_guess" && (
              <div className="space-y-2">
                <Label className="text-foreground">Hidden Number (1-100)</Label>
                <Input
                  type="number"
                  value={gameData.target_number || ""}
                  onChange={(e) => setGameData({ ...gameData, target_number: parseInt(e.target.value) })}
                  placeholder="1-100"
                  min="1"
                  max="100"
                />
              </div>
            )}

            {selectedGame?.type === "prediction" && (
              <div className="space-y-2">
                <Label className="text-foreground">What to Predict?</Label>
                <Input
                  value={gameData.prediction_topic || ""}
                  onChange={(e) => setGameData({ ...gameData, prediction_topic: e.target.value })}
                  placeholder="e.g. Who will score first?"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep("select")} className="flex-1">Back</Button>
              <Button onClick={createGame} disabled={creating} className="flex-1">
                {creating ? "Creating..." : "Create Game"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
