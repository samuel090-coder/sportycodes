import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Terminal, Loader2, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "samuelsunday09066423764@gmail.com";

export const AdminLayout = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setIsAuthenticated(false);
        setUserEmail(null);
      } else if (session?.user) {
        const email = session.user.email;
        setUserEmail(email || null);
        if (email === ADMIN_EMAIL) {
          setIsAuthenticated(true);
          sessionStorage.setItem("isAdminAuthenticated", "true");
        } else {
          setIsAuthenticated(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    setIsAuthenticating(true);
    try {
      // Check session storage first
      const cachedAuth = sessionStorage.getItem("isAdminAuthenticated") === "true";
      
      // Verify with actual session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const email = session.user.email;
        setUserEmail(email || null);
        
        if (email === ADMIN_EMAIL) {
          setIsAuthenticated(true);
          sessionStorage.setItem("isAdminAuthenticated", "true");
        } else {
          setIsAuthenticated(false);
          sessionStorage.removeItem("isAdminAuthenticated");
        }
      } else {
        setIsAuthenticated(false);
        sessionStorage.removeItem("isAdminAuthenticated");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate("/auth");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("isAdminAuthenticated");
    setIsAuthenticated(false);
    navigate("/");
    toast.success("Logged out successfully");
  };

  if (isAuthenticating || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-bet-dark flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-cyber-neon-green" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyber-dark via-bet-dark to-cyber-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gradient-cyber border-2 border-red-500/50 shadow-neon-red p-8 relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse delay-75" />
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse delay-150" />
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-4 border-2 border-red-500">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-black text-red-500 font-mono mb-2">ACCESS DENIED</h1>
            <p className="text-sm text-cyber-neon-cyan/60 font-mono">Admin Access Required</p>
          </div>

          <div className="space-y-4">
            {userEmail ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-sm text-red-400">
                    Your account <strong className="text-foreground">{userEmail}</strong> does not have admin privileges.
                  </p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full border-cyber-neon-cyan text-cyber-neon-cyan hover:bg-cyber-neon-cyan/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Switch Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground text-sm">
                  Please login with an authorized admin account to access this panel.
                </p>
                <Button
                  onClick={handleLoginRedirect}
                  className="w-full bg-cyber-neon-green text-cyber-dark hover:bg-cyber-neon-cyan font-black text-lg py-6 font-mono transition-all"
                >
                  <Terminal className="w-5 h-5 mr-2" />
                  LOGIN TO ACCESS
                </Button>
              </div>
            )}
          </div>

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
          <header className="h-14 md:h-16 border-b border-cyber-neon-green/30 flex items-center justify-between px-3 md:px-6 bg-cyber-dark/50">
            <div className="flex items-center">
              <SidebarTrigger className="text-cyber-neon-green hover:text-cyber-neon-cyan" />
              <h1 className="ml-2 md:ml-4 text-sm md:text-xl font-black text-cyber-neon-green font-mono truncate">ADMIN PANEL</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-cyber-neon-cyan/60 hidden sm:block">{userEmail}</span>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
