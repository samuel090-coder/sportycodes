import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const PaymentsSection = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePaymentStatus = async (paymentId: string, newStatus: "approved" | "declined") => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: newStatus })
        .eq("id", paymentId);

      if (error) throw error;

      if (newStatus === "approved") {
        const payment = payments.find((p) => p.id === paymentId);
        if (payment) {
          await supabase.functions.invoke("notify-payment-approved", {
            body: {
              userEmail: payment.user_email,
              itemType: payment.item_type,
              itemId: payment.item_id,
            },
          });
        }
      }

      toast.success(`Payment ${newStatus}!`);
      fetchPayments();
    } catch (error) {
      toast.error(`Failed to ${newStatus} payment`);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-6">
        <h3 className="text-2xl font-black text-cyber-neon-purple mb-6 font-mono flex items-center gap-2">
          <Users className="w-6 h-6 animate-neon-pulse" />
          PAYMENT APPROVALS
        </h3>

        <div className="overflow-x-auto">
          {loadingPayments ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full bg-cyber-dark/50" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-cyber-neon-cyan/50 font-mono">No payments to review</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-cyber-neon-purple/30">
                  <TableHead className="text-cyber-neon-green font-mono">USER</TableHead>
                  <TableHead className="text-cyber-neon-green font-mono">AMOUNT</TableHead>
                  <TableHead className="text-cyber-neon-green font-mono">STATUS</TableHead>
                  <TableHead className="text-cyber-neon-green font-mono">DATE</TableHead>
                  <TableHead className="text-cyber-neon-green font-mono">SCREENSHOT</TableHead>
                  <TableHead className="text-cyber-neon-green font-mono">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id} className="border-cyber-neon-purple/20">
                    <TableCell className="text-cyber-neon-cyan font-mono text-xs">
                      {payment.user_email}
                    </TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">
                      ₦{payment.amount}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold font-mono ${
                          payment.status === "approved"
                            ? "bg-cyber-neon-green/20 text-cyber-neon-green"
                            : payment.status === "declined"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-yellow-500/20 text-yellow-500"
                        }`}
                      >
                        {payment.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-cyber-neon-cyan font-mono text-xs">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {payment.screenshot_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedScreenshot(payment.screenshot_url)}
                          className="text-cyber-neon-purple hover:text-cyber-neon-cyan font-mono"
                        >
                          VIEW
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handlePaymentStatus(payment.id, "approved")}
                            className="bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handlePaymentStatus(payment.id, "declined")}
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

      {/* Screenshot Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="bg-cyber-panel border-2 border-cyber-neon-purple max-w-2xl">
          {selectedScreenshot && (
            <img
              src={selectedScreenshot}
              alt="Payment screenshot"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
