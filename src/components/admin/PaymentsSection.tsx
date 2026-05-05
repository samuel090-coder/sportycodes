import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle, Eye, CreditCard, PlusCircle, Search, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, getScreenshotSignedUrl } from "@/lib/audit";
import { DepositMessageDialog } from "./DepositMessageDialog";

export const PaymentsSection = () => {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Direct Credit Modal State
  const [directCreditOpen, setDirectCreditOpen] = useState(false);
  const [creditUserEmail, setCreditUserEmail] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [isCrediting, setIsCrediting] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [msgTarget, setMsgTarget] = useState<any>(null);

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

      // Send branded email
      supabase.functions.invoke('send-email', {
        body: {
          type: newStatus === 'approved' ? 'deposit_approved' : 'deposit_declined',
          userId,
          data: { amount, reason: adminNote || undefined }
        }
      }).catch(console.error);

      logAudit(`deposit_${newStatus}`, { targetTable: "deposit_requests", targetId: depositId, targetUserId: userId, details: { amount, note: adminNote || null } });
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

      // Send branded email
      supabase.functions.invoke('send-email', {
        body: {
          type: newStatus === 'approved' ? 'withdrawal_approved' : 'withdrawal_declined',
          userId,
          data: { amount, reason: adminNote || undefined }
        }
      }).catch(console.error);

      logAudit(`withdrawal_${newStatus}`, { targetTable: "withdrawal_requests", targetId: withdrawalId, targetUserId: userId, details: { amount, note: adminNote || null } });
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

  const searchUser = async () => {
    if (!creditUserEmail.trim()) {
      toast.error("Please enter a user email");
      return;
    }

    setSearchingUser(true);
    setFoundUser(null);
    try {
      // Search for user by email in profiles (via auth)
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .limit(100);

      if (error) throw error;

      // Now check wallets to find matching user
      const { data: wallets } = await supabase
        .from("wallets")
        .select("user_id, balance");

      // Try to find user by checking deposit_requests for matching email pattern
      const { data: depositUser } = await supabase
        .from("deposit_requests")
        .select("user_id")
        .limit(1);

      // For now, search by user_id if it looks like a UUID, otherwise show profiles list
      if (creditUserEmail.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const profile = profiles?.find(p => p.id === creditUserEmail);
        const wallet = wallets?.find(w => w.user_id === creditUserEmail);
        
        if (profile || wallet) {
          setFoundUser({
            id: creditUserEmail,
            display_name: profile?.display_name || profile?.username || "User",
            balance: wallet?.balance || 0
          });
        } else {
          toast.error("User not found");
        }
      } else {
        // Search by username or display_name
        const profile = profiles?.find(p => 
          p.username?.toLowerCase() === creditUserEmail.toLowerCase() ||
          p.display_name?.toLowerCase().includes(creditUserEmail.toLowerCase())
        );

        if (profile) {
          const wallet = wallets?.find(w => w.user_id === profile.id);
          setFoundUser({
            id: profile.id,
            display_name: profile.display_name || profile.username || "User",
            balance: wallet?.balance || 0
          });
        } else {
          toast.error("User not found. Try using their User ID instead.");
        }
      }
    } catch (error) {
      console.error("Error searching user:", error);
      toast.error("Failed to search for user");
    } finally {
      setSearchingUser(false);
    }
  };

  const handleDirectCredit = async () => {
    if (!foundUser || !creditAmount) {
      toast.error("Please find a user and enter an amount");
      return;
    }

    const amount = parseFloat(creditAmount);
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    setIsCrediting(true);
    try {
      // Get current wallet
      const { data: wallet, error: walletFetchError } = await supabase
        .from("wallets")
        .select("balance, total_deposited")
        .eq("user_id", foundUser.id)
        .maybeSingle();

      if (walletFetchError) throw walletFetchError;

      if (wallet) {
        // Update existing wallet
        const { error: updateError } = await supabase
          .from("wallets")
          .update({
            balance: (wallet.balance || 0) + amount,
            total_deposited: (wallet.total_deposited || 0) + amount
          })
          .eq("user_id", foundUser.id);

        if (updateError) throw updateError;
      } else {
        // Create new wallet
        const { error: insertError } = await supabase
          .from("wallets")
          .insert({
            user_id: foundUser.id,
            balance: amount,
            total_deposited: amount
          });

        if (insertError) throw insertError;
      }

      // Create a deposit record for tracking
      const { data: sessionData } = await supabase.auth.getSession();
      const { error: depositError } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: foundUser.id,
          amount,
          payment_method: "admin_direct_credit",
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: sessionData?.session?.user?.id,
          admin_note: creditNote || "Direct credit by admin"
        });

      if (depositError) throw depositError;

      toast.success(`Successfully credited ₦${amount.toLocaleString()} to ${foundUser.display_name}'s wallet!`);
      setDirectCreditOpen(false);
      setCreditUserEmail("");
      setCreditAmount("");
      setCreditNote("");
      setFoundUser(null);
      fetchDeposits();
    } catch (error) {
      console.error("Error crediting wallet:", error);
      toast.error("Failed to credit wallet");
    } finally {
      setIsCrediting(false);
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
      {/* Direct Credit Button */}
      <Card className="bg-gradient-to-r from-bet-success/20 to-bet-success/5 border-bet-success/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-bet-success" />
              Direct Wallet Credit
            </h3>
            <p className="text-sm text-muted-foreground">Credit any user's wallet directly without bank transfer</p>
          </div>
          <Button
            onClick={() => setDirectCreditOpen(true)}
            className="bg-bet-success hover:bg-bet-success/90 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Credit Wallet
          </Button>
        </div>
      </Card>

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
              <ArrowDownCircle className="w-5 h-5 text-bet-success" />
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
                              onClick={async () => {
                                const url = await getScreenshotSignedUrl(deposit.screenshot_path || deposit.screenshot_url);
                                if (!url) { toast.error("Could not load screenshot"); return; }
                                logAudit("payment_screenshot_viewed", { targetTable: "deposit_requests", targetId: deposit.id, targetUserId: deposit.user_id });
                                setSelectedScreenshot(url);
                              }}
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

      {/* Direct Credit Modal */}
      <Dialog open={directCreditOpen} onOpenChange={setDirectCreditOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-bet-success" />
              Direct Wallet Credit
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Credit funds directly to any user's wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* User Search */}
            <div className="space-y-2">
              <Label className="text-foreground">Find User (Username or User ID)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter username or user ID..."
                  value={creditUserEmail}
                  onChange={(e) => {
                    setCreditUserEmail(e.target.value);
                    setFoundUser(null);
                  }}
                  className="flex-1 bg-secondary/50 border-border"
                />
                <Button
                  onClick={searchUser}
                  disabled={searchingUser}
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Found User Display */}
            {foundUser && (
              <div className="bg-bet-success/10 border border-bet-success/30 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">User Found:</p>
                <p className="font-bold text-foreground">{foundUser.display_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{foundUser.id}</p>
                <p className="text-sm text-bet-success mt-2">
                  Current Balance: ₦{foundUser.balance?.toLocaleString() || "0"}
                </p>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-foreground">Amount to Credit (₦)</Label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label className="text-foreground">Note (optional)</Label>
              <Textarea
                placeholder="Reason for credit..."
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                className="bg-secondary/50 border-border"
              />
            </div>

            <Button
              onClick={handleDirectCredit}
              disabled={isCrediting || !foundUser || !creditAmount}
              className="w-full bg-bet-success hover:bg-bet-success/90 text-white"
            >
              {isCrediting ? "Processing..." : `Credit ₦${creditAmount || "0"} to Wallet`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
