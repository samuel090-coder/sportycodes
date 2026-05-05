import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Tpl = "approved" | "failed" | "warning" | "reminder" | "custom";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  amount?: number | null;
}

export function DepositMessageDialog({ open, onOpenChange, userId, userEmail: providedEmail, userName, amount }: Props) {
  const [template, setTemplate] = useState<Tpl>("approved");
  const [reason, setReason] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [email, setEmail] = useState(providedEmail || "");

  // Resolve email from auth.users via edge or db if not provided
  const resolveEmail = async (): Promise<string | null> => {
    if (email) return email;
    if (!userId) return null;
    const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    // No direct email access; ask admin to fill
    return null;
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-deposit-message", {
        body: { template, userName, amount, reason, custom: template === "custom" ? reason : undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSubject(data.subject || "SPORTY CODES");
      setBody(data.body || "");
      toast.success("AI draft ready — edit then send");
    } catch (e: any) {
      toast.error(e.message || "AI failed");
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    const to = email || (await resolveEmail()) || "";
    if (!to) { toast.error("Enter recipient email"); return; }
    if (!subject || !body) { toast.error("Subject and body required"); return; }
    // Gmail app deeplink (Android/iOS Gmail) with mailto fallback
    const params = `to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const gmailUrl = `googlegmail:///co?${params}`;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Try Gmail app
    const a = document.createElement("a");
    a.href = gmailUrl;
    a.click();
    setTimeout(() => { window.location.href = mailto; }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Message Depositor
          </DialogTitle>
          <DialogDescription>AI drafts a friendly message — opens your Gmail app to send.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Recipient email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Template</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as Tpl)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">✅ Deposit Approved</SelectItem>
                  <SelectItem value="failed">❌ Deposit Failed</SelectItem>
                  <SelectItem value="warning">⚠️ Warning</SelectItem>
                  <SelectItem value="reminder">⏰ Reminder</SelectItem>
                  <SelectItem value="custom">✏️ Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (₦)</Label>
              <Input value={amount ?? ""} disabled />
            </div>
          </div>
          <div>
            <Label>Context / reason (optional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={template === "failed" ? "e.g. Bank reference not found" : "Anything specific to mention"}
              rows={2}
            />
          </div>

          <Button onClick={generate} disabled={generating} className="w-full">
            {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generating ? "Generating..." : "Generate with AI"}
          </Button>

          {(subject || body) && (
            <>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
              </div>
              <Button onClick={send} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Send className="w-4 h-4 mr-2" /> Open in Gmail App
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Opens Gmail app on mobile. Falls back to default mail client otherwise.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
