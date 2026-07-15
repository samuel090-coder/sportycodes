import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FRAMES, FramedBubble } from "./MessageFrames";
import { Check } from "lucide-react";

export const FramePickerSheet = ({
  open,
  onOpenChange,
  currentFrame,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentFrame: string;
  onSelect: (id: string) => void;
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Choose your message frame</SheetTitle>
          <p className="text-xs text-muted-foreground">
            The frame will apply to every new message you send until you pick another. Double-tap any of your messages to reopen this.
          </p>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 pt-5 pb-8">
          {FRAMES.map((f) => {
            const active = f.id === currentFrame;
            return (
              <button
                key={f.id}
                onClick={() => {
                  onSelect(f.id);
                  onOpenChange(false);
                }}
                className={`relative rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-primary bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.4)]"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {active && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
                <div className="min-h-[70px] flex items-end pr-4">
                  <FramedBubble frameId={f.id} align="right">
                    <span className="text-xs">Hey! 👋</span>
                  </FramedBubble>
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">{f.name}</p>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
