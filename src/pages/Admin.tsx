import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Upload, Loader2, Sparkles, CheckCircle, XCircle, Terminal, Shield, Lock, Unlock } from "lucide-react";
import { useBettingData, SureOdd } from "@/hooks/useBettingData";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const navigate = useNavigate();
  const { sureOdds, addSureOdd, updateSureOdd, deleteSureOdd } = useBettingData();
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "1234567890",
    accountName: "SPORTY CODES",
    bankName: "GTBank",
  });

  const [editingSureOdd, setEditingSureOdd] = useState<SureOdd | null>(null);
  const [sureOddHomeLogoPreview, setSureOddHomeLogoPreview] = useState<string>("");
  const [sureOddAwayLogoPreview, setSureOddAwayLogoPreview] = useState<string>("");
  const [generatingLogo, setGeneratingLogo] = useState<"home" | "away" | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState("+2349067423764");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const isAuth = sessionStorage.getItem('admin_authenticated') === 'true';
    setIsAuthenticated(isAuth);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-pin', {
        body: { pin: adminPin }
      });

      if (error) throw error;

      if (data?.isValid) {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        toast.success("Access Granted");
      } else {
        toast.error("Invalid PIN - Access Denied");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication Failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const generateTeamLogo = async (teamName: string, field: "homeTeamLogo" | "awayTeamLogo") => {
    if (!teamName.trim()) {
      toast.error("Please enter team name first");
      return;
    }

    const logoType = field === "homeTeamLogo" ? "home" : "away";
    setGeneratingLogo(logoType);

    try {
      const { data, error } = await supabase.functions.invoke('generate-logo', {
        body: { teamName }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        if (logoType === "home") {
          setSureOddHomeLogoPreview(data.imageUrl);
        } else {
          setSureOddAwayLogoPreview(data.imageUrl);
        }
        toast.success("Logo generated successfully!");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Logo generation error:", error);
      toast.error(error.message || "Failed to generate logo. Please try uploading manually.");
    } finally {
      setGeneratingLogo(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setPreview: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handlePaymentStatus = async (paymentId: string, status: 'approved' | 'declined') => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success(`Payment ${status} successfully!`);
      fetchPayments();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment status');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayments();
      fetchWhatsappNumber();
    }
  }, [isAuthenticated]);

  const fetchWhatsappNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_number')
        .single();

      if (error) throw error;
      if (data) setWhatsappNumber(data.setting_value);
    } catch (error) {
      console.error('Error fetching WhatsApp number:', error);
    }
  };

  const handleUpdateWhatsapp = async () => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ setting_value: whatsappNumber })
        .eq('setting_key', 'whatsapp_number');

      if (error) throw error;
      toast.success("WhatsApp number updated successfully!");
    } catch (error) {
      console.error('Error updating WhatsApp:', error);
      toast.error("Failed to update WhatsApp number");
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPin(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-admin-pin', {
        body: { currentPin, newPin }
      });

      if (error) throw error;

      if (data?.isValid) {
        toast.success("PIN verified! Please update ADMIN_PIN secret with: " + data.newPin, {
          duration: 10000,
        });
        setCurrentPin("");
        setNewPin("");
      } else {
        toast.error(data?.message || "Invalid current PIN");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update PIN");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleSaveSureOdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const matchCount = parseInt(formData.get("matchCount") as string) || 1;
    const homeTeam = formData.get("homeTeam") as string;
    const awayTeam = formData.get("awayTeam") as string;
    
    // Validate team names for single match odds
    if (matchCount === 1 && (!homeTeam || !awayTeam)) {
      toast.error("Team names are required for single match odds");
      return;
    }
    
    const sureOddData = {
      homeTeam: matchCount > 1 ? "" : homeTeam,
      awayTeam: matchCount > 1 ? "" : awayTeam,
      homeTeamLogo: sureOddHomeLogoPreview || editingSureOdd?.homeTeamLogo || "",
      awayTeamLogo: sureOddAwayLogoPreview || editingSureOdd?.awayTeamLogo || "",
      prediction: formData.get("prediction") as string,
      odds: parseFloat(formData.get("odds") as string),
      confidence: formData.get("confidence") as string,
      betCode: formData.get("betCode") as string,
      status: (formData.get("status") as "not-started" | "scored" | "lost") || "not-started",
      price: parseFloat(formData.get("price") as string) || 0,
      matchCount: matchCount,
      scheduledTime: formData.get("scheduledTime") as string || null,
      stake: parseFloat(formData.get("stake") as string) || 0,
      payout: parseFloat(formData.get("payout") as string) || 0,
    };

    try {
      if (editingSureOdd) {
        await updateSureOdd(editingSureOdd.id, sureOddData);
        toast.success("Sure Odd updated successfully!");
        setEditingSureOdd(null);
      } else {
        await addSureOdd(sureOddData);
        toast.success("Sure Odd added successfully!");
      }
      (e.target as HTMLFormElement).reset();
      setSureOddHomeLogoPreview("");
      setSureOddAwayLogoPreview("");
    } catch (error) {
      console.error('Save sure odd error:', error);
      toast.error("Failed to save sure odd. Please try again.");
    }
  };

  const handleEditSureOdd = (sureOdd: SureOdd) => {
    setEditingSureOdd(sureOdd);
    setSureOddHomeLogoPreview(sureOdd.homeTeamLogo || "");
    setSureOddAwayLogoPreview(sureOdd.awayTeamLogo || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSureOdd = async (id: string) => {
    try {
      await deleteSureOdd(id);
      toast.success("Sure Odd deleted successfully!");
    } catch (error) {
      console.error('Delete sure odd error:', error);
      toast.error("Failed to delete sure odd. Please try again.");
    }
  };

  // Login Screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-cyber-panel border-2 border-cyber-neon-green shadow-neon-green p-8">
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4 mx-auto bg-cyber-neon-green/20" />
            <Skeleton className="h-10 w-full bg-cyber-neon-green/20" />
            <Skeleton className="h-10 w-full bg-cyber-neon-green/20" />
            <Skeleton className="h-12 w-full bg-cyber-neon-green/20" />
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated scan line */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyber-neon-green to-transparent animate-scan-line opacity-30" />
        </div>

        <Card className="w-full max-w-md bg-cyber-panel border-2 border-cyber-neon-green shadow-neon-green p-8 relative overflow-hidden animate-fade-in">
          {/* LED corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyber-neon-cyan animate-neon-pulse" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyber-neon-cyan animate-neon-pulse" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyber-neon-cyan animate-neon-pulse" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyber-neon-cyan animate-neon-pulse" />

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-cyber-neon-green animate-neon-pulse" />
                <Terminal className="w-8 h-8 text-cyber-neon-cyan animate-neon-pulse" />
              </div>
              <h1 className="text-3xl font-black text-cyber-neon-green tracking-wider font-mono">
                ADMIN ACCESS
              </h1>
              <p className="text-cyber-neon-cyan/70 font-mono text-sm">
                {"> AUTHORIZATION REQUIRED_"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="pin" className="text-cyber-neon-green font-mono">
                  ENTER ADMIN PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-green text-cyber-neon-green font-mono text-2xl text-center tracking-widest focus:shadow-neon-green transition-all"
                  placeholder="••••••"
                />
                <p className="text-cyber-neon-cyan/50 text-xs font-mono mt-2 text-center">
                  Enter 4-6 digit PIN code
                </p>
              </div>

              <Button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black tracking-wider font-mono text-lg py-6 shadow-neon-green hover:shadow-neon-cyan transition-all"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    ENTER SYSTEM
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // Main Admin Dashboard
  return (
    <div className="min-h-screen bg-cyber-dark pb-20 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-neon animate-scan-line" />
      </div>

      <header className="sticky top-0 z-30 bg-cyber-panel border-b-2 border-cyber-neon-green shadow-neon-green">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Terminal className="w-8 h-8 text-cyber-neon-green animate-neon-pulse" />
              <div>
                <h1 className="text-3xl font-black text-cyber-neon-green tracking-wider font-mono animate-glitch">
                  ADMIN CONTROL PANEL
                </h1>
                <p className="text-sm text-cyber-neon-cyan/70 font-mono mt-1">
                  {"> SYSTEM STATUS: ONLINE_"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyber-neon-green animate-neon-pulse" />
              <span className="text-cyber-neon-green font-mono text-sm">SECURE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Security Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-purple p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-neon-purple animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse delay-75" />
            </div>

            <h2 className="text-xl font-black text-cyber-neon-purple mb-6 font-mono flex items-center gap-2">
              <span className="text-cyber-neon-green">&gt;</span> UPDATE ADMIN PIN
            </h2>
            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div>
                <Label htmlFor="currentPin" className="text-cyber-neon-cyan font-mono text-sm">
                  CURRENT PIN
                </Label>
                <Input
                  id="currentPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono focus:border-cyber-neon-purple focus:shadow-neon-purple transition-all"
                />
              </div>
              <div>
                <Label htmlFor="newPin" className="text-cyber-neon-cyan font-mono text-sm">
                  NEW PIN (4-6 digits)
                </Label>
                <Input
                  id="newPin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-purple/50 text-cyber-neon-green font-mono focus:border-cyber-neon-purple focus:shadow-neon-purple transition-all"
                />
              </div>
              <Button
                type="submit"
                disabled={isUpdatingPin}
                className="w-full bg-cyber-neon-purple text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono shadow-neon-purple hover:shadow-neon-cyan transition-all"
              >
                {isUpdatingPin ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    UPDATING...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    UPDATE PIN
                  </>
                )}
              </Button>
            </form>
          </Card>

          <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-6 relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-2">
              <div className="w-2 h-2 rounded-full bg-cyber-neon-green animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse delay-75" />
            </div>

            <h2 className="text-xl font-black text-cyber-neon-green mb-6 font-mono flex items-center gap-2">
              <span className="text-cyber-neon-cyan">&gt;</span> WHATSAPP NUMBER
            </h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="whatsappNumber" className="text-cyber-neon-cyan font-mono text-sm">
                  CONTACT NUMBER
                </Label>
                <Input
                  id="whatsappNumber"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono focus:border-cyber-neon-cyan focus:shadow-neon-cyan transition-all"
                  placeholder="+234..."
                />
                <p className="text-cyber-neon-cyan/50 text-xs font-mono mt-2">
                  Users will contact this number after payment
                </p>
              </div>
              <Button
                onClick={handleUpdateWhatsapp}
                className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono shadow-neon-green hover:shadow-neon-cyan transition-all"
              >
                SAVE NUMBER
              </Button>
            </div>
          </Card>
        </div>

        {/* Account Details Section */}
        <Card className="bg-gradient-cyber border-2 border-cyber-neon-cyan/50 shadow-neon-cyan p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-neon-green animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse delay-75" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-purple animate-pulse delay-150" />
          </div>

          <h2 className="text-xl font-black text-cyber-neon-cyan mb-6 font-mono flex items-center gap-2">
            <span className="text-cyber-neon-green">&gt;</span> PAYMENT ACCOUNT CONFIGURATION
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName" className="text-cyber-neon-green font-mono text-sm">
                BANK NAME
              </Label>
              <Input
                id="bankName"
                value={accountDetails.bankName}
                onChange={(e) => setAccountDetails({ ...accountDetails, bankName: e.target.value })}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono focus:border-cyber-neon-cyan focus:shadow-neon-cyan transition-all"
              />
            </div>

            <div>
              <Label htmlFor="accountName" className="text-cyber-neon-green font-mono text-sm">
                ACCOUNT NAME
              </Label>
              <Input
                id="accountName"
                value={accountDetails.accountName}
                onChange={(e) => setAccountDetails({ ...accountDetails, accountName: e.target.value })}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono focus:border-cyber-neon-cyan focus:shadow-neon-cyan transition-all"
              />
            </div>

            <div>
              <Label htmlFor="accountNumber" className="text-cyber-neon-green font-mono text-sm">
                ACCOUNT NUMBER
              </Label>
              <Input
                id="accountNumber"
                value={accountDetails.accountNumber}
                onChange={(e) => setAccountDetails({ ...accountDetails, accountNumber: e.target.value })}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono focus:border-cyber-neon-cyan focus:shadow-neon-cyan transition-all"
              />
            </div>

            <Button
              onClick={() => toast.success("Account details updated!")}
              className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono shadow-neon-green hover:shadow-neon-cyan transition-all"
            >
              SAVE CONFIGURATION
            </Button>
          </div>
        </Card>

        {/* Sure Odds Management */}
        <Card className="bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-purple animate-pulse delay-75" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-green animate-pulse delay-150" />
          </div>

          <h2 className="text-xl font-black text-cyber-neon-green mb-6 font-mono flex items-center gap-2">
            <span className="text-cyber-neon-cyan">&gt;</span> {editingSureOdd ? "EDIT PREDICTION" : "ADD NEW PREDICTION"}
          </h2>
          <form onSubmit={handleSaveSureOdd} className="space-y-4">
            <div>
              <Label htmlFor="matchCount" className="text-cyber-neon-cyan font-mono text-sm">
                MATCH COUNT
              </Label>
              <Input
                id="matchCount"
                name="matchCount"
                type="number"
                min="1"
                required
                defaultValue={editingSureOdd?.matchCount || 1}
                onChange={(e) => {
                  const isMultiple = parseInt(e.target.value) > 1;
                  const homeTeamInput = document.getElementById("homeTeam") as HTMLInputElement;
                  const awayTeamInput = document.getElementById("awayTeam") as HTMLInputElement;
                  if (homeTeamInput && awayTeamInput) {
                    homeTeamInput.required = !isMultiple;
                    awayTeamInput.required = !isMultiple;
                  }
                }}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
              />
              <p className="text-cyber-neon-cyan/50 text-xs font-mono mt-1">
                Team names required only for single match (1)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="homeTeam" className="text-cyber-neon-cyan font-mono text-sm">
                  HOME TEAM {editingSureOdd?.matchCount === 1 || !editingSureOdd ? "(Required for single match)" : "(Optional)"}
                </Label>
                <Input
                  id="homeTeam"
                  name="homeTeam"
                  required={!editingSureOdd || editingSureOdd.matchCount === 1}
                  defaultValue={editingSureOdd?.homeTeam}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                />
              </div>
              <div>
                <Label htmlFor="awayTeam" className="text-cyber-neon-cyan font-mono text-sm">
                  AWAY TEAM {editingSureOdd?.matchCount === 1 || !editingSureOdd ? "(Required for single match)" : "(Optional)"}
                </Label>
                <Input
                  id="awayTeam"
                  name="awayTeam"
                  required={!editingSureOdd || editingSureOdd.matchCount === 1}
                  defaultValue={editingSureOdd?.awayTeam}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm">HOME LOGO</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("homeLogoInput")?.click()}
                      className="flex-1 border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan hover:text-cyber-dark font-mono"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      UPLOAD
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const homeTeam = (document.getElementById("homeTeam") as HTMLInputElement)?.value;
                        generateTeamLogo(homeTeam, "homeTeamLogo");
                      }}
                      disabled={generatingLogo === "home"}
                      className="flex-1 border-cyber-neon-purple text-cyber-neon-purple hover:bg-cyber-neon-purple hover:text-cyber-dark font-mono"
                    >
                      {generatingLogo === "home" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI
                    </Button>
                    <input
                      id="homeLogoInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setSureOddHomeLogoPreview)}
                    />
                  </div>
                  {sureOddHomeLogoPreview && (
                    <img
                      src={sureOddHomeLogoPreview}
                      alt="Home team preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-cyber-neon-green shadow-neon-green"
                    />
                  )}
                </div>
              </div>
              <div>
                <Label className="text-cyber-neon-cyan font-mono text-sm">AWAY LOGO</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("awayLogoInput")?.click()}
                      className="flex-1 border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan hover:text-cyber-dark font-mono"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      UPLOAD
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const awayTeam = (document.getElementById("awayTeam") as HTMLInputElement)?.value;
                        generateTeamLogo(awayTeam, "awayTeamLogo");
                      }}
                      disabled={generatingLogo === "away"}
                      className="flex-1 border-cyber-neon-purple text-cyber-neon-purple hover:bg-cyber-neon-purple hover:text-cyber-dark font-mono"
                    >
                      {generatingLogo === "away" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      AI
                    </Button>
                    <input
                      id="awayLogoInput"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setSureOddAwayLogoPreview)}
                    />
                  </div>
                  {sureOddAwayLogoPreview && (
                    <img
                      src={sureOddAwayLogoPreview}
                      alt="Away team preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-cyber-neon-green shadow-neon-green"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="odds" className="text-cyber-neon-cyan font-mono text-sm">
                  ODDS
                </Label>
                <Input
                  id="odds"
                  name="odds"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingSureOdd?.odds}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                />
              </div>
              <div>
                <Label htmlFor="confidence" className="text-cyber-neon-cyan font-mono text-sm">
                  CONFIDENCE %
                </Label>
                <Input
                  id="confidence"
                  name="confidence"
                  required
                  defaultValue={editingSureOdd?.confidence}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                  placeholder="95%"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prediction" className="text-cyber-neon-cyan font-mono text-sm">
                  PREDICTION
                </Label>
                <Input
                  id="prediction"
                  name="prediction"
                  required
                  defaultValue={editingSureOdd?.prediction}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                  placeholder="Over 2.5"
                />
              </div>
              <div>
                <Label htmlFor="price" className="text-cyber-neon-cyan font-mono text-sm">
                  PRICE (₦)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={editingSureOdd?.price}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="stake" className="text-cyber-neon-cyan font-mono text-sm">
                  STAKE (₦)
                </Label>
                <Input
                  id="stake"
                  name="stake"
                  type="number"
                  step="0.01"
                  defaultValue={editingSureOdd?.stake || 0}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="payout" className="text-cyber-neon-cyan font-mono text-sm">
                  PAYOUT (₦)
                </Label>
                <Input
                  id="payout"
                  name="payout"
                  type="number"
                  step="0.01"
                  defaultValue={editingSureOdd?.payout || 0}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                  placeholder="2500"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="betCode" className="text-cyber-neon-cyan font-mono text-sm">
                BET CODE
              </Label>
              <Input
                id="betCode"
                name="betCode"
                required
                defaultValue={editingSureOdd?.betCode}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status" className="text-cyber-neon-cyan font-mono text-sm">
                  STATUS
                </Label>
                <Select name="status" defaultValue={editingSureOdd?.status || "not-started"}>
                  <SelectTrigger className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-cyber-panel border-cyber-neon-green">
                    <SelectItem value="not-started" className="text-cyber-neon-green font-mono">NOT STARTED</SelectItem>
                    <SelectItem value="scored" className="text-cyber-neon-green font-mono">SCORED</SelectItem>
                    <SelectItem value="lost" className="text-cyber-neon-red font-mono">LOST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scheduledTime" className="text-cyber-neon-cyan font-mono text-sm">
                  SCHEDULED START TIME
                </Label>
                <Input
                  id="scheduledTime"
                  name="scheduledTime"
                  type="datetime-local"
                  defaultValue={editingSureOdd?.scheduledTime ? new Date(editingSureOdd.scheduledTime).toISOString().slice(0, 16) : ""}
                  className="mt-2 bg-cyber-dark/50 border-cyber-neon-cyan/50 text-cyber-neon-green font-mono focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
                />
                <p className="text-cyber-neon-cyan/50 text-xs font-mono mt-1">
                  Optional: Game activates at scheduled time
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1 bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black font-mono shadow-neon-green hover:shadow-neon-cyan transition-all"
              >
                {editingSureOdd ? "UPDATE PREDICTION" : "ADD PREDICTION"}
              </Button>
              {editingSureOdd && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingSureOdd(null);
                    setSureOddHomeLogoPreview("");
                    setSureOddAwayLogoPreview("");
                  }}
                  className="border-cyber-neon-red text-cyber-neon-red hover:bg-cyber-neon-red hover:text-cyber-dark font-mono"
                >
                  CANCEL
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Sure Odds List */}
        <Card className="bg-gradient-cyber border-2 border-cyber-neon-purple/50 shadow-neon-cyan p-6 relative overflow-hidden">
          <h2 className="text-xl font-black text-cyber-neon-purple mb-6 font-mono flex items-center gap-2">
            <span className="text-cyber-neon-green">&gt;</span> ACTIVE PREDICTIONS
          </h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-cyber-neon-green/30 hover:bg-cyber-panel/50">
                  <TableHead className="text-cyber-neon-cyan font-mono">TEAMS</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">PREDICTION</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">ODDS</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">CONFIDENCE</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">CODE</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">PRICE</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono">STATUS</TableHead>
                  <TableHead className="text-cyber-neon-cyan font-mono text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sureOdds.map((odd) => (
                  <TableRow key={odd.id} className="border-cyber-neon-green/20 hover:bg-cyber-panel/50 transition-colors">
                    <TableCell className="text-cyber-neon-green font-mono">
                      {odd.matchCount > 1 ? `${odd.matchCount} MATCHES` : `${odd.homeTeam} vs ${odd.awayTeam}`}
                    </TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">{odd.prediction}</TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">{odd.odds}</TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">{odd.confidence}</TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">{odd.betCode}</TableCell>
                    <TableCell className="text-cyber-neon-green font-mono">₦{odd.price}</TableCell>
                    <TableCell>
                      <span className={`font-mono text-xs px-2 py-1 rounded ${
                        odd.status === 'scored' ? 'bg-cyber-neon-green/20 text-cyber-neon-green' :
                        odd.status === 'lost' ? 'bg-cyber-neon-red/20 text-cyber-neon-red' :
                        'bg-cyber-neon-cyan/20 text-cyber-neon-cyan'
                      }`}>
                        {odd.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSureOdd(odd)}
                          className="border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan hover:text-cyber-dark"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSureOdd(odd.id)}
                          className="border-cyber-neon-red text-cyber-neon-red hover:bg-cyber-neon-red hover:text-cyber-dark"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Payment Approvals */}
        <Card className="bg-gradient-cyber border-2 border-cyber-neon-red/50 shadow-neon-red p-6 relative overflow-hidden">
          <h2 className="text-xl font-black text-cyber-neon-red mb-6 font-mono flex items-center gap-2">
            <span className="text-cyber-neon-green">&gt;</span> PAYMENT APPROVALS
          </h2>
          {loadingPayments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full bg-cyber-neon-green/10" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-cyber-neon-green/30 hover:bg-cyber-panel/50">
                    <TableHead className="text-cyber-neon-cyan font-mono">USER EMAIL</TableHead>
                    <TableHead className="text-cyber-neon-cyan font-mono">AMOUNT</TableHead>
                    <TableHead className="text-cyber-neon-cyan font-mono">DATE</TableHead>
                    <TableHead className="text-cyber-neon-cyan font-mono">SCREENSHOT</TableHead>
                    <TableHead className="text-cyber-neon-cyan font-mono">STATUS</TableHead>
                    <TableHead className="text-cyber-neon-cyan font-mono text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} className="border-cyber-neon-green/20 hover:bg-cyber-panel/50 transition-colors">
                      <TableCell className="text-cyber-neon-green font-mono">{payment.user_email}</TableCell>
                      <TableCell className="text-cyber-neon-green font-mono">₦{payment.amount}</TableCell>
                      <TableCell className="text-cyber-neon-green font-mono">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedScreenshot(payment.screenshot_url)}
                          className="border-cyber-neon-purple text-cyber-neon-purple hover:bg-cyber-neon-purple hover:text-cyber-dark font-mono"
                        >
                          VIEW
                        </Button>
                      </TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs px-2 py-1 rounded ${
                          payment.status === 'approved' ? 'bg-cyber-neon-green/20 text-cyber-neon-green' :
                          payment.status === 'declined' ? 'bg-cyber-neon-red/20 text-cyber-neon-red' :
                          'bg-cyber-neon-cyan/20 text-cyber-neon-cyan'
                        }`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePaymentStatus(payment.id, 'approved')}
                            disabled={payment.status === 'approved'}
                            className="border-cyber-neon-green text-cyber-neon-green hover:bg-cyber-neon-green hover:text-cyber-dark disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePaymentStatus(payment.id, 'declined')}
                            disabled={payment.status === 'declined'}
                            className="border-cyber-neon-red text-cyber-neon-red hover:bg-cyber-neon-red hover:text-cyber-dark disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>

      {/* Screenshot Modal */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="bg-cyber-panel border-2 border-cyber-neon-green shadow-neon-green max-w-2xl">
          <div className="p-4">
            <h3 className="text-xl font-black text-cyber-neon-green mb-4 font-mono">PAYMENT SCREENSHOT</h3>
            {selectedScreenshot && (
              <img
                src={selectedScreenshot}
                alt="Payment proof"
                className="w-full h-auto rounded border-2 border-cyber-neon-cyan shadow-neon-cyan"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
