import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  price: number;
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
  status: "not-started" | "scored" | "lost";
  price: number;
  matchCount: number; // 1 = single match, >1 = multiple matches
}

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
    price: 1000,
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
    price: 1000,
  },
];

const defaultSureOdds: SureOdd[] = [
  {
    id: "1",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    prediction: "Over 2.5 Goals",
    odds: 1.85,
    confidence: "92%",
    betCode: "SPC456",
    status: "not-started",
    price: 500,
    matchCount: 1,
  },
  {
    id: "2",
    homeTeam: "Liverpool",
    awayTeam: "Man United",
    prediction: "Both Teams to Score",
    odds: 1.75,
    confidence: "88%",
    betCode: "SPC789",
    status: "scored",
    price: 500,
    matchCount: 1,
  },
  {
    id: "3",
    homeTeam: "Barcelona",
    awayTeam: "Real Madrid",
    prediction: "Home Win",
    odds: 2.10,
    confidence: "85%",
    betCode: "SPC101",
    status: "lost",
    price: 500,
    matchCount: 1,
  },
];

export const useBettingData = () => {
  const [matches, setMatches] = useState<Match[]>(defaultMatches);
  const [sureOdds, setSureOdds] = useState<SureOdd[]>(defaultSureOdds);

  // Load data on mount
  useEffect(() => {
    loadMatches();
    loadSureOdds();
  }, []);

  const loadMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData: Match[] = data.map(item => ({
          id: item.id,
          homeTeam: item.home_team,
          awayTeam: item.away_team,
          homeTeamLogo: item.home_team_logo || undefined,
          awayTeamLogo: item.away_team_logo || undefined,
          homeOdds: item.home_odds,
          awayOdds: item.away_odds,
          matchTime: item.match_time,
          status: item.status as "not-started" | "live" | "completed",
          betCode: item.bet_code,
          price: item.price || 0,
        }));
        setMatches(formattedData);
        localStorage.setItem('matches', JSON.stringify(formattedData));
      }
    } catch (error) {
      console.error('Error loading matches:', error);
      // Use default data from localStorage if DB fails
      const stored = localStorage.getItem('matches');
      if (stored) setMatches(JSON.parse(stored));
    }
  };

  const loadSureOdds = async () => {
    try {
      const { data, error } = await supabase
        .from('sure_odds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData: SureOdd[] = data.map(item => ({
          id: item.id,
          homeTeam: item.home_team,
          awayTeam: item.away_team,
          homeTeamLogo: item.home_team_logo || undefined,
          awayTeamLogo: item.away_team_logo || undefined,
          prediction: item.prediction,
          odds: item.odds,
          confidence: item.confidence,
          betCode: item.bet_code,
          status: item.status as "not-started" | "scored" | "lost",
          price: item.price || 0,
          matchCount: item.match_count || 1,
        }));
        setSureOdds(formattedData);
        localStorage.setItem('sure_odds', JSON.stringify(formattedData));
      }
    } catch (error) {
      console.error('Error loading sure odds:', error);
      // Use default data from localStorage if DB fails
      const stored = localStorage.getItem('sure_odds');
      if (stored) setSureOdds(JSON.parse(stored));
    }
  };

  const addMatch = async (match: Omit<Match, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          home_team_logo: match.homeTeamLogo,
          away_team_logo: match.awayTeamLogo,
          home_odds: match.homeOdds,
          away_odds: match.awayOdds,
          match_time: match.matchTime,
          status: match.status,
          bet_code: match.betCode,
          price: match.price || 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newMatch: Match = {
        id: data.id,
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        homeTeamLogo: data.home_team_logo,
        awayTeamLogo: data.away_team_logo,
        homeOdds: data.home_odds,
        awayOdds: data.away_odds,
        matchTime: data.match_time,
        status: data.status as "not-started" | "live" | "completed",
        betCode: data.bet_code,
        price: data.price || 0,
      };

      const updated = [...matches, newMatch];
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding match:', error);
      // Fallback to localStorage if DB fails
      const newMatch: Match = { ...match, id: Date.now().toString(), price: match.price || 0 };
      const updated = [...matches, newMatch];
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    }
  };

  const updateMatch = async (id: string, updates: Partial<Match>) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_team: updates.homeTeam,
          away_team: updates.awayTeam,
          home_team_logo: updates.homeTeamLogo,
          away_team_logo: updates.awayTeamLogo,
          home_odds: updates.homeOdds,
          away_odds: updates.awayOdds,
          match_time: updates.matchTime,
          status: updates.status,
          bet_code: updates.betCode,
          price: updates.price,
        })
        .eq('id', id);

      if (error) throw error;

      const updated = matches.map((match) =>
        match.id === id ? { ...match, ...updates } : match
      );
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating match:', error);
      // Fallback to localStorage if DB fails
      const updated = matches.map((match) =>
        match.id === id ? { ...match, ...updates } : match
      );
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    }
  };

  const deleteMatch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = matches.filter((match) => match.id !== id);
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting match:', error);
      // Fallback to localStorage if DB fails
      const updated = matches.filter((match) => match.id !== id);
      setMatches(updated);
      localStorage.setItem('matches', JSON.stringify(updated));
    }
  };

  const addSureOdd = async (sureOdd: Omit<SureOdd, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('sure_odds')
        .insert({
          home_team: sureOdd.homeTeam,
          away_team: sureOdd.awayTeam,
          home_team_logo: sureOdd.homeTeamLogo,
          away_team_logo: sureOdd.awayTeamLogo,
          prediction: sureOdd.prediction,
          odds: sureOdd.odds,
          confidence: sureOdd.confidence,
          bet_code: sureOdd.betCode,
          status: sureOdd.status,
          price: sureOdd.price || 0,
          match_count: sureOdd.matchCount || 1,
        })
        .select()
        .single();

      if (error) throw error;

      const newSureOdd: SureOdd = {
        id: data.id,
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        homeTeamLogo: data.home_team_logo,
        awayTeamLogo: data.away_team_logo,
        prediction: data.prediction,
        odds: data.odds,
        confidence: data.confidence,
        betCode: data.bet_code,
        status: data.status as "not-started" | "scored" | "lost",
        price: data.price || 0,
        matchCount: data.match_count || 1,
      };

      const updated = [...sureOdds, newSureOdd];
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding sure odd:', error);
      // Fallback to localStorage if DB fails
      const newSureOdd: SureOdd = { 
        ...sureOdd, 
        id: Date.now().toString(),
        price: sureOdd.price || 0,
        matchCount: sureOdd.matchCount || 1,
      };
      const updated = [...sureOdds, newSureOdd];
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    }
  };

  const updateSureOdd = async (id: string, updates: Partial<SureOdd>) => {
    try {
      const { error } = await supabase
        .from('sure_odds')
        .update({
          home_team: updates.homeTeam,
          away_team: updates.awayTeam,
          home_team_logo: updates.homeTeamLogo,
          away_team_logo: updates.awayTeamLogo,
          prediction: updates.prediction,
          odds: updates.odds,
          confidence: updates.confidence,
          bet_code: updates.betCode,
          status: updates.status,
          price: updates.price,
          match_count: updates.matchCount,
        })
        .eq('id', id);

      if (error) throw error;

      const updated = sureOdds.map((sureOdd) =>
        sureOdd.id === id ? { ...sureOdd, ...updates } : sureOdd
      );
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating sure odd:', error);
      // Fallback to localStorage if DB fails
      const updated = sureOdds.map((sureOdd) =>
        sureOdd.id === id ? { ...sureOdd, ...updates } : sureOdd
      );
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    }
  };

  const deleteSureOdd = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sure_odds')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updated = sureOdds.filter((sureOdd) => sureOdd.id !== id);
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    } catch (error) {
      console.error('Error deleting sure odd:', error);
      // Fallback to localStorage if DB fails
      const updated = sureOdds.filter((sureOdd) => sureOdd.id !== id);
      setSureOdds(updated);
      localStorage.setItem('sure_odds', JSON.stringify(updated));
    }
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
