import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";
import InstallGate from "./components/InstallGate";
import SureOdds from "./pages/SureOdds";
import Payment from "./pages/Payment";
import { AdminLayout } from "./pages/AdminLayout";
import { SecuritySection } from "./components/admin/SecuritySection";
import { AdsSection } from "./components/admin/AdsSection";
import { SureOddsSection } from "./components/admin/SureOddsSection";
import { PaymentsSection } from "./components/admin/PaymentsSection";
import { NotificationsSection } from "./components/admin/NotificationsSection";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

const queryClient = new QueryClient();

const App = () => {
  const [showLoading, setShowLoading] = useState(true);
  const [hasShownLoading, setHasShownLoading] = useState(false);

  useEffect(() => {
    const hasLoaded = sessionStorage.getItem("hasLoadedBefore");
    if (hasLoaded) {
      setShowLoading(false);
    }
  }, []);

  const handleLoadingComplete = () => {
    sessionStorage.setItem("hasLoadedBefore", "true");
    setShowLoading(false);
    setHasShownLoading(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showLoading && !hasShownLoading && <LoadingScreen onComplete={handleLoadingComplete} />}
        <BrowserRouter>
          <InstallGate>
            <Routes>
              <Route path="/" element={<SureOdds />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="security" element={<SecuritySection />} />
                <Route path="ads" element={<AdsSection />} />
                <Route path="sure-odds" element={<SureOddsSection />} />
                <Route path="payments" element={<PaymentsSection />} />
                <Route path="notifications" element={<NotificationsSection />} />
                <Route path="settings" element={<SecuritySection />} />
              </Route>
              <Route path="/install" element={<Install />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </InstallGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
