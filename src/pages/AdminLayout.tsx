import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Terminal, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminPin, setAdminPin] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const authenticated = sessionStorage.getItem("isAdminAuthenticated") === "true";
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      navigate("/admin/security");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-admin-pin", {
        body: { pin: adminPin },
      });

      if (error) throw error;

      if (data.isValid) {
        sessionStorage.setItem("isAdminAuthenticated", "true");
        setIsAuthenticated(true);
        toast.success("Access granted! Welcome, admin.");
        navigate("/admin/security");
      } else {
        toast.error("Invalid PIN. Access denied.");
      }
    } catch (error: any) {
      console.error("Authentication error:", error);
      toast.error(error.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
      setAdminPin("");
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyber-neon-green" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-dark via-bet-dark to-cyber-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gradient-cyber border-2 border-cyber-neon-green/50 shadow-neon-green p-8 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-cyber-neon-green animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-cyan animate-pulse delay-75" />
            <div className="w-2 h-2 rounded-full bg-cyber-neon-purple animate-pulse delay-150" />
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-cyber-neon-green/10 rounded-full mb-4 border-2 border-cyber-neon-green">
              <Terminal className="w-10 h-10 text-cyber-neon-green animate-neon-pulse" />
            </div>
            <h1 className="text-3xl font-black text-cyber-neon-green font-mono mb-2">ADMIN ACCESS</h1>
            <p className="text-sm text-cyber-neon-cyan/60 font-mono">SPORTY CODES Control Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <Label htmlFor="pin" className="text-cyber-neon-cyan font-mono text-sm uppercase">
                ENTER ADMIN PIN
              </Label>
              <Input
                id="pin"
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="••••••"
                required
                disabled={isAuthenticating}
                className="mt-2 bg-cyber-dark/50 border-cyber-neon-green/50 text-cyber-neon-green font-mono text-center text-2xl tracking-widest focus:border-cyber-neon-green focus:shadow-neon-green transition-all"
              />
            </div>

            <Button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black text-lg py-6 font-mono transition-all"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                <>
                  <Terminal className="w-5 h-5 mr-2" />
                  ACCESS SYSTEM
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-cyber-neon-cyan/50 font-mono">
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-bet-dark">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header with Trigger */}
          <header className="h-16 border-b border-cyber-neon-green/30 flex items-center px-6 bg-cyber-dark/50">
            <SidebarTrigger className="text-cyber-neon-green hover:text-cyber-neon-cyan" />
            <h1 className="ml-4 text-xl font-black text-cyber-neon-green font-mono">ADMIN CONTROL PANEL</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
