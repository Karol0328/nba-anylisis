import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// === 修正部分開始：為了讓 ES Modules 支援 __dirname ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// === 修正部分結束 ===

// Resolve paths relative to the project root
// Assuming this script is run from project root or scripts folder
// We construct path to public/nba_odds.json
const PUBLIC_DIR = path.join(__dirname, '../public'); 
const DATA_FILE = path.join(PUBLIC_DIR, 'nba_odds.json');

// API Config
const API_KEY = process.env.ODDS_API_KEY;
const SPORT = 'basketball_nba';
const REGIONS = 'us'; // 'us', 'us,eu,uk'
const MARKETS = 'h2h,spreads';
const ODDS_FORMAT = 'decimal';

async function main() {
  if (!API_KEY) {
    console.error('Error: ODDS_API_KEY is not set in environment variables.');
    process.exit(1);
  }

  // 1. Load existing data (Snapshot)
  let existingData = [];
  if (fs.existsSync(DATA_FILE)) {
    try {
      const rawData = fs.readFileSync(DATA_FILE, 'utf8');
      existingData = JSON.parse(rawData);
      console.log(`Loaded ${existingData.length} existing games from local snapshot.`);
    } catch (err) {
      console.error('Error reading existing snapshot, starting fresh.', err);
    }
  }

  // Map for fast lookup by Game ID
  const existingMap = new Map(existingData.map(game => [game.id, game]));

  try {
    // 2. Fetch fresh data from The Odds API
    console.log('Fetching live data from The Odds API...');
    const response = await axios.get(
      `https://api.the-odds-api.com/v4/sports/${SPORT}/odds`,
      {
        params: {
          apiKey: API_KEY,
          regions: REGIONS,
          markets: MARKETS,
          oddsFormat: ODDS_FORMAT,
        },
      }
    );

    const apiGames = response.data;
    console.log(`Fetched ${apiGames.length} games from API.`);

    const now = new Date();
    const finalGames = [];

    // 3. Logic: Lock odds if game started, Update if pre-game
    for (const newGame of apiGames) {
      const gameId = newGame.id;
      const commenceTime = new Date(newGame.commence_time);
      const oldGame = existingMap.get(gameId);

      // Condition: Game has started AND we have old data
      if (now >= commenceTime && oldGame) {
        console.log(`[LOCKED] Game ${newGame.home_team} vs ${newGame.away_team} started. Keeping snapshot.`);
        finalGames.push(oldGame);
      } 
      // Condition: Game hasn't started OR it's a new game we didn't track yet
      else {
        if (oldGame) {
            console.log(`[UPDATE] Updating odds for ${newGame.home_team} vs ${newGame.away_team} (Pre-game).`);
        } else {
            console.log(`[NEW] Found new game: ${newGame.home_team} vs ${newGame.away_team}.`);
        }
        finalGames.push(newGame);
      }
    }

    // 4. Save to file
    // Ensure directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      try {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
      } catch (e) {
        console.error("Could not create public directory", e);
      }
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(finalGames, null, 2));
    console.log(`Successfully saved ${finalGames.length} games to ${DATA_FILE}`);

  } catch (error) {
    console.error('Error fetching/saving odds:', error.message);
    process.exit(1);
  }
}

main();
