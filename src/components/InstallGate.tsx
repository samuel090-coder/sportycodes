import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface InstallGateProps {
  children: React.ReactNode;
}

const InstallGate = ({ children }: InstallGateProps) => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if app is running in standalone mode (installed)
    const checkStandalone = () => {
      const isInStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      
      setIsStandalone(isInStandaloneMode);
      setIsChecking(false);

      // If not in standalone mode and not on install page, redirect to install
      if (!isInStandaloneMode && location.pathname !== '/install') {
        navigate('/install');
      }
    };

    checkStandalone();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (!e.matches && location.pathname !== '/install') {
        navigate('/install');
      }
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

  // Allow access to install page always
  if (location.pathname === '/install') {
    return <>{children}</>;
  }

  // Only show content if in standalone mode
  if (isStandalone) {
    return <>{children}</>;
  }

  // Block access if not installed
  return null;
};

export default InstallGate;
