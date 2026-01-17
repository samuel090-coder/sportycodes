import { Shield, DollarSign, FileText, Users, Settings, Bell, Lock, Search, BadgeCheck, Wallet } from "lucide-react";
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
    category: "Security",
    icon: Shield,
    items: [
      { title: "Authentication", path: "/admin/security", icon: Lock },
    ],
  },
  {
    category: "Monetization",
    icon: DollarSign,
    items: [
      { title: "Ad Management", path: "/admin/ads", icon: DollarSign },
      { title: "Deposits & Withdrawals", path: "/admin/payments", icon: Wallet },
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
    category: "System",
    icon: Settings,
    items: [
      { title: "SEO Manager", path: "/admin/seo", icon: Search },
      { title: "Site Verification", path: "/admin/verification", icon: BadgeCheck },
      { title: "Notifications", path: "/admin/notifications", icon: Bell },
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
        {/* Header */}
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
