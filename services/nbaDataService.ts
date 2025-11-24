
import { Game, GameStatus, TeamStats, OddsSource } from '../types';
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
 * Mirrors the Python engine rolling window logic.
 */
const calculateMomentum = (record: string): number => {
    if (!record || !record.includes('-')) return 0.5;
    try {
        const [wins, losses] = record.split('-').map(Number);
        const total = wins + losses;
        if (total === 0) return 0.5;
        return wins / total;
    } catch (e) {
        return 0.5;
    }
};

/**
 * Calculates win probability based PURELY on stats (Season Record + Recent Form).
 * Used as a safe fallback when no pre-game market data was cached.
 */
const calculateStatsWinProbability = (homeStats: TeamStats, awayStats: TeamStats): number => {
   const totalGamesHome = homeStats.wins + homeStats.losses || 1;
   const homeWinRate = homeStats.wins / totalGamesHome;
   const totalGamesAway = awayStats.wins + awayStats.losses || 1;
   const awayWinRate = awayStats.wins / totalGamesAway;
   
   // Weighted model: 70% Season Record, 30% Recent Form (Momentum)
   // This provides a stable prediction baseline that doesn't jump during live games.
   const homePower = (homeWinRate * 0.7) + (homeStats.recentForm * 0.3);
   const awayPower = (awayWinRate * 0.7) + (awayStats.recentForm * 0.3);

   // Base 50% + Difference + 5% Home Court Advantage
   let prob = 0.5 + (homePower - awayPower) * 0.5 + 0.05;
   
   // Clamp between 25% and 75% to avoid extreme confidence based purely on stats
   return Math.max(0.25, Math.min(0.75, prob));
};

export const fetchNbaGames = async (date: Date): Promise<Game[]> => {
  const dateStr = formatDateForApi(date);
  
  try {
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

      // Always update Wins/Losses from live API if available for accuracy
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
      
      homeStats.recentForm = calculateMomentum(homeStats.last10);
      awayStats.recentForm = calculateMomentum(awayStats.last10);

      let status = GameStatus.SCHEDULED;
      const state = event.status.type.state; 
      if (state === 'in') status = GameStatus.LIVE;
      if (state === 'post') status = GameStatus.FINISHED;

      const cacheKey = `HOOPS_ODDS_${event.id}`;
      
      let homeWinProb = 0.5;
      let volumeUsd = 0;
      let source: OddsSource = 'STATS';
      let isClosingOdds = false;

      // =================================================================================
      // CORE LOGIC: PREDICTION LOCKING & CACHING
      // =================================================================================
      
      if (status === GameStatus.LIVE || status === GameStatus.FINISHED) {
          // CASE 1: Game is In-Progress or Done.
          // We MUST NOT use live data from API for prediction as it contains spoilers (live odds).
          // We Attempt to load frozen "Closing Odds" from LocalStorage.
          
          const cached = localStorage.getItem(cacheKey);
          let loadedFromCache = false;

          if (cached) {
              try {
                  const snapshot = JSON.parse(cached);
                  // Sanity check to ensure valid probability
                  if (snapshot.homeProb > 0 && snapshot.homeProb < 1) {
                      homeWinProb = snapshot.homeProb;
                      volumeUsd = snapshot.volume;
                      source = snapshot.source;
                      isClosingOdds = true;
                      loadedFromCache = true;
                  }
              } catch (e) {
                  // Corrupt cache, proceed to fallback
              }
          }

          if (!loadedFromCache) {
              // CASE 2: Cache Miss (User visited site AFTER game started).
              // FALLBACK: Use the Stats Model. It's stable and fair.
              homeWinProb = calculateStatsWinProbability(homeStats, awayStats);
              source = 'STATS';
              volumeUsd = 0;
              isClosingOdds = false; 
          }

      } else {
          // CASE 3: Game is SCHEDULED (Pre-game).
          // Calculate fresh odds from Market (Polymarket/Sportsbook) or Stats.
          
          // 1. Try Polymarket (Tier 1)
          const polyMatch = findPolymarketMatch(polyEvents, homeStats, awayStats);
          if (polyMatch) {
              homeWinProb = polyMatch.homeProb;
              volumeUsd = polyMatch.volume;
              source = 'POLYMARKET';
          } else {
              // 2. Try Sportsbook (Tier 2)
              let foundSportsbook = false;
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
                              volumeUsd = 50000; // Mock volume for sportsbook visibility
                              foundSportsbook = true;
                          }
                      }
                  }
              }

              // 3. Fallback to Stats (Tier 3)
              if (!foundSportsbook) {
                  homeWinProb = calculateStatsWinProbability(homeStats, awayStats);
                  source = 'STATS';
              }
          }

          // SAVE TO CACHE (Update "Closing Odds" candidate)
          try {
             if (homeWinProb > 0.01 && homeWinProb < 0.99) {
                 const snapshot = {
                     homeProb: homeWinProb,
                     source: source,
                     volume: volumeUsd,
                     timestamp: Date.now()
                 };
                 localStorage.setItem(cacheKey, JSON.stringify(snapshot));
             }
          } catch (e) {
            // Storage quota full or disabled
          }
      }

      const awayWinProb = 1 - homeWinProb;
      
      // =================================================================================
      // NEW: AUTO-DETERMINE SYSTEM PICK & VERIFY RESULT
      // =================================================================================
      
      // The "System" automatically picks the side with probability >= 50%
      const systemPredictedWinnerId = homeWinProb >= 0.5 ? homeId : awayId;
      
      let predictedWinnerId = null;
      let predictionCorrect = undefined;

      // If the game is Live or Finished, we lock in the system pick so the UI shows it
      if (status !== GameStatus.SCHEDULED) {
          predictedWinnerId = systemPredictedWinnerId;
      }

      // If the game is Finished, we verify if the pick was correct
      if (status === GameStatus.FINISHED) {
          const homeScore = parseInt(homeComp.score);
          const awayScore = parseInt(awayComp.score);
          const actualWinnerId = homeScore > awayScore ? homeId : awayId;
          
          predictionCorrect = (systemPredictedWinnerId === actualWinnerId);
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
        
        // Auto-filled Prediction Data
        predictedWinnerId: predictedWinnerId,
        resultVerified: status === GameStatus.FINISHED,
        predictionCorrect: predictionCorrect,
        
        oddsSource: source,
        isClosingOdds: isClosingOdds,
        marketData: {
          homeWinProb,
          awayWinProb,
          volumeUsd
        }
      } as Game;
    });

  } catch (error) {
    console.error("Failed to fetch NBA games:", error);
    return [];
  }
};
