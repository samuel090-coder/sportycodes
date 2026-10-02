import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface InstallGateProps {
  children: React.ReactNode;
}

const InstallGate = ({ children }: InstallGateProps) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't show install prompt on admin pages
    if (location.pathname.startsWith('/admin')) {
      setShowWarning(false);
      setIsStandalone(true);
      setIsChecking(false);
      return;
    }

    // Check if app is running in standalone mode (installed)
    const checkStandalone = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isInStandaloneMode);
      setIsChecking(false);

      // If not in standalone mode, wait 10 seconds then show warning
      if (!isInStandaloneMode && location.pathname !== '/install') {
        setTimeout(() => {
          setShowWarning(true);
        }, 10 * 1000); // 10 seconds
      }
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setShowWarning(!e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [navigate, location.pathname]);

  // Show nothing while checking
  if (isChecking) {
    return null;
  }

  // Always render children, just show warning overlay after 10 minutes
  return (
    <>
      {children}
      {/* Banner disabled by owner request — the centred install modal remains. */}
      {false && showWarning && !isStandalone && location.pathname !== '/install' && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="max-w-md mx-auto bg-card border-2 border-primary/30 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Install for Better Experience
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Get faster loading, offline access, and push notifications
                </p>
                <button
                  onClick={() => navigate('/install')}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  Install Now
                </button>
              </div>
              <button
                onClick={() => setShowWarning(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallGate;
