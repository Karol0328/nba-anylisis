
import React, { useEffect, useState } from 'react';

// --- Type Definitions ---
interface Outcome {
  name: string;
  price: number;
}

interface Market {
  key: string; // usually 'h2h'
  outcomes: Outcome[];
}

interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

interface MarketGameData {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

const MarketOddsTable: React.FC = () => {
  const [games, setGames] = useState<MarketGameData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/nba_odds.json')
      .then((res) => {
        if (!res.ok) return []; // Handle 404 or error gracefully
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort by time
          const sorted = data.sort((a, b) => 
            new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
          );
          setGames(sorted);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load odds:", err);
        setLoading(false);
      });
  }, []);

  // Helper: Calculate Implied Probability
  const calculateImpliedProb = (price: number): string => {
    if (!price || price <= 0) return '-';
    return ((1 / price) * 100).toFixed(1) + '%';
  };

  if (loading) return null;
  if (games.length === 0) return null;

  return (
    <div className="mt-12 mb-8 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-cyber-primary rounded-sm"></div>
        <h2 className="text-sm font-display font-bold text-white uppercase tracking-widest">
          Global Market Odds & Implied Probability
        </h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/20 backdrop-blur-sm">
        <table className="min-w-full divide-y divide-white/5">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-display">Date / Time</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-display">Matchup</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-display">Bookmaker Odds</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-cyber-primary uppercase tracking-widest font-display">
                Implied Win %
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {games.map((game) => {
              const gameDate = new Date(game.commence_time).toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });

              // Logic: Find Pinnacle, fallback to first available
              let selectedBookmaker = game.bookmakers.find(b => b.key === 'pinnacle');
              if (!selectedBookmaker && game.bookmakers.length > 0) {
                selectedBookmaker = game.bookmakers[0];
              }

              // Extract H2H Market
              const h2hMarket = selectedBookmaker?.markets.find(m => m.key === 'h2h');
              const homeOutcome = h2hMarket?.outcomes.find(o => o.name === game.home_team);
              const awayOutcome = h2hMarket?.outcomes.find(o => o.name === game.away_team);

              const homePrice = homeOutcome?.price || 0;
              const awayPrice = awayOutcome?.price || 0;

              return (
                <tr key={game.id} className="hover:bg-white/5 transition-colors">
                  {/* Time */}
                  <td className="px-4 py-3 text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                    {gameDate}
                  </td>

                  {/* Matchup */}
                  <td className="px-4 py-3 text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-200">{game.home_team}</span>
                      <span className="text-zinc-500 text-[10px]">{game.away_team}</span>
                    </div>
                  </td>

                  {/* Decimal Odds */}
                  <td className="px-4 py-3 text-xs text-center font-mono">
                    {homePrice && awayPrice ? (
                      <div className="flex flex-col items-center">
                        <span className="text-zinc-300">
                          {homePrice.toFixed(2)} <span className="text-zinc-600 text-[10px] mx-1">vs</span> {awayPrice.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-zinc-600 mt-0.5">
                          {selectedBookmaker?.title || 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>

                  {/* Implied Probability */}
                  <td className="px-4 py-3 text-xs text-center font-mono">
                    {homePrice && awayPrice ? (
                      <div className="flex justify-center items-center gap-2">
                         {/* Home Prob */}
                        <span className={`${homePrice < awayPrice ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                          {calculateImpliedProb(homePrice)}
                        </span>
                        <span className="text-zinc-700">/</span>
                        {/* Away Prob */}
                        <span className={`${awayPrice < homePrice ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                          {calculateImpliedProb(awayPrice)}
                        </span>
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
    </div>
  );
};

export default MarketOddsTable;

