import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface RoomPresenceUser {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  typing?: boolean;
}

/**
 * Realtime presence + typing indicator for a room.
 * Returns the online list, the typing list and a `notifyTyping()` to call on input.
 */
export function useRoomPresence(
  roomId: string | undefined,
  me: { userId: string | null; displayName: string; avatarUrl?: string | null },
) {
  const [online, setOnline] = useState<RoomPresenceUser[]>([]);
  const [typing, setTyping] = useState<RoomPresenceUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSentRef = useRef(0);
  const typersRef = useRef<Map<string, { ts: number; user: RoomPresenceUser }>>(new Map());

  useEffect(() => {
    if (!roomId || !me.userId) return;
    const channel = supabase.channel(`room-presence-${roomId}`, {
      config: { presence: { key: me.userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, any[]>;
        const list: RoomPresenceUser[] = Object.entries(state).map(([key, metas]) => ({
          userId: key,
          displayName: metas[0]?.displayName || "User",
          avatarUrl: metas[0]?.avatarUrl ?? null,
        }));
        setOnline(list);
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === me.userId) return;
        typersRef.current.set(payload.userId, {
          ts: Date.now(),
          user: { userId: payload.userId, displayName: payload.displayName || "Someone", avatarUrl: payload.avatarUrl },
        });
        setTyping(Array.from(typersRef.current.values()).map((v) => v.user));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ displayName: me.displayName, avatarUrl: me.avatarUrl ?? null, at: Date.now() });
        }
      });

    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [k, v] of typersRef.current) {
        if (now - v.ts > 3500) { typersRef.current.delete(k); changed = true; }
      }
      if (changed) setTyping(Array.from(typersRef.current.values()).map((v) => v.user));
    }, 1200);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, me.userId, me.displayName, me.avatarUrl]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < 1500) return;
    lastSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: me.userId, displayName: me.displayName, avatarUrl: me.avatarUrl ?? null },
    });
  }, [me.userId, me.displayName, me.avatarUrl]);

  return { online, typing, notifyTyping };
}

function Stack({ users }: { users: RoomPresenceUser[] }) {
  return (
    <div className="flex -space-x-2">
      {users.slice(0, 4).map((u) => (
        <Avatar key={u.userId} className="w-5 h-5 border border-background">
          <AvatarImage src={u.avatarUrl || ""} />
          <AvatarFallback className="text-[8px] bg-secondary">{u.displayName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}

export function RoomPresenceBar({ online, typing }: { online: RoomPresenceUser[]; typing: RoomPresenceUser[] }) {
  if (typing.length === 0 && online.length <= 1) return null;

  const names = (list: RoomPresenceUser[]) =>
    list.length === 1
      ? list[0].displayName
      : list.length === 2
        ? `${list[0].displayName} & ${list[1].displayName}`
        : `${list[0].displayName} +${list.length - 1}`;

  return (
    <div className="shrink-0 px-3 pb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
      {typing.length > 0 ? (
        <>
          <Stack users={typing} />
          <span className="truncate">
            {names(typing)} {typing.length === 1 ? "is" : "are"} typing
          </span>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </>
      ) : (
        <>
          <Stack users={online} />
          <span className="truncate">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 align-middle" />
            {names(online)} {online.length === 1 ? "is" : "are"} in the chat room
          </span>
        </>
      )}
    </div>
  );
}
