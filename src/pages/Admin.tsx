import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Admin = () => {
  const [accountDetails, setAccountDetails] = useState({
    accountNumber: "1234567890",
    accountName: "SPORTY CODES",
    bankName: "GTBank",
  });

  const handleSaveAccount = () => {
    toast.success("Account details updated successfully!");
  };

  const handleSaveMatch = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Match added successfully!");
  };

  return (
    <div className="min-h-screen bg-bet-dark pb-8">
      <header className="sticky top-0 z-30 bg-gradient-primary shadow-bet">
        <div className="max-w-screen-xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-black text-primary-foreground">Admin Dashboard</h1>
          <p className="text-sm text-primary-foreground/80 mt-1">Manage your betting platform</p>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-bet-card">
            <TabsTrigger value="account" className="data-[state=active]:bg-primary">
              Account Details
            </TabsTrigger>
            <TabsTrigger value="matches" className="data-[state=active]:bg-primary">
              Manage Matches
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-6">Update Payment Account</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bankName" className="text-foreground">
                    Bank Name
                  </Label>
                  <Input
                    id="bankName"
                    value={accountDetails.bankName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, bankName: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="accountName" className="text-foreground">
                    Account Name
                  </Label>
                  <Input
                    id="accountName"
                    value={accountDetails.accountName}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountName: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="accountNumber" className="text-foreground">
                    Account Number
                  </Label>
                  <Input
                    id="accountNumber"
                    value={accountDetails.accountNumber}
                    onChange={(e) =>
                      setAccountDetails({ ...accountDetails, accountNumber: e.target.value })
                    }
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <Button
                  onClick={handleSaveAccount}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="matches">
            <Card className="bg-gradient-card border-bet-border p-6 animate-fade-in">
              <h2 className="text-xl font-bold text-foreground mb-6">Add New Match</h2>
              <form onSubmit={handleSaveMatch} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeTeam" className="text-foreground">
                      Home Team
                    </Label>
                    <Input
                      id="homeTeam"
                      required
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayTeam" className="text-foreground">
                      Away Team
                    </Label>
                    <Input
                      id="awayTeam"
                      required
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="homeOdds" className="text-foreground">
                      Home Odds
                    </Label>
                    <Input
                      id="homeOdds"
                      type="number"
                      step="0.01"
                      required
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                  <div>
                    <Label htmlFor="awayOdds" className="text-foreground">
                      Away Odds
                    </Label>
                    <Input
                      id="awayOdds"
                      type="number"
                      step="0.01"
                      required
                      className="mt-2 bg-secondary border-bet-border text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="matchTime" className="text-foreground">
                    Match Time
                  </Label>
                  <Input
                    id="matchTime"
                    required
                    placeholder="e.g., Today 18:00"
                    className="mt-2 bg-secondary border-bet-border text-foreground"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90 transition-all duration-300 font-bold"
                >
                  Add Match
                </Button>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
