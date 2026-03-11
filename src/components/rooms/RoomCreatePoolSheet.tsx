import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gamepad2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoomCreatePoolSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  userId: string;
}

export function RoomCreatePoolSheet({ open, onOpenChange, roomId, userId }: RoomCreatePoolSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryFee, setEntryFee] = useState("100");
  const [options, setOptions] = useState(["", ""]);
  const [closesIn, setClosesIn] = useState("24");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const createPool = async () => {
    if (!title.trim() || options.filter(o => o.trim()).length < 2) {
      toast({ title: "Fill in title and at least 2 options", variant: "destructive" });
      return;
    }
    setCreating(true);
    const fee = parseFloat(entryFee) || 100;
    const hours = parseFloat(closesIn) || 24;
    const closesAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const filteredOptions = options.filter(o => o.trim()).map(o => ({ label: o.trim() }));

    const { data: pool, error } = await supabase.from("betting_pools").insert({
      title: title.trim(),
      description: description.trim() || null,
      creator_id: userId,
      entry_fee: fee,
      closes_at: closesAt,
      options: filteredOptions,
      match_details: { room_id: roomId },
    }).select("*").single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else if (pool) {
      // Post to room as event
      await supabase.from("room_events").insert({
        room_id: roomId,
        posted_by: userId,
        event_type: "betting_pool",
        source_id: pool.id,
        custom_price: 0,
      });
      await supabase.from("room_messages").insert({
        room_id: roomId,
        user_id: userId,
        content: null,
        message_type: "event",
        metadata: { event_type: "betting_pool", source_id: pool.id, price: 0 },
      });
      toast({ title: "Pool created & posted! 🎯" });
      onOpenChange(false);
      // Reset form
      setTitle(""); setDescription(""); setOptions(["", ""]); setEntryFee("100");
    }
    setCreating(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[75vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" /> Create Pool in Room
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label>Pool Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Man Utd vs Chelsea – Who wins?" className="mt-1" maxLength={100} />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Extra details..." className="mt-1" maxLength={200} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Entry Fee (₦)</Label>
              <Input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Closes in (hours)</Label>
              <Input type="number" value={closesIn} onChange={(e) => setClosesIn(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label>Options</Label>
            <div className="space-y-2 mt-1">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1"
                    maxLength={50}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeOption(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1 w-full">
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </Button>
              )}
            </div>
          </div>

          <Button onClick={createPool} disabled={creating} className="w-full gap-2">
            <Gamepad2 className="w-4 h-4" />
            {creating ? "Creating..." : "Create Pool"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
