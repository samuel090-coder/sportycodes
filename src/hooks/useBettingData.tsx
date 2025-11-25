import { useState, useEffect } from "react";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  homeOdds: number;
  awayOdds: number;
  matchTime: string;
  status: "not-started" | "live" | "completed";
  betCode: string;
}

export interface SureOdd {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  prediction: string;
  odds: number;
  confidence: string;
  betCode: string;
}

const MATCHES_KEY = "sporty_codes_matches";
const SURE_ODDS_KEY = "sporty_codes_sure_odds";

const defaultMatches: Match[] = [
  {
    id: "1",
    homeTeam: "Man United",
    awayTeam: "Liverpool",
    homeOdds: 2.5,
    awayOdds: 1.8,
    matchTime: "Today 18:00",
    status: "not-started",
    betCode: "MU2L8-45X9K",
  },
  {
    id: "2",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    homeOdds: 2.1,
    awayOdds: 2.3,
    matchTime: "Today 20:45",
    status: "live",
    betCode: "BR1RM3-78Q2M",
  },
];

const defaultSureOdds: SureOdd[] = [
  {
    id: "1",
    homeTeam: "PSG",
    awayTeam: "Monaco",
    prediction: "Over 2.5 Goals",
    odds: 1.75,
    confidence: "95%",
    betCode: "PSG5M2-GH8PL",
  },
  {
    id: "2",
    homeTeam: "Inter",
    awayTeam: "AC Milan",
    prediction: "Both Teams to Score",
    odds: 1.90,
    confidence: "92%",
    betCode: "INT0AC-KL3VN",
  },
  {
    id: "3",
    homeTeam: "Atletico",
    awayTeam: "Sevilla",
    prediction: "Under 3.5 Goals",
    odds: 1.65,
    confidence: "88%",
    betCode: "ATL4SE-PQ7WM",
  },
];

export const useBettingData = () => {
  const [matches, setMatches] = useState<Match[]>(() => {
    const stored = localStorage.getItem(MATCHES_KEY);
    return stored ? JSON.parse(stored) : defaultMatches;
  });

  const [sureOdds, setSureOdds] = useState<SureOdd[]>(() => {
    const stored = localStorage.getItem(SURE_ODDS_KEY);
    return stored ? JSON.parse(stored) : defaultSureOdds;
  });

  useEffect(() => {
    localStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    localStorage.setItem(SURE_ODDS_KEY, JSON.stringify(sureOdds));
  }, [sureOdds]);

  const addMatch = (match: Omit<Match, "id">) => {
    const newMatch = { ...match, id: Date.now().toString() };
    setMatches((prev) => [...prev, newMatch]);
  };

  const updateMatch = (id: string, match: Partial<Match>) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...match } : m))
    );
  };

  const deleteMatch = (id: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const addSureOdd = (sureOdd: Omit<SureOdd, "id">) => {
    const newSureOdd = { ...sureOdd, id: Date.now().toString() };
    setSureOdds((prev) => [...prev, newSureOdd]);
  };

  const updateSureOdd = (id: string, sureOdd: Partial<SureOdd>) => {
    setSureOdds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...sureOdd } : s))
    );
  };

  const deleteSureOdd = (id: string) => {
    setSureOdds((prev) => prev.filter((s) => s.id !== id));
  };

  return {
    matches,
    sureOdds,
    addMatch,
    updateMatch,
    deleteMatch,
    addSureOdd,
    updateSureOdd,
    deleteSureOdd,
  };
};
