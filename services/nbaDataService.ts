
import { Game, GameStatus, TeamStats } from '../types';
import { TEAMS } from '../constants';
import { fetchPolymarketEvents, findPolymarketMatch } from './polymarketService';

const ESPN_API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard';

const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const spreadToProbability = (spread: number): number => {
  if (spread === 0) return 0.5;
  const impact = Math.abs(spread) * 0.033;
  let prob = spread < 0 ? 0.5 + impact : 0.5 - impact;
  return Math.max(0.1, Math.min(0.99, prob));
};

/**
 * Calculates a "Momentum Score" (0.0 to 1.0) based on Recent Form.
 * This mirrors the logic in `scripts/nba_prediction_engine.py`:
 * df['rolling_win_rate'] = df.groupby('team_id')['is_win'].transform(lambda x: x.shift(1).rolling(window=5).mean())
 * 
 * Since we only have the "Last 10" string from the live API (e.g., "8-2"),
 * we use this as a proxy for the rolling window average.
 */
const calculateMomentum = (record: string): number => {
    if (!record || !record.includes('-')) return 0.5;
    try {
        const [wins, losses] = record.split('-').map(Number);
        const total = wins + losses;
        if (total === 0) return 0.5;
        // e.g., 8-2 record = 0.8 momentum
        return wins / total;
    } catch (e) {
        return 0.5;
    }
};

export const fetchNbaGames = async (date: Date): Promise<Game[]> => {
  const dateStr = formatDateForApi(date);
  
  try {
    // Fetch ESPN Data and Polymarket Data in parallel
    const [espnRes, polyEvents] = await Promise.all([
      fetch(`${ESPN_API_BASE}?dates=${dateStr}&limit=100`),
      fetchPolymarketEvents()
    ]);

    if (!espnRes.ok) throw new Error('ESPN API Error');
    
    const espnData = await espnRes.json();
    const events = espnData.events || [];

    return events.map((event: any) => {
      const competition = event.competitions[0];
      const competitors = competition.competitors;
      
      const homeComp = competitors.find((c: any) => c.homeAway === 'home');
      const awayComp = competitors.find((c: any) => c.homeAway === 'away');

      const homeId = homeComp.team.abbreviation;
      const awayId = awayComp.team.abbreviation;

      const staticHome = TEAMS[homeId as keyof typeof TEAMS];
      const homeStats: TeamStats = staticHome 
        ? { ...staticHome, recentForm: calculateMomentum(staticHome.last10) } 
        : {
          id: homeId,
          name: homeComp.team.name,
          nameZh: homeComp.team.name, 
          wins: parseInt(homeComp.records?.[0]?.summary?.split('-')[0] || '0'),
          losses: parseInt(homeComp.records?.[0]?.summary?.split('-')[1] || '0'),
          ppg: 110,
          oppg: 110,
          last10: "5-5",
          recentForm: 0.5,
          logo: homeComp.team.logo || ""
        };

      const staticAway = TEAMS[awayId as keyof typeof TEAMS];
      const awayStats: TeamStats = staticAway
        ? { ...staticAway, recentForm: calculateMomentum(staticAway.last10) }
        : {
          id: awayId,
          name: awayComp.team.name,
          nameZh: awayComp.team.name,
          wins: parseInt(awayComp.records?.[0]?.summary?.split('-')[0] || '0'),
          losses: parseInt(awayComp.records?.[0]?.summary?.split('-')[1] || '0'),
          ppg: 110,
          oppg: 110,
          last10: "5-5",
          recentForm: 0.5,
          logo: awayComp.team.logo || ""
        };

      // Always update Wins/Losses from live API if available
      if (homeComp.records?.[0]?.summary) {
        const parts = homeComp.records[0].summary.split('-');
        homeStats.wins = parseInt(parts[0]);
        homeStats.losses = parseInt(parts[1]);
      }
      if (awayComp.records?.[0]?.summary) {
         const parts = awayComp.records[0].summary.split('-');
         awayStats.wins = parseInt(parts[0]);
         awayStats.losses = parseInt(parts[1]);
      }
      
      // Calculate Recent Form using our helper
      // Note: ESPN API doesn't always give L10 in this endpoint, so we default to static TEAMS if missing
      homeStats.recentForm = calculateMomentum(homeStats.last10);
      awayStats.recentForm = calculateMomentum(awayStats.last10);

      let status = GameStatus.SCHEDULED;
      const state = event.status.type.state; 
      if (state === 'in') status = GameStatus.LIVE;
      if (state === 'post') status = GameStatus.FINISHED;

      // --- 1. Try Polymarket (Tier 1 Source) ---
      const polyMatch = findPolymarketMatch(polyEvents, homeStats, awayStats);
      
      let homeWinProb = 0.5;
      let volumeUsd = 0;
      let source: 'POLYMARKET' | 'SPORTSBOOK' | 'STATS' = 'STATS';

      if (polyMatch) {
        homeWinProb = polyMatch.homeProb;
        volumeUsd = polyMatch.volume;
        source = 'POLYMARKET';
      } else {
        // --- 2. Try Sportsbook Odds (Tier 2 Source) ---
        if (competition.odds && competition.odds.length > 0) {
          const oddsDetails = competition.odds[0].details; 
          if (oddsDetails) {
            const parts = oddsDetails.split(' ');
            if (parts.length >= 2) {
              const favoredAbbrev = parts[0];
              const spreadVal = parseFloat(parts[1]);

              if (!isNaN(spreadVal)) {
                if (favoredAbbrev === homeId) {
                  homeWinProb = spreadToProbability(spreadVal);
                } else if (favoredAbbrev === awayId) {
                  homeWinProb = 1 - spreadToProbability(spreadVal);
                }
                source = 'SPORTSBOOK';
                volumeUsd = 50000; // Mock volume for sportsbook to show generic activity
              }
            }
          }
        }

        // --- 3. Fallback to Stats (Tier 3 Source) ---
        if (source === 'STATS') {
           const totalGamesHome = homeStats.wins + homeStats.losses || 1;
           const homeWinRate = homeStats.wins / totalGamesHome;
           const totalGamesAway = awayStats.wins + awayStats.losses || 1;
           const awayWinRate = awayStats.wins / totalGamesAway;
           
           // Apply a basic weight for Recent Form (Momentum) here too for the visual bar
           const homePower = (homeWinRate * 0.7) + (homeStats.recentForm * 0.3);
           const awayPower = (awayWinRate * 0.7) + (awayStats.recentForm * 0.3);

           homeWinProb = 0.5 + (homePower - awayPower) * 0.5 + 0.05;
           homeWinProb = Math.max(0.25, Math.min(0.75, homeWinProb));
           volumeUsd = 0;
        }
      }

      return {
        id: event.id,
        homeTeam: homeStats,
        awayTeam: awayStats,
        startTime: event.date,
        status: status,
        homeScore: parseInt(homeComp.score),
        awayScore: parseInt(awayComp.score),
        currentQuarter: event.status.period,
        clock: event.status.displayClock,
        isLocked: status !== GameStatus.SCHEDULED,
        resultVerified: status === GameStatus.FINISHED,
        oddsSource: source,
        marketData: {
          homeWinProb: homeWinProb,
          awayWinProb: 1 - homeWinProb,
          volumeUsd: volumeUsd
        }
      } as Game;
    });

  } catch (error) {
    console.error("Failed to fetch NBA games:", error);
    return [];
  }
};
