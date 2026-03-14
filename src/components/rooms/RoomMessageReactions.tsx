import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SmilePlus } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

interface RoomMessageReactionsProps {
  messageId: string;
  userId: string | null;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  reacted: boolean;
}

export function RoomMessageReactions({ messageId, userId }: RoomMessageReactionsProps) {
  const [reactions, setReactions] = useState<ReactionGroup[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchReactions();
  }, [messageId]);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from("room_message_reactions")
      .select("emoji, user_id")
      .eq("message_id", messageId);

    if (data) {
      const groups: Record<string, { count: number; reacted: boolean }> = {};
      data.forEach(r => {
        if (!groups[r.emoji]) groups[r.emoji] = { count: 0, reacted: false };
        groups[r.emoji].count++;
        if (r.user_id === userId) groups[r.emoji].reacted = true;
      });
      setReactions(Object.entries(groups).map(([emoji, g]) => ({ emoji, ...g })));
    }
  };

  const toggleReaction = async (emoji: string) => {
    if (!userId) return;
    const existing = reactions.find(r => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase.from("room_message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      await supabase.from("room_message_reactions")
        .insert({ message_id: messageId, user_id: userId, emoji });
    }
    setShowPicker(false);
    fetchReactions();
  };

  return (
    <div className="flex items-center gap-1 flex-wrap mt-0.5">
      {reactions.map(r => (
        <button
          key={r.emoji}
          onClick={() => toggleReaction(r.emoji)}
          className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
            r.reacted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-secondary"
          }`}
        >
          {r.emoji} {r.count}
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <SmilePlus className="w-3 h-3" />
        </button>
        {showPicker && (
          <div className="absolute bottom-6 left-0 z-50 bg-card border border-border rounded-lg shadow-lg p-1.5 flex gap-1">
            {QUICK_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => toggleReaction(e)}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-secondary text-sm"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
