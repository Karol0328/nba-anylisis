export enum GameStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED'
}

export type Language = 'en' | 'zh';

export type OddsSource = 'POLYMARKET' | 'SPORTSBOOK' | 'STATS';

export interface TeamStats {
  id: string;
  name: string;
  nameZh: string;
  wins: number;
  losses: number;
  ppg: number; 
  oppg: number;
  last10: string;
  logo: string;
}

export interface PolymarketData {
  homeWinProb: number; // 0.0 to 1.0
  awayWinProb: number;
  volumeUsd: number;
}

export interface Game {
  id: string;
  homeTeam: TeamStats;
  awayTeam: TeamStats;
  startTime: string; // ISO String
  status: GameStatus;
  
  // Scoring & Live Data
  homeScore?: number;
  awayScore?: number;
  currentQuarter?: number; // 1, 2, 3, 4
  clock?: string; // e.g., "10:45"
  
  marketData: PolymarketData;
  oddsSource: OddsSource; // Track where the data came from

  predictedWinnerId?: string | null; 
  predictionConfidence?: number;
  predictionReasoning?: string;
  isLocked: boolean;
  resultVerified?: boolean; 
  predictionCorrect?: boolean;
}

export interface AiPredictionResponse {
  winnerId: string;
  confidence: number;
  reasoning: string;
  keyMatchupFactor: string;
}