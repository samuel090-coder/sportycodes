import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle, Eye, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PaymentsSection = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDeposits();
    fetchWithdrawals();
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      toast.error("Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals");
    }
  };

  const handleDepositStatus = async (depositId: string, userId: string, amount: number, newStatus: "approved" | "rejected") => {
    setProcessingId(depositId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const adminId = sessionData?.session?.user?.id;

      // Update deposit request status
      const { error: updateError } = await supabase
        .from("deposit_requests")
        .update({ 
          status: newStatus, 
          processed_at: new Date().toISOString(),
          processed_by: adminId,
          admin_note: adminNote || null
        })
        .eq("id", depositId);

      if (updateError) throw updateError;

      // If approved, update user's wallet
      if (newStatus === "approved") {
        const { data: wallet, error: walletFetchError } = await supabase
          .from("wallets")
          .select("balance, total_deposited")
          .eq("user_id", userId)
          .single();

        if (walletFetchError) throw walletFetchError;

        const { error: walletError } = await supabase
          .from("wallets")
          .update({ 
            balance: (wallet?.balance || 0) + amount,
            total_deposited: (wallet?.total_deposited || 0) + amount
          })
          .eq("user_id", userId);

        if (walletError) throw walletError;
      }

      toast.success(`Deposit ${newStatus}!`);
      setAdminNote("");
      fetchDeposits();
    } catch (error) {
      console.error("Error processing deposit:", error);
      toast.error(`Failed to ${newStatus} deposit`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawalStatus = async (withdrawalId: string, userId: string, amount: number, newStatus: "approved" | "rejected") => {
    setProcessingId(withdrawalId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const adminId = sessionData?.session?.user?.id;

      // Update withdrawal request status
      const { error: updateError } = await supabase
        .from("withdrawal_requests")
        .update({ 
          status: newStatus, 
          processed_at: new Date().toISOString(),
          processed_by: adminId,
          admin_note: adminNote || null
        })
        .eq("id", withdrawalId);

      if (updateError) throw updateError;

      // If approved, deduct from user's wallet
      if (newStatus === "approved") {
        const { data: wallet, error: walletFetchError } = await supabase
          .from("wallets")
          .select("balance, total_withdrawn")
          .eq("user_id", userId)
          .single();

        if (walletFetchError) throw walletFetchError;

        const { error: walletError } = await supabase
          .from("wallets")
          .update({ 
            balance: Math.max(0, (wallet?.balance || 0) - amount),
            total_withdrawn: (wallet?.total_withdrawn || 0) + amount
          })
          .eq("user_id", userId);

        if (walletError) throw walletError;
      }

      toast.success(`Withdrawal ${newStatus}!`);
      setAdminNote("");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      toast.error(`Failed to ${newStatus} withdrawal`);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-500 border-green-500/30",
      rejected: "bg-red-500/20 text-red-500 border-red-500/30"
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border">
          <TabsTrigger value="deposits" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowDownCircle className="w-4 h-4" />
            Deposits
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowUpCircle className="w-4 h-4" />
            Withdrawals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deposits" className="mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-green-500" />
              Deposit Requests
            </h3>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : deposits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No deposit requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">User ID</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Method</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Proof</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit) => (
                      <TableRow key={deposit.id} className="border-border">
                        <TableCell className="text-foreground text-xs font-mono">
                          {deposit.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-green-500 font-bold">
                          ₦{deposit.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-foreground capitalize">
                          {deposit.payment_method}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusBadge(deposit.status)}`}>
                            {deposit.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(deposit.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {deposit.screenshot_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedScreenshot(deposit.screenshot_url)}
                              className="text-primary hover:text-primary/80"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {deposit.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleDepositStatus(deposit.id, deposit.user_id, deposit.amount, "approved")}
                                disabled={processingId === deposit.id}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDepositStatus(deposit.id, deposit.user_id, deposit.amount, "rejected")}
                                disabled={processingId === deposit.id}
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-500/10"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-orange-500" />
              Withdrawal Requests
            </h3>

            <div className="overflow-x-auto">
              {withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No withdrawal requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">User ID</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Method</TableHead>
                      <TableHead className="text-muted-foreground">Account</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id} className="border-border">
                        <TableCell className="text-foreground text-xs font-mono">
                          {withdrawal.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-orange-500 font-bold">
                          ₦{withdrawal.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-foreground capitalize">
                          {withdrawal.payment_method}
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                                <CreditCard className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 bg-card border-border p-4">
                              <h4 className="font-bold text-foreground mb-3">Bank Details</h4>
                              {(() => {
                                try {
                                  const details = JSON.parse(withdrawal.account_details);
                                  return (
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Bank:</span>
                                        <span className="text-foreground font-medium">{details.bank_name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Account:</span>
                                        <span className="text-foreground font-medium">{details.account_number}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Name:</span>
                                        <span className="text-foreground font-medium">{details.account_name}</span>
                                      </div>
                                    </div>
                                  );
                                } catch {
                                  return <p className="text-muted-foreground text-sm">{withdrawal.account_details}</p>;
                                }
                              })()}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusBadge(withdrawal.status)}`}>
                            {withdrawal.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {withdrawal.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleWithdrawalStatus(withdrawal.id, withdrawal.user_id, withdrawal.amount, "approved")}
                                disabled={processingId === withdrawal.id}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleWithdrawalStatus(withdrawal.id, withdrawal.user_id, withdrawal.amount, "rejected")}
                                disabled={processingId === withdrawal.id}
                                variant="outline"
                                className="border-red-500 text-red-500 hover:bg-red-500/10"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Admin Note Input */}
      <Card className="bg-card/30 border-border p-4">
        <label className="text-sm text-muted-foreground mb-2 block">Admin Note (optional)</label>
        <Textarea
          placeholder="Add a note for this transaction..."
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          className="bg-background border-border"
        />
      </Card>

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="bg-card border-border max-w-2xl">
          {selectedScreenshot && (
            <img
              src={selectedScreenshot}
              alt="Payment proof"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
