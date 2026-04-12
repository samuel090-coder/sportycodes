import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Game {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
}

const categories = [
  { label: "All", value: "" },
  { label: "Shooter", value: "shooter" },
  { label: "MMORPG", value: "mmorpg" },
  { label: "Strategy", value: "strategy" },
  { label: "Racing", value: "racing" },
  { label: "Sports", value: "sports" },
  { label: "Battle Royale", value: "battle-royale" },
  { label: "Card", value: "card" },
];

const FreeGamesSection = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    fetchGames();
  }, [category]);

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-games", {
        body: null,
        headers: { "Content-Type": "application/json" },
      });

      // Build URL with query params manually since invoke doesn't support them well
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const params = new URLSearchParams({ platform: "all" });
      if (category) params.set("category", category);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/fetch-games?${params}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      setGames(result.games || []);
    } catch (err) {
      console.error("Error fetching games:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Gamepad2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Free Games</h3>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              category === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Games Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <Skeleton className="w-full aspect-video" />
              <div className="p-2 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="text-center py-8">
          <Gamepad2 className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No games found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {games.map((game) => (
            <a
              key={game.id}
              href={game.game_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-card/60 backdrop-blur-xl rounded-xl border border-border/30 overflow-hidden hover:border-primary/30 transition-all"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={game.thumbnail}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-1.5 right-1.5">
                  <span className="px-1.5 py-0.5 bg-primary/90 text-primary-foreground text-[9px] font-bold rounded-md">
                    FREE
                  </span>
                </div>
              </div>
              <div className="p-2.5">
                <h4 className="text-sm font-bold text-foreground line-clamp-1 mb-1">
                  {game.title}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                  {game.short_description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground font-medium">
                    {game.genre}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default FreeGamesSection;
