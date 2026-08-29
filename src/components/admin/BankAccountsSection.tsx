import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Landmark, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  is_active: boolean;
  display_order: number;
}

export const BankAccountsSection = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAcct, setNewAcct] = useState({ bank_name: "", account_name: "", account_number: "" });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bank_accounts")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast.error("Failed to load accounts");
    setAccounts((data as any) || []);
    setLoading(false);
  };

  const addAccount = async () => {
    if (!newAcct.bank_name.trim() || !newAcct.account_name.trim() || !newAcct.account_number.trim()) {
      toast.error("Fill bank name, account name and account number");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("bank_accounts").insert({
      ...newAcct,
      display_order: (accounts[accounts.length - 1]?.display_order || 0) + 1,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    setNewAcct({ bank_name: "", account_name: "", account_number: "" });
    toast.success("Account added");
    load();
  };

  const saveAccount = async (acct: BankAccount) => {
    setSavingId(acct.id);
    const { error } = await supabase
      .from("bank_accounts")
      .update({
        bank_name: acct.bank_name,
        account_name: acct.account_name,
        account_number: acct.account_number,
        is_active: acct.is_active,
        display_order: acct.display_order,
      })
      .eq("id", acct.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Account updated");
  };

  const removeAccount = async (id: string) => {
    const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Account removed");
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const patch = (id: string, key: keyof BankAccount, value: any) =>
    setAccounts(prev => prev.map(a => (a.id === id ? { ...a, [key]: value } : a)));

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
      <h3 className="text-xl font-bold text-foreground mb-1 flex items-center gap-2">
        <Landmark className="w-5 h-5 text-primary" />
        Deposit Accounts (Rotating)
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Users are shown one account per deposit. The next time they deposit, a different account from this list is generated for them.
      </p>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {accounts.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-primary">#{i + 1}</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={a.is_active} onCheckedChange={(v) => patch(a.id, "is_active", v)} />
                    <span className="text-xs text-muted-foreground">{a.is_active ? "Active" : "Hidden"}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeAccount(a.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={a.bank_name} onChange={(e) => patch(a.id, "bank_name", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account Number</Label>
                  <Input value={a.account_number} onChange={(e) => patch(a.id, "account_number", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Account Name</Label>
                  <Input value={a.account_name} onChange={(e) => patch(a.id, "account_name", e.target.value)} />
                </div>
              </div>
              <Button size="sm" onClick={() => saveAccount(a)} disabled={savingId === a.id}>
                {savingId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Save</span>
              </Button>
            </div>
          ))}
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No accounts yet. Add one below.</p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <p className="text-sm font-bold text-primary">Add New Account</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Bank name" value={newAcct.bank_name} onChange={(e) => setNewAcct(p => ({ ...p, bank_name: e.target.value }))} />
          <Input placeholder="Account number" value={newAcct.account_number} onChange={(e) => setNewAcct(p => ({ ...p, account_number: e.target.value }))} />
          <Input placeholder="Account name" value={newAcct.account_name} onChange={(e) => setNewAcct(p => ({ ...p, account_name: e.target.value }))} />
        </div>
        <Button onClick={addAccount} disabled={adding}>
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span className="ml-2">Add Account</span>
        </Button>
      </div>
    </Card>
  );
};
