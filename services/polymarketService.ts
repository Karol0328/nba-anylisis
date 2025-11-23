import { TeamStats } from '../types';

interface PolymarketEvent {
  title: string;
  slug: string;
  markets: {
    groupItemTitle: string;
    outcome: string; // "Yes" or "No", or Team Name
    price: number; // 0.0 to 1.0
    volume: number;
  }[];
  volume: number; // Total event volume
}

const POLYMARKET_API_URL = "https://gamma-api.polymarket.com/events?closed=false&limit=50&tag_slug=nba";

// Helper to normalize strings for comparison (remove accents, lowercase, etc)
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export const fetchPolymarketEvents = async (): Promise<PolymarketEvent[]> => {
  try {
    const response = await fetch(POLYMARKET_API_URL);
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.warn("Polymarket API fetch failed:", error);
    return [];
  }
};

/**
 * Attempts to find a matching Polymarket event for a specific NBA game.
 * Polymarket titles are usually formatted like "Lakers vs Warriors".
 */
export const findPolymarketMatch = (
  events: PolymarketEvent[], 
  homeTeam: TeamStats, 
  awayTeam: TeamStats
): { homeProb: number, awayProb: number, volume: number } | null => {
  
  // Simplified team names for matching (e.g., "Lakers", "Celtics")
  const homeSimple = normalize(homeTeam.name);
  const awaySimple = normalize(awayTeam.name);

  // Look for an event that contains both team names in the title
  const match = events.find(e => {
    const titleNorm = normalize(e.title);
    return titleNorm.includes(homeSimple) && titleNorm.includes(awaySimple);
  });

  if (!match || !match.markets) return null;

  // Polymarket logic is tricky. Usually specific markets for "Winner".
  // We look for markets where the outcome matches the team name.
  
  let homeProb = 0.5;
  let awayProb = 0.5;
  let found = false;

  // Strategy 1: Look for "Game Winner" or specific team outcome tokens
  // Often the markets array contains objects like { outcome: "Lakers", price: 0.65 }
  
  const homeMarket = match.markets.find(m => normalize(m.outcome || m.groupItemTitle || '').includes(homeSimple));
  const awayMarket = match.markets.find(m => normalize(m.outcome || m.groupItemTitle || '').includes(awaySimple));

  if (homeMarket && awayMarket) {
    homeProb = homeMarket.price;
    awayProb = awayMarket.price;
    found = true;
  } else if (homeMarket) {
    homeProb = homeMarket.price;
    awayProb = 1 - homeProb;
    found = true;
  } else if (awayMarket) {
    awayProb = awayMarket.price;
    homeProb = 1 - awayProb;
    found = true;
  }

  if (found) {
    // Normalize to ensure they sum to 1 (Polymarket prices usually sum to ~1.01 or 0.99 due to vig/spread)
    const total = homeProb + awayProb;
    return {
      homeProb: homeProb / total,
      awayProb: awayProb / total,
      volume: match.volume || 0
    };
  }

  return null;
};