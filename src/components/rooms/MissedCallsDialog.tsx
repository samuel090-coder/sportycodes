import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneMissed, Phone, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface MissedCall {
  id: string;
  startedAt: number;
  endedAt: number;
  participants: { displayName?: string; avatarUrl?: string | null }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  calls: MissedCall[];
  onClear: () => void;
  onCallBack: () => void;
}

export const MissedCallsDialog = ({ open, onClose, calls, onClear, onCallBack }: Props) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneMissed className="w-5 h-5 text-destructive" />
            Missed Calls
          </DialogTitle>
        </DialogHeader>

        {calls.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No missed calls in this room.
          </div>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => {
              const durationSec = Math.max(1, Math.round((c.endedAt - c.startedAt) / 1000));
              const first = c.participants[0];
              return (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/40 bg-card/40">
                  <Avatar className="w-10 h-10">
                    {first?.avatarUrl && <AvatarImage src={first.avatarUrl} />}
                    <AvatarFallback className="bg-destructive/20 text-destructive">
                      <PhoneMissed className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {first?.displayName || "Unknown"}
                      {c.participants.length > 1 && (
                        <span className="text-muted-foreground"> +{c.participants.length - 1}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(c.startedAt, { addSuffix: true })} • {durationSec}s
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClear}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
              </Button>
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={onCallBack}>
                <Phone className="w-3.5 h-3.5 mr-1.5" /> Start Call
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
