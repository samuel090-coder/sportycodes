import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { stake, payout, prediction, homeTeam, awayTeam, matchCount, price } = location.state || {};

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const fetchAccountDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['bank_name', 'account_name', 'account_number']);

      if (error) throw error;

      const updated = { ...accountDetails };
      (data || []).forEach((row: any) => {
        if (row.setting_key === 'bank_name') updated.bankName = row.setting_value;
        if (row.setting_key === 'account_name') updated.accountName = row.setting_value;
        if (row.setting_key === 'account_number') updated.accountNumber = row.setting_value;
      });
      setAccountDetails(updated);
    } catch (error) {
      console.error('Error fetching account details:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    if (!userEmail) {
      toast.error("Please enter your email");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload screenshot to Supabase storage
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, screenshot);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload screenshot. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(filePath);

      // Insert payment record
        const { error } = await supabase
        .from('payments')
        .insert({
          user_email: userEmail,
          sure_odd_id: location.state?.id || 'bet-payment',
          screenshot_url: urlData.publicUrl,
          amount: price || 0,
          status: 'pending',
          item_type: location.state?.type || 'sure-odd',
          item_id: location.state?.id || null
        });

      if (error) {
        console.error('Payment submission error:', error);
        toast.error("Failed to submit payment. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Store user email in localStorage for access control
      localStorage.setItem('user_payment_email', userEmail);

      setIsSubmitted(true);
      toast.success("Payment submitted successfully!");
      setIsSubmitting(false);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center p-4">
        <Card className="bg-gradient-card border-bet-border p-8 max-w-md w-full text-center animate-fade-in">
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-bet-success mx-auto mb-4" />
            <h2 className="text-2xl font-black text-foreground mb-3">Payment Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              We will review your payment, please hold... For quick approval, please message admin on WhatsApp with your payment screenshot.
            </p>
          </div>

          <a
            href={`https://wa.me/${whatsappNumber.replace(/\+/g, '')}?text=${encodeURIComponent(`Hello! I just made a payment.\n\nBet Summary:\n${matchCount && matchCount > 1 ? `${matchCount} SURE ODDS\n` : homeTeam && awayTeam ? `Match: ${homeTeam} vs ${awayTeam}\n` : ''}Your Pick: ${prediction || 'N/A'}\nBet Amount: ₦${stake || 0}\nPotential Win: ₦${payout || 0}\n\nPlease confirm my payment and grant access to the betting code. Thank you!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-bet-success text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all mb-4"
          >
            Contact Admin on WhatsApp
          </a>

          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="w-full border-bet-border"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bet-dark pb-8">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-primary-foreground">Payment</h1>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Bet Summary</h2>
          <div className="space-y-3">
            {matchCount && matchCount > 1 ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Match</span>
                <span className="font-bold text-foreground">
                  {matchCount} SURE ODDS
                </span>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Match</span>
                <span className="font-bold text-foreground">
                  {homeTeam} vs {awayTeam}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Pick</span>
              <span className="font-bold text-primary">{prediction || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bet Amount</span>
              <span className="font-bold text-foreground">₦{stake || 0}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-bet-border">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-2xl font-black text-primary">₦{payout || 0}</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-card border-bet-border p-6 mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Transfer To</h2>
          <div className="space-y-3 bg-secondary p-4 rounded-lg">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank Name</span>
              <span className="font-bold text-foreground">{accountDetails.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Name</span>
              <span className="font-bold text-foreground">{accountDetails.accountName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Number</span>
              <span className="font-bold text-primary text-xl">{accountDetails.accountNumber}</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
          <h2 className="text-xl font-bold text-foreground mb-4">Upload Payment Proof</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-foreground">
                Your Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="screenshot" className="text-foreground">
                Payment Screenshot
              </Label>
              <div className="mt-2">
                <label
                  htmlFor="screenshot"
                  className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-bet-border rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-all"
                >
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    {screenshot ? screenshot.name : "Click to upload screenshot"}
                  </span>
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!screenshot || !userEmail || isSubmitting}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold text-lg py-6 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Payment"}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Payment;
