import { Shield, DollarSign, FileText, Users, Settings, Bell, Lock, Search, BadgeCheck, Wallet, Trophy, Activity, Crown, Percent, Megaphone, Gamepad2, Palette, Disc, Award } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    category: "Overview",
    icon: Activity,
    items: [
      { title: "Analytics", path: "/admin/analytics", icon: Activity },
    ],
  },
  {
    category: "Security",
    icon: Shield,
    items: [
      { title: "Authentication", path: "/admin/security", icon: Lock },
      { title: "User Management", path: "/admin/users", icon: Users },
    ],
  },
  {
    category: "Monetization",
    icon: DollarSign,
    items: [
      { title: "Ad Management", path: "/admin/ads", icon: DollarSign },
      { title: "Deposits & Withdrawals", path: "/admin/payments", icon: Wallet },
      { title: "Betting Pools", path: "/admin/betting-pools", icon: Trophy },
      { title: "Jackpot Pools", path: "/admin/jackpot-pools", icon: Crown },
      { title: "VIP Subscriptions", path: "/admin/vip-subscriptions", icon: Crown },
      { title: "House Earnings", path: "/admin/house-earnings", icon: Percent },
    ],
  },
  {
    category: "Content",
    icon: FileText,
    items: [
      { title: "Sure Odds", path: "/admin/sure-odds", icon: FileText },
    ],
  },
  {
    category: "Engagement",
    icon: Megaphone,
    items: [
      { title: "Announcements", path: "/admin/announcements", icon: Megaphone },
      { title: "Push Notifications", path: "/admin/notifications", icon: Bell },
      { title: "Gamification", path: "/admin/gamification", icon: Gamepad2 },
    ],
  },
  {
    category: "System",
    icon: Settings,
    items: [
      { title: "Limits & Wallet", path: "/admin/limits-wallet", icon: Shield },
      { title: "UI & Theme", path: "/admin/ui-theme", icon: Palette },
      { title: "SEO Manager", path: "/admin/seo", icon: Search },
      { title: "Site Verification", path: "/admin/verification", icon: BadgeCheck },
      { title: "Bank & Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${isCollapsed ? "w-16" : "w-64"} bg-cyber-dark border-r-2 border-cyber-neon-green/30`}
      collapsible="icon"
    >
      <SidebarContent>
        <div className={`p-4 border-b border-cyber-neon-green/30 ${isCollapsed ? "px-2" : ""}`}>
          <h2 className={`font-black text-cyber-neon-green font-mono ${isCollapsed ? "text-sm text-center" : "text-xl"}`}>
            {isCollapsed ? "SC" : "SPORTY CODES"}
          </h2>
          {!isCollapsed && (
            <p className="text-xs text-cyber-neon-cyan/60 font-mono mt-1">Admin Control Panel</p>
          )}
        </div>

        {menuItems.map((section) => (
          <SidebarGroup key={section.category}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-cyber-neon-purple font-mono text-xs uppercase tracking-wider">
                {section.category}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.path}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-cyber-neon-green/10 transition-all font-mono text-sm"
                        activeClassName="bg-cyber-neon-green/20 text-cyber-neon-green border-l-4 border-cyber-neon-green"
                      >
                        <item.icon className={`${isCollapsed ? "w-5 h-5" : "w-4 h-4"} text-cyber-neon-cyan`} />
                        {!isCollapsed && <span className="text-foreground">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
