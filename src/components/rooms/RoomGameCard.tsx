import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Gamepad2, Coins, Dice1, Swords, HelpCircle, Ticket, TrendingUp, Hash, Gavel, Trophy, Flame, RotateCcw, Users, Crown, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GAME_ICONS: Record<string, any> = {
  coin_flip: Coins, dice_roll: Dice1, rps: Swords, trivia: HelpCircle,
  raffle: Ticket, prediction: TrendingUp, number_guess: Hash, auction: Gavel,
  challenge: Flame, jackpot: Trophy, spin_win: RotateCcw,
};

const RPS_CHOICES = ["🪨 Rock", "📄 Paper", "✂️ Scissors"];

interface RoomGameCardProps {
  message: { id: string; user_id: string; metadata: any; created_at: string; profiles?: any };
  userId: string | null;
  roomId: string;
}

export function RoomGameCard({ message, userId, roomId }: RoomGameCardProps) {
  const [game, setGame] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [joining, setJoining] = useState(false);
  const [rpsChoice, setRpsChoice] = useState<number | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [triviaAnswer, setTriviaAnswer] = useState("");
  const [auctionBid, setAuctionBid] = useState("");
  const [predictionChoice, setPredictionChoice] = useState("");
  const { toast } = useToast();
  const meta = message.metadata || {};

  useEffect(() => { fetchGame(); }, []);

  // Subscribe to realtime game updates
  useEffect(() => {
    if (!meta.game_id) return;
    const channel = supabase
      .channel(`game-${meta.game_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_games", filter: `id=eq.${meta.game_id}` },
        () => fetchGame()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_game_entries", filter: `game_id=eq.${meta.game_id}` },
        () => fetchGame()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [meta.game_id]);

  const fetchGame = async () => {
    if (!meta.game_id) return;
    const { data } = await supabase.from("room_games").select("*").eq("id", meta.game_id).single();
    if (data) setGame(data);
    const { data: e } = await supabase.from("room_game_entries").select("*").eq("game_id", meta.game_id);
    if (e) setEntries(e);
  };

  const joinGame = async (entryData: any = {}) => {
    if (!userId || !game) return;
    setJoining(true);
    try {
      const fee = Number(game.entry_fee);
      if (fee > 0) {
        const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
        if (!wallet || Number(wallet.balance) < fee) {
          toast({ title: "Insufficient balance", description: `Need ₦${fee}`, variant: "destructive" });
          setJoining(false);
          return;
        }
        await supabase.from("wallets").update({ balance: Number(wallet.balance) - fee }).eq("user_id", userId);
      }

      const { error } = await supabase.from("room_game_entries").insert({
        game_id: game.id, user_id: userId, entry_data: entryData,
      });

      if (error) {
        if (fee > 0) await supabase.rpc("add_tap_earnings", { _user_id: userId, _amount: fee });
        throw error;
      }

      // Update prize pool
      await supabase.from("room_games").update({
        prize_pool: Number(game.prize_pool) + fee,
      }).eq("id", game.id);

      const newEntries = [...entries, { user_id: userId, entry_data: entryData }];
      setEntries(newEntries);

      // Auto-resolve for 2-player games when full
      if (["coin_flip", "dice_roll", "rps", "challenge"].includes(game.game_type) && newEntries.length >= game.max_players) {
        await resolveGame(newEntries);
      }

      toast({ title: "Joined game! 🎮" });
      fetchGame();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setJoining(false);
  };

  const resolveGame = async (allEntries: any[]) => {
    const totalPrize = Number(game.prize_pool) + Number(game.entry_fee);
    let winnerId: string | null = null;
    let resultMsg = "";

    if (game.game_type === "coin_flip" || game.game_type === "challenge") {
      const idx = Math.random() < 0.5 ? 0 : 1;
      winnerId = allEntries[idx].user_id;
      resultMsg = game.game_type === "coin_flip" ? `Coin landed ${idx === 0 ? "Heads" : "Tails"}!` : "Challenge completed!";
    } else if (game.game_type === "dice_roll") {
      const rolls = allEntries.map(e => ({ ...e, roll: Math.floor(Math.random() * 6) + 1 }));
      rolls.sort((a, b) => b.roll - a.roll);
      winnerId = rolls[0].user_id;
      resultMsg = `Rolls: ${rolls.map(r => r.roll).join(" vs ")}`;
    } else if (game.game_type === "rps") {
      const p1 = allEntries[0].entry_data?.choice ?? 0;
      const p2 = allEntries[1].entry_data?.choice ?? 0;
      if (p1 === p2) {
        for (const e of allEntries) {
          await supabase.rpc("add_tap_earnings", { _user_id: e.user_id, _amount: Number(game.entry_fee) });
        }
        await supabase.from("room_games").update({ status: "completed", game_data: { result: "draw" } }).eq("id", game.id);
        await supabase.from("room_messages").insert({
          room_id: roomId, user_id: game.created_by,
          content: `🎮 ${game.title} — It's a DRAW! Refunds issued.`,
          message_type: "system", metadata: {},
        });
        return;
      }
      const wins = [[0, 2], [1, 0], [2, 1]];
      winnerId = wins.some(([a, b]) => a === p1 && b === p2) ? allEntries[0].user_id : allEntries[1].user_id;
      const names = ["Rock", "Paper", "Scissors"];
      resultMsg = `${names[p1]} vs ${names[p2]}`;
    }

    if (winnerId) await payoutWinner(winnerId, totalPrize, resultMsg);
  };

  const payoutWinner = async (winnerId: string, totalPrize: number, extraMsg = "") => {
    const house = totalPrize * 0.05;
    const payout = totalPrize - house;
    await supabase.rpc("add_tap_earnings", { _user_id: winnerId, _amount: payout });
    await supabase.from("room_games").update({ status: "completed", winner_id: winnerId }).eq("id", game.id);
    await supabase.from("room_game_entries").update({ is_winner: true, payout }).eq("game_id", game.id).eq("user_id", winnerId);
    
    const { data: winner } = await supabase.from("profiles").select("display_name").eq("id", winnerId).single();
    await supabase.from("room_messages").insert({
      room_id: roomId, user_id: game.created_by,
      content: `🏆 ${winner?.display_name || "Player"} won ${game.title}! Payout: ₦${payout.toFixed(0)}${extraMsg ? ` (${extraMsg})` : ""}`,
      message_type: "system", metadata: {},
    });
  };

  const handleTrivia = async () => {
    if (!game || !triviaAnswer.trim()) return;
    const correct = game.game_data?.answer?.toLowerCase().trim();
    await joinGame({ answer: triviaAnswer });
    if (triviaAnswer.toLowerCase().trim() === correct) {
      const totalPrize = Number(game.prize_pool) + Number(game.entry_fee);
      await payoutWinner(userId!, totalPrize, "Correct answer!");
      toast({ title: `Correct! 🎉` });
    } else {
      toast({ title: "Wrong answer! ❌", variant: "destructive" });
    }
    setTriviaAnswer("");
  };

  const handleNumberGuess = async () => {
    if (!game || !guessInput) return;
    const guess = parseInt(guessInput);
    const target = game.game_data?.target_number;
    await joinGame({ guess });
    if (guess === target) {
      const totalPrize = Number(game.prize_pool) + Number(game.entry_fee);
      await payoutWinner(userId!, totalPrize, `Number was ${target}`);
      toast({ title: `Correct! The number was ${target}! 🎉` });
    } else {
      toast({ title: guess > target ? "Too high! ⬇️" : "Too low! ⬆️" });
    }
    setGuessInput("");
  };

  const handleAuction = async () => {
    if (!game || !auctionBid) return;
    const bid = parseFloat(auctionBid);
    if (bid <= Number(game.entry_fee)) {
      toast({ title: "Bid must be higher than entry fee", variant: "destructive" });
      return;
    }
    // Check wallet
    const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", userId!).single();
    if (!wallet || Number(wallet.balance) < bid) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    await supabase.from("wallets").update({ balance: Number(wallet.balance) - bid }).eq("user_id", userId!);
    
    const { error } = await supabase.from("room_game_entries").insert({
      game_id: game.id, user_id: userId!, entry_data: { bid },
    });
    if (error) {
      await supabase.rpc("add_tap_earnings", { _user_id: userId!, _amount: bid });
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("room_games").update({ prize_pool: Number(game.prize_pool) + bid }).eq("id", game.id);
    toast({ title: `Bid of ₦${bid} placed! 💰` });
    setAuctionBid("");
    fetchGame();
  };

  const handlePrediction = async () => {
    if (!game || !predictionChoice.trim()) return;
    await joinGame({ prediction: predictionChoice });
    setPredictionChoice("");
  };

  if (!game) return null;

  const Icon = GAME_ICONS[game.game_type] || Gamepad2;
  const hasJoined = entries.some(e => e.user_id === userId);
  const isCompleted = game.status === "completed";
  const isCreator = game.created_by === userId;
  const playerCount = entries.length;

  return (
    <div className="mx-auto max-w-[90%] bg-gradient-to-br from-card to-secondary border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-border/50">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium text-primary capitalize">{game.game_type.replace("_", " ")}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {isCompleted ? "Ended" : `${playerCount}/${game.max_players}`}
        </Badge>
      </div>

      <div className="p-3">
        <p className="text-sm font-semibold text-foreground">{game.title}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Entry: ₦{game.entry_fee}</span>
          <span>Pool: ₦{game.prize_pool}</span>
          <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {playerCount}</span>
        </div>

        {/* Winner display */}
        {isCompleted && game.winner_id && (
          <div className="mt-2 p-2 bg-primary/10 rounded-lg flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              {game.winner_id === userId ? "You won! 🎉" : "Game completed"}
            </span>
          </div>
        )}

        {isCompleted && game.game_data?.result === "draw" && (
          <div className="mt-2 p-2 bg-muted rounded-lg">
            <span className="text-xs text-muted-foreground">Draw — Everyone refunded</span>
          </div>
        )}

        {/* Join actions for open games */}
        {!isCompleted && !hasJoined && game.status === "open" && (
          <div className="mt-3 space-y-2">
            {/* RPS choice */}
            {game.game_type === "rps" && (
              <div className="flex gap-1">
                {RPS_CHOICES.map((label, idx) => (
                  <button key={idx} onClick={() => setRpsChoice(idx)}
                    className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${rpsChoice === idx ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Trivia */}
            {game.game_type === "trivia" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Q: {game.game_data?.question}</p>
                <div className="flex gap-1.5">
                  <Input placeholder="Your answer..." value={triviaAnswer} onChange={(e) => setTriviaAnswer(e.target.value)} className="flex-1 h-8 text-sm" />
                  <Button size="sm" onClick={handleTrivia} disabled={joining}>Submit</Button>
                </div>
              </div>
            )}

            {/* Number guess */}
            {game.game_type === "number_guess" && (
              <div className="flex gap-1.5">
                <Input type="number" placeholder="Guess 1-100" value={guessInput} onChange={(e) => setGuessInput(e.target.value)} className="flex-1 h-8 text-sm" min="1" max="100" />
                <Button size="sm" onClick={handleNumberGuess} disabled={joining}>Guess</Button>
              </div>
            )}

            {/* Auction */}
            {game.game_type === "auction" && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Highest bid when admin closes wins the pot!</p>
                {entries.length > 0 && (
                  <p className="text-xs text-primary font-medium">
                    Current highest: ₦{Math.max(...entries.map(e => e.entry_data?.bid || 0))}
                  </p>
                )}
                <div className="flex gap-1.5">
                  <Input type="number" placeholder="Your bid (₦)" value={auctionBid} onChange={(e) => setAuctionBid(e.target.value)} className="flex-1 h-8 text-sm" />
                  <Button size="sm" onClick={handleAuction} disabled={joining}>Bid</Button>
                </div>
              </div>
            )}

            {/* Prediction */}
            {game.game_type === "prediction" && (
              <div className="space-y-1.5">
                {game.game_data?.prediction_topic && (
                  <p className="text-xs text-muted-foreground italic">"{game.game_data.prediction_topic}"</p>
                )}
                <div className="flex gap-1.5">
                  <Input placeholder="Your prediction..." value={predictionChoice} onChange={(e) => setPredictionChoice(e.target.value)} className="flex-1 h-8 text-sm" />
                  <Button size="sm" onClick={handlePrediction} disabled={joining || !predictionChoice.trim()}>Submit</Button>
                </div>
              </div>
            )}

            {/* Generic join button for simple games */}
            {!["trivia", "number_guess", "auction", "prediction"].includes(game.game_type) && (
              <Button size="sm" className="w-full gap-1"
                onClick={() => {
                  const data: any = {};
                  if (game.game_type === "rps") {
                    if (rpsChoice === null) { toast({ title: "Pick your move first!", variant: "destructive" }); return; }
                    data.choice = rpsChoice;
                  }
                  joinGame(data);
                }}
                disabled={joining || (game.game_type === "rps" && rpsChoice === null)}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                {joining ? "Joining..." : `Join — ₦${game.entry_fee}`}
              </Button>
            )}
          </div>
        )}

        {hasJoined && !isCompleted && (
          <p className="mt-2 text-xs text-primary font-medium">✓ You're in! Waiting for players...</p>
        )}

        {/* Admin controls for draw-type games */}
        {isCreator && !isCompleted && ["raffle", "jackpot", "spin_win"].includes(game.game_type) && playerCount >= 2 && (
          <Button size="sm" variant="secondary" className="w-full mt-2 gap-1"
            onClick={async () => {
              const randomEntry = entries[Math.floor(Math.random() * entries.length)];
              await payoutWinner(randomEntry.user_id, Number(game.prize_pool), "Random draw");
              toast({ title: "Winner drawn! 🎉" });
              fetchGame();
            }}>
            <Trophy className="w-3.5 h-3.5" /> Draw Winner
          </Button>
        )}

        {/* Admin close auction - highest bidder wins */}
        {isCreator && !isCompleted && game.game_type === "auction" && playerCount >= 2 && (
          <Button size="sm" variant="secondary" className="w-full mt-2 gap-1"
            onClick={async () => {
              const sorted = [...entries].sort((a, b) => (b.entry_data?.bid || 0) - (a.entry_data?.bid || 0));
              const winner = sorted[0];
              await payoutWinner(winner.user_id, Number(game.prize_pool), `Highest bid: ₦${winner.entry_data?.bid}`);
              toast({ title: "Auction closed! 🔨" });
              fetchGame();
            }}>
            <Gavel className="w-3.5 h-3.5" /> Close Auction
          </Button>
        )}

        {/* Admin resolve prediction */}
        {isCreator && !isCompleted && game.game_type === "prediction" && playerCount >= 2 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-muted-foreground">Select winning prediction:</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {entries.map((e, i) => (
                <button key={i}
                  onClick={async () => {
                    await payoutWinner(e.user_id, Number(game.prize_pool), `Prediction: ${e.entry_data?.prediction}`);
                    toast({ title: "Winner selected! 🏆" });
                    fetchGame();
                  }}
                  className="w-full text-left text-xs p-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors">
                  "{e.entry_data?.prediction}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}