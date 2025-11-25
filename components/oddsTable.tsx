import React, { useEffect, useState } from 'react';

// --- Type Definitions based on The Odds API ---
interface Outcome {
  name: string;
  price: number;
  point?: number; // Spread point
}

interface Market {
  key: string; // 'h2h', 'spreads', etc.
  last_update: string;
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

interface GameOdds {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

const OddsTable: React.FC = () => {
  const [games, setGames] = useState<GameOdds[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch from the static file in public folder
    fetch('/nba_odds.json')
      .then((res) => {
        if (!res.ok) {
           // If file doesn't exist yet (before first script run), handle gracefully
           if(res.status === 404) return [];
           throw new Error('Failed to fetch odds data');
        }
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort by time
          const sorted = data.sort((a: GameOdds, b: GameOdds) => 
            new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
          );
          setGames(sorted);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('No Snapshot Data Available Yet');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-center text-xs font-mono text-zinc-500 animate-pulse">LOADING ODDS SNAPSHOT...</div>;
  
  if (games.length === 0) return null; // Don't show anything if no data

  return (
    <div className="mt-12 mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-cyber-primary rounded-sm"></div>
        <h2 className="text-sm font-display font-bold text-white uppercase tracking-widest">
          Reference: Pre-Game Odds Snapshot
        </h2>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20 backdrop-blur-sm">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-display">Time</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-display">Matchup</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-cyber-primary uppercase tracking-widest font-display">
                Pinnacle (ML)
              </th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-cyber-secondary uppercase tracking-widest font-display">
                DraftKings (Spread)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {games.map((game) => {
              const gameDate = new Date(game.commence_time).toLocaleString('zh-TW', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              // Find Bookmakers
              const pinnacle = game.bookmakers.find((b) => b.key === 'pinnacle');
              const draftkings = game.bookmakers.find((b) => b.key === 'draftkings');

              // Extract H2H (Moneyline)
              const h2hMarket = pinnacle?.markets.find((m) => m.key === 'h2h');
              const homeH2H = h2hMarket?.outcomes.find((o) => o.name === game.home_team)?.price;
              const awayH2H = h2hMarket?.outcomes.find((o) => o.name === game.away_team)?.price;

              // Extract Spreads
              const spreadMarket = draftkings?.markets.find((m) => m.key === 'spreads');
              const homeSpread = spreadMarket?.outcomes.find((o) => o.name === game.home_team);
              
              return (
                <tr key={game.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                    {gameDate}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col">
                        <span className="font-bold text-zinc-200">{game.home_team}</span>
                        <span className="text-zinc-500 text-[10px]">vs {game.away_team}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-center font-mono">
                    {homeH2H && awayH2H ? (
                      <div className="flex justify-center gap-3">
                        <span className="text-emerald-400">{homeH2H}</span>
                        <span className="text-zinc-600">/</span>
                        <span className="text-red-400">{awayH2H}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-center font-mono">
                    {homeSpread ? (
                      <div className="flex flex-col items-center">
                        <span className="text-zinc-300">
                          {homeSpread.point && homeSpread.point > 0 ? '+' : ''}{homeSpread.point}
                        </span>
                        <span className="text-[9px] text-zinc-600">@{homeSpread.price}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-zinc-600 mt-2 text-center font-mono">
        DATA SOURCE: THE ODDS API • SNAPSHOT TAKEN AUTOMATICALLY EVERY 2 HOURS
      </p>
    </div>
  );
};

export default OddsTable;
