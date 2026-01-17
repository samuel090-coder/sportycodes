import { NavLink } from "@/components/NavLink";
import { Target, Coins, Wallet, User, LayoutDashboard } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-primary/20 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around max-w-screen-xl mx-auto px-2">
        <NavLink
          to="/"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative">
            <Target className="w-6 h-6 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">ODDS</span>
        </NavLink>

        <NavLink
          to="/tap"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative">
            <Coins className="w-6 h-6 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">EARN</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative -mt-4 p-3 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] border-4 border-background">
            <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">HOME</span>
        </NavLink>

        <NavLink
          to="/wallet"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative">
            <Wallet className="w-6 h-6 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">WALLET</span>
        </NavLink>

        <NavLink
          to="/profile"
          className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative">
            <User className="w-6 h-6 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">PROFILE</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
