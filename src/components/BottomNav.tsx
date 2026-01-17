import { NavLink } from "@/components/NavLink";
import { Target, Coins, Wallet, User, Trophy, Video } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl border-t border-primary/20 shadow-[0_-4px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around max-w-screen-xl mx-auto px-1">
        <NavLink
          to="/"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <Target className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[9px] font-bold tracking-wide">ODDS</span>
        </NavLink>

        <NavLink
          to="/shorts"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <Video className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[9px] font-bold tracking-wide">SHORTS</span>
        </NavLink>

        <NavLink
          to="/tap"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <div className="relative -mt-5 p-2.5 bg-gradient-to-br from-primary to-primary/60 rounded-full shadow-[0_0_20px_rgba(var(--primary),0.5)] border-4 border-background">
            <Coins className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-[9px] font-bold tracking-wide">EARN</span>
        </NavLink>

        <NavLink
          to="/leaderboard"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <Trophy className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[9px] font-bold tracking-wide">RANKS</span>
        </NavLink>

        <NavLink
          to="/wallet"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <Wallet className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[9px] font-bold tracking-wide">WALLET</span>
        </NavLink>

        <NavLink
          to="/profile"
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-muted-foreground transition-all duration-300 hover:text-primary group"
          activeClassName="text-primary"
        >
          <User className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span className="text-[9px] font-bold tracking-wide">ME</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
