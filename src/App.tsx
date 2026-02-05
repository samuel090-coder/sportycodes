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
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import TapToEarn from "./pages/TapToEarn";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Shorts from "./pages/Shorts";
import Leaderboard from "./pages/Leaderboard";
import UserProfile from "./pages/UserProfile";
import BettingPools from "./pages/BettingPools";
import { AdminLayout } from "./pages/AdminLayout";
import { SecuritySection } from "./components/admin/SecuritySection";
import { AdsSection } from "./components/admin/AdsSection";
import { SureOddsSection } from "./components/admin/SureOddsSection";
import { PaymentsSection } from "./components/admin/PaymentsSection";
import { NotificationsSection } from "./components/admin/NotificationsSection";
import { SEOSection } from "./components/admin/SEOSection";
import { VerificationSection } from "./components/admin/VerificationSection";
import { SettingsSection } from "./components/admin/SettingsSection";
import { BettingPoolsSection } from "./components/admin/BettingPoolsSection";
import { AnalyticsSection } from "./components/admin/AnalyticsSection";
import { VIPSubscriptionsSection } from "./components/admin/VIPSubscriptionsSection";
import { HouseEarningsSection } from "./components/admin/HouseEarningsSection";
import { AnnouncementsSection } from "./components/admin/AnnouncementsSection";
import VIPSubscription from "./pages/VIPSubscription";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { AnnouncementPopup } from "./components/AnnouncementPopup";
import { AnnouncementToast } from "./components/AnnouncementToast";

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
          {/* Global Announcement Components */}
          <AnnouncementBanner />
          <AnnouncementPopup />
          <AnnouncementToast />
          <InstallGate>
            <Routes>
              <Route path="/" element={<SureOdds />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tap" element={<TapToEarn />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/betting" element={<BettingPools />} />
              <Route path="/vip" element={<VIPSubscription />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="analytics" element={<AnalyticsSection />} />
                <Route path="security" element={<SecuritySection />} />
                <Route path="ads" element={<AdsSection />} />
                <Route path="sure-odds" element={<SureOddsSection />} />
                <Route path="payments" element={<PaymentsSection />} />
                <Route path="seo" element={<SEOSection />} />
                <Route path="verification" element={<VerificationSection />} />
                <Route path="notifications" element={<NotificationsSection />} />
                <Route path="settings" element={<SettingsSection />} />
                <Route path="betting-pools" element={<BettingPoolsSection />} />
                <Route path="vip-subscriptions" element={<VIPSubscriptionsSection />} />
                <Route path="house-earnings" element={<HouseEarningsSection />} />
                <Route path="announcements" element={<AnnouncementsSection />} />
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
