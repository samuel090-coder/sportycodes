import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, Search, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { promptDeposit } from "@/lib/insufficientFunds";

interface RoomTransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  userId: string;
}

interface Member {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

export function RoomTransferSheet({ open, onOpenChange, roomId, userId }: RoomTransferSheetProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchMembers();
      fetchBalance();
      setSelectedUser(null);
      setAmount("");
      setNote("");
    }
  }, [open]);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("room_members")
      .select("user_id")
      .eq("room_id", roomId)
      .eq("is_blocked", false)
      .neq("user_id", userId);

    if (data) {
      const userIds = data.map(m => m.user_id);
      if (userIds.length === 0) { setMembers([]); return; }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, username")
        .in("id", userIds);

      setMembers((profiles || []).map(p => ({
        user_id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        username: p.username,
      })));
    }
  };

  const fetchBalance = async () => {
    const { data } = await supabase.from("wallets").select("balance").eq("user_id", userId).single();
    if (data) setBalance(Number(data.balance));
  };

  const sendTransfer = async () => {
    if (!selectedUser || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    if (amt > balance) { promptDeposit({ balance }); return; }

    setSending(true);
    try {
      // Deduct from sender
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance: balance - amt })
        .eq("user_id", userId);
      if (deductErr) throw deductErr;

      // Credit receiver using RPC
      await supabase.rpc("add_tap_earnings", { _user_id: selectedUser.user_id, _amount: amt });

      // Record transfer
      await supabase.from("room_transfers").insert({
        room_id: roomId,
        sender_id: userId,
        receiver_id: selectedUser.user_id,
        amount: amt,
        note: note.trim() || null,
      });

      // Post transfer message in chat
      const { data: senderProfile } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
      const senderName = senderProfile?.display_name || "Someone";
      const receiverName = selectedUser.display_name || "someone";

      await supabase.from("room_messages").insert({
        room_id: roomId,
        user_id: userId,
        content: `💸 ${senderName} sent ₦${amt.toLocaleString()} to ${receiverName}${note ? ` — "${note}"` : ""}`,
        message_type: "transfer",
        metadata: { sender_id: userId, receiver_id: selectedUser.user_id, amount: amt },
      });

      toast({ title: "Transfer sent! 💸" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Transfer failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const filteredMembers = members.filter(m =>
    (m.display_name || m.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-background border-border rounded-t-2xl h-[60vh]">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Send Money
          </SheetTitle>
        </SheetHeader>

        <p className="text-xs text-muted-foreground mt-1">Balance: ₦{balance.toLocaleString()}</p>

        {!selectedUser ? (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[35vh] overflow-y-auto space-y-1">
              {filteredMembers.map((m) => (
                <div
                  key={m.user_id}
                  onClick={() => setSelectedUser(m)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={m.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-secondary">{m.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground">{m.display_name || m.username || "User"}</span>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No members found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border">
              <Avatar className="w-10 h-10">
                <AvatarImage src={selectedUser.avatar_url || ""} />
                <AvatarFallback className="bg-secondary">{selectedUser.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{selectedUser.display_name || selectedUser.username}</p>
                <button onClick={() => setSelectedUser(null)} className="text-xs text-primary">Change</button>
              </div>
            </div>

            <div>
              <Label>Amount (₦)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 text-lg"
              />
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Input
                placeholder="What's this for?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={100}
                className="mt-1"
              />
            </div>

            <Button onClick={sendTransfer} disabled={sending || !amount} className="w-full gap-2">
              <Send className="w-4 h-4" /> {sending ? "Sending..." : `Send ₦${amount || "0"}`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
