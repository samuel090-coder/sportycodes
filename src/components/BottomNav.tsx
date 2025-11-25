import { NavLink } from "@/components/NavLink";
import { Trophy, Target } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bet-card border-t border-bet-border shadow-card">
      <div className="flex items-center justify-around max-w-screen-xl mx-auto">
        <NavLink
          to="/"
          className="flex-1 flex flex-col items-center gap-1 py-4 text-muted-foreground transition-all duration-300 hover:text-primary"
          activeClassName="text-primary bg-bet-red/10"
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs font-semibold">BET</span>
        </NavLink>

        <NavLink
          to="/sure-odds"
          className="flex-1 flex flex-col items-center gap-1 py-4 text-muted-foreground transition-all duration-300 hover:text-primary"
          activeClassName="text-primary bg-bet-red/10"
        >
          <Target className="w-6 h-6" />
          <span className="text-xs font-semibold">SURE ODDS</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
