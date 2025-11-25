import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { betAmount, potentialWin, selectedTeamName, homeTeam, awayTeam } = location.state || {};

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const accountDetails = {
    accountNumber: "1234567890",
    accountName: "SPORTY CODES",
    bankName: "GTBank",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!screenshot) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setIsSubmitted(true);
    toast.success("Payment submitted successfully!");
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center p-4">
        <Card className="bg-gradient-card border-bet-border p-8 max-w-md w-full text-center animate-fade-in">
          <div className="mb-6">
            <CheckCircle2 className="w-20 h-20 text-bet-success mx-auto mb-4" />
            <h2 className="text-2xl font-black text-foreground mb-3">Payment Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              We will review your payment, please hold... If payment delays, contact admin.
            </p>
          </div>

          <a
            href="https://wa.me/+2349067423764"
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Match</span>
              <span className="font-bold text-foreground">
                {homeTeam} vs {awayTeam}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Pick</span>
              <span className="font-bold text-primary">{selectedTeamName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bet Amount</span>
              <span className="font-bold text-foreground">₦{betAmount}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-bet-border">
              <span className="text-muted-foreground">Potential Win</span>
              <span className="text-2xl font-black text-primary">₦{potentialWin}</span>
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
              disabled={!screenshot}
              className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold text-lg py-6 disabled:opacity-50"
            >
              Submit Payment
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Payment;
