import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Shield, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const SecuritySection = () => {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("+2349067423764");
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "1234567890",
    accountName: "SPORTY CODES",
    bankName: "GTBank",
  });

  useEffect(() => {
    fetchWhatsappNumber();
    fetchAccountDetails();
  }, []);

  const fetchWhatsappNumber = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "whatsapp_number")
        .maybeSingle();

      if (data) setWhatsappNumber(data.setting_value);
    } catch (error) {
      console.error("Error fetching WhatsApp number:", error);
    }
  };

  const fetchAccountDetails = async () => {
    try {
      const { data: accountNumber } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "account_number")
        .maybeSingle();

      const { data: accountName } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "account_name")
        .maybeSingle();

      const { data: bankName } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "bank_name")
        .maybeSingle();

      setAccountDetails({
        accountNumber: accountNumber?.setting_value || "1234567890",
        accountName: accountName?.setting_value || "SPORTY CODES",
        bankName: bankName?.setting_value || "GTBank",
      });
    } catch (error) {
      console.error("Error fetching account details:", error);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPin || !newPin) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsUpdatingPin(true);
    try {
      const { error } = await supabase.functions.invoke("update-admin-pin", {
        body: { currentPin, newPin },
      });

      if (error) throw error;

      toast.success("PIN updated successfully! Please login again.");
      setCurrentPin("");
      setNewPin("");
      sessionStorage.removeItem("isAdminAuthenticated");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to update PIN");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleUpdateWhatsapp = async () => {
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          setting_key: "whatsapp_number",
          setting_value: whatsappNumber,
        });

      if (error) throw error;
      toast.success("WhatsApp number updated!");
    } catch (error) {
      toast.error("Failed to update WhatsApp number");
    }
  };

  const handleSaveAccountDetails = async () => {
    try {
      await supabase.from("app_settings").upsert([
        { setting_key: "account_number", setting_value: accountDetails.accountNumber },
        { setting_key: "account_name", setting_value: accountDetails.accountName },
        { setting_key: "bank_name", setting_value: accountDetails.bankName },
      ]);

      toast.success("Bank details updated successfully!");
    } catch (error) {
      toast.error("Failed to update bank details");
    }
  };

  return (
    <div className="space-y-6">
      {/* PIN Update */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-6">
        <h3 className="text-xl font-black text-cyber-neon-green mb-4 font-mono flex items-center gap-2">
          <Lock className="w-5 h-5" />
          UPDATE ADMIN PIN
        </h3>
        <form onSubmit={handleUpdatePin} className="space-y-4">
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">CURRENT PIN</Label>
            <Input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono"
              required
            />
          </div>
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">NEW PIN</Label>
            <Input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isUpdatingPin}
            className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
          >
            {isUpdatingPin ? "UPDATING..." : "UPDATE PIN"}
          </Button>
        </form>
      </Card>

      {/* WhatsApp Settings */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-6">
        <h3 className="text-xl font-black text-cyber-neon-purple mb-4 font-mono flex items-center gap-2">
          <Phone className="w-5 h-5" />
          WHATSAPP SUPPORT NUMBER
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">CONTACT NUMBER</Label>
            <Input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono"
            />
          </div>
          <Button
            onClick={handleUpdateWhatsapp}
            className="w-full bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono"
          >
            UPDATE WHATSAPP
          </Button>
        </div>
      </Card>

      {/* Bank Details */}
      <Card className="bg-gradient-cyber border-2 border-cyber-neon-cyan/50 shadow-neon-cyan p-6">
        <h3 className="text-xl font-black text-cyber-neon-cyan mb-4 font-mono flex items-center gap-2">
          <Shield className="w-5 h-5" />
          BANK ACCOUNT DETAILS
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">ACCOUNT NUMBER</Label>
            <Input
              value={accountDetails.accountNumber}
              onChange={(e) => setAccountDetails({ ...accountDetails, accountNumber: e.target.value })}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
            />
          </div>
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">ACCOUNT NAME</Label>
            <Input
              value={accountDetails.accountName}
              onChange={(e) => setAccountDetails({ ...accountDetails, accountName: e.target.value })}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
            />
          </div>
          <div>
            <Label className="text-cyber-neon-cyan font-mono text-sm">BANK NAME</Label>
            <Input
              value={accountDetails.bankName}
              onChange={(e) => setAccountDetails({ ...accountDetails, bankName: e.target.value })}
              className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono"
            />
          </div>
          <Button
            onClick={handleSaveAccountDetails}
            className="w-full bg-cyber-neon-cyan text-cyber-dark hover:bg-cyber-neon-green font-black font-mono"
          >
            SAVE BANK DETAILS
          </Button>
        </div>
      </Card>
    </div>
  );
};
