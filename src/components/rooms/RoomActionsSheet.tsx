import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Phone, PhoneMissed, Tag, Gamepad2, DollarSign, UserPlus, Share2, Settings, LogOut, Crown, Users,
} from "lucide-react";

interface Action {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  tone?: "default" | "success" | "danger";
  badge?: number;
  show: boolean;
}

interface RoomActionsSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  room: { name: string; description?: string | null; avatar_url: string | null; member_count: number; join_fee?: number };
  isMember: boolean;
  isAdmin: boolean;
  missedCount: number;
  onCall: () => void;
  onMissed: () => void;
  onEvent: () => void;
  onGames: () => void;
  onTransfer: () => void;
  onInvite: () => void;
  onCrossPost: () => void;
  onSettings: () => void;
  onLeave: () => void;
}

export function RoomActionsSheet({
  open, onOpenChange, room, isMember, isAdmin, missedCount,
  onCall, onMissed, onEvent, onGames, onTransfer, onInvite, onCrossPost, onSettings, onLeave,
}: RoomActionsSheetProps) {
  const run = (fn: () => void) => () => { onOpenChange(false); setTimeout(fn, 120); };

  const actions = ([
    { key: "call", label: "Voice call", icon: Phone, onClick: run(onCall), tone: "success", show: isMember },
    { key: "missed", label: "Missed calls", icon: PhoneMissed, onClick: run(onMissed), badge: missedCount, show: isMember },
    { key: "event", label: "Tag event", icon: Tag, onClick: run(onEvent), show: isMember },
    { key: "games", label: "Games", icon: Gamepad2, onClick: run(onGames), show: isMember },
    { key: "transfer", label: "Send cash", icon: DollarSign, onClick: run(onTransfer), show: isMember },
    { key: "invite", label: "Invite", icon: UserPlus, onClick: run(onInvite), show: isMember },
    { key: "cross", label: "Tag group", icon: Share2, onClick: run(onCrossPost), show: isMember },
    { key: "settings", label: "Settings", icon: Settings, onClick: run(onSettings), show: isAdmin },
    { key: "leave", label: "Leave room", icon: LogOut, onClick: run(onLeave), tone: "danger", show: isMember && !isAdmin },
  ].filter((a) => a.show);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="sr-only">Room options</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center shrink-0">
            {room.avatar_url ? (
              <img src={room.avatar_url} alt={room.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-primary">{room.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base text-foreground truncate">{room.name}</h3>
              {!!room.join_fee && room.join_fee > 0 && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5">
                  <Crown className="w-2.5 h-2.5" /> Premium
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {room.member_count} members
            </p>
            {room.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{room.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 py-4">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              className="relative flex flex-col items-center gap-1.5 rounded-xl bg-secondary/60 hover:bg-secondary p-3 transition"
            >
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  a.tone === "success"
                    ? "bg-green-500/15 text-green-500"
                    : a.tone === "danger"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary"
                }`}
              >
                <a.icon className="w-4 h-4" />
              </span>
              <span className="text-[10px] text-foreground text-center leading-tight">{a.label}</span>
              {!!a.badge && a.badge > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] rounded-full bg-destructive text-[9px] font-bold text-white flex items-center justify-center px-1">
                  {a.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
