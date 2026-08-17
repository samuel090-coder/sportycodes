import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingScreen from "./components/LoadingScreen";
import InstallGate from "./components/InstallGate";
import { MaintenanceGate } from "./components/MaintenanceGate";
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
import { EmailTestSection } from "./components/admin/EmailTestSection";
import { SEOSection } from "./components/admin/SEOSection";
import { VerificationSection } from "./components/admin/VerificationSection";
import { SettingsSection } from "./components/admin/SettingsSection";
import { BettingPoolsSection } from "./components/admin/BettingPoolsSection";
import { AnalyticsSection } from "./components/admin/AnalyticsSection";
import { VIPSubscriptionsSection } from "./components/admin/VIPSubscriptionsSection";
import { HouseEarningsSection } from "./components/admin/HouseEarningsSection";
import { AnnouncementsSection } from "./components/admin/AnnouncementsSection";
import { LimitsWalletSection } from "./components/admin/LimitsWalletSection";
import { GamificationSection } from "./components/admin/GamificationSection";
import { JackpotPoolsSection } from "./components/admin/JackpotPoolsSection";
import { UIThemeSection } from "./components/admin/UIThemeSection";
import { UserManagementSection } from "./components/admin/UserManagementSection";
import { BonusWheelSection } from "./components/admin/BonusWheelSection";
import { LeaderboardPrizesSection } from "./components/admin/LeaderboardPrizesSection";
import { AdminAdvertsSection } from "./components/admin/AdminAdvertsSection";
import VIPSubscription from "./pages/VIPSubscription";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import Rooms from "./pages/Rooms";
import RoomDetail from "./pages/RoomDetail";
import Invite from "./pages/Invite";
import RoomInvite from "./pages/RoomInvite";
import Scores from "./pages/Scores";
import WinningReviews from "./pages/WinningReviews";
import { WinReviewsSection } from "./components/admin/WinReviewsSection";
import { AnnouncementBanner } from "./components/AnnouncementBanner";
import { AnnouncementPopup } from "./components/AnnouncementPopup";
import { AnnouncementToast } from "./components/AnnouncementToast";
import SupportChatWidget from "./components/SupportChatWidget";
import ApkDownloadBanner from "./components/ApkDownloadBanner";
import ResetPassword from "./pages/ResetPassword";
import { SupportInboxSection } from "./components/admin/SupportInboxSection";
import { UsageSection } from "./components/admin/UsageSection";
import PresenceTracker from "./components/PresenceTracker";
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
          <MaintenanceGate>
            {/* Global Announcement Components */}
            <AnnouncementBanner />
            <AnnouncementPopup />
            <AnnouncementToast />
            <PresenceTracker />
            <SupportChatWidget />
            <ApkDownloadBanner />
            <InstallGate>
              <Routes>
                <Route path="/" element={<SureOdds />} />
                <Route path="/reset-password" element={<ResetPassword />} />
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
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/rooms/:roomId" element={<RoomDetail />} />
                <Route path="/ref/:code" element={<Invite />} />
                <Route path="/r/:inviteCode" element={<RoomInvite />} />
                <Route path="/scores" element={<Scores />} />
                <Route path="/wins" element={<WinningReviews />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route path="analytics" element={<AnalyticsSection />} />
                  <Route path="usage" element={<UsageSection />} />
                  <Route path="security" element={<SecuritySection />} />
                  <Route path="win-reviews" element={<WinReviewsSection />} />
                  <Route path="users" element={<UserManagementSection />} />
                  <Route path="ads" element={<AdsSection />} />
                  <Route path="sure-odds" element={<SureOddsSection />} />
                  <Route path="payments" element={<PaymentsSection />} />
                  <Route path="seo" element={<SEOSection />} />
                  <Route path="verification" element={<VerificationSection />} />
                  <Route path="notifications" element={<NotificationsSection />} />
                  <Route path="email-test" element={<EmailTestSection />} />
                  <Route path="settings" element={<SettingsSection />} />
                  <Route path="betting-pools" element={<BettingPoolsSection />} />
                  <Route path="jackpot-pools" element={<JackpotPoolsSection />} />
                  <Route path="vip-subscriptions" element={<VIPSubscriptionsSection />} />
                  <Route path="house-earnings" element={<HouseEarningsSection />} />
                  <Route path="announcements" element={<AnnouncementsSection />} />
                  <Route path="gamification" element={<GamificationSection />} />
                  <Route path="limits-wallet" element={<LimitsWalletSection />} />
                  <Route path="ui-theme" element={<UIThemeSection />} />
                  <Route path="bonus-wheel" element={<BonusWheelSection />} />
                  <Route path="leaderboard-prizes" element={<LeaderboardPrizesSection />} />
                  <Route path="adverts" element={<AdminAdvertsSection />} />
                  <Route path="support" element={<SupportInboxSection />} />
                </Route>
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </InstallGate>
          </MaintenanceGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
