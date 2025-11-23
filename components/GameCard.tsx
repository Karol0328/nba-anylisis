import React from 'react';
import { Game, GameStatus, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface GameCardProps {
  game: Game;
  onAnalyze: (game: Game) => void;
  onSimulateResult: (game: Game) => void;
  lang: Language;
}

const GameCard: React.FC<GameCardProps> = ({ game, onAnalyze, onSimulateResult, lang }) => {
  const t = TRANSLATIONS[lang];
  const gameDate = new Date(game.startTime);
  
  // Format for Taiwan Timezone
  const timeString = gameDate.toLocaleTimeString(lang === 'zh' ? 'zh-TW' : 'en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false,
    timeZone: 'Asia/Taipei'
  });

  const homeWidth = `${game.marketData.homeWinProb * 100}%`;
  const awayWidth = `${game.marketData.awayWinProb * 100}%`;

  const homeName = lang === 'zh' ? game.homeTeam.nameZh : game.homeTeam.name;
  const awayName = lang === 'zh' ? game.awayTeam.nameZh : game.awayTeam.name;

  const isLive = game.status === GameStatus.LIVE;

  const getStatusBadge = () => {
    if (game.status === GameStatus.FINISHED) {
      return <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-600 mr-2"></span>;
    }
    if (isLive) {
      return (
        <span className="relative flex h-2 w-2 mr-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-primary"></span>
        </span>
      );
    }
    if (game.isLocked) {
      return <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyber-secondary mr-2"></span>;
    }
    return <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyber-primary mr-2"></span>;
  };

  const getStatusText = () => {
     if (game.status === GameStatus.FINISHED) return t.final;
     if (isLive) return `${t.live} • Q${game.currentQuarter || '-'} ${game.clock || ''}`;
     if (game.isLocked) return t.locked;
     return t.open;
  };

  const getSourceBadge = () => {
    if (game.oddsSource === 'POLYMARKET') {
        return (
            <span className="flex items-center gap-1 text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold tracking-wider">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
                POLYMARKET
            </span>
        );
    }
    if (game.oddsSource === 'SPORTSBOOK') {
        return <span className="text-[9px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-700">SPORTSBOOK</span>;
    }
    return <span className="text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded">STATS MODEL</span>;
  };

  return (
    <div className="glass-panel rounded-xl p-0 mb-5 overflow-hidden transition-all duration-300 hover:border-cyber-primary/30 relative group">
      {/* Decorative Gradient Blob */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyber-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyber-primary/10 transition-all"></div>

      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
        <div className="flex items-center">
          {getStatusBadge()}
          <span className={`text-[10px] font-display font-bold tracking-widest uppercase ${isLive ? 'text-cyber-primary neon-text' : 'text-zinc-400'}`}>
            {getStatusText()}
          </span>
        </div>
        <div className="flex items-center gap-3">
             {getSourceBadge()}
             <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                {timeString} <span className="text-[8px] text-zinc-600 bg-zinc-900 px-1 rounded">TW</span>
             </span>
        </div>
      </div>

      <div className="p-5">
        {/* Matchup Grid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-6">
          
          {/* Home */}
          <div className="flex flex-col items-center relative">
              {game.homeTeam.logo ? (
                <img src={game.homeTeam.logo} alt={homeName} className="w-12 h-12 mb-2 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              ) : (
                <span className="text-4xl mb-3">🏀</span>
              )}
              <span className="font-display font-bold text-zinc-100 text-sm tracking-wide text-center">{homeName}</span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 rounded text-[10px] text-zinc-400 font-mono border border-white/5">
                {game.homeTeam.wins}W - {game.homeTeam.losses}L
              </span>
              
              {/* Score Display */}
              {(game.status !== GameStatus.SCHEDULED) && (
                  <span className={`text-3xl font-mono font-bold mt-2 ${
                    (game.homeScore || 0) > (game.awayScore || 0) ? 'text-white text-shadow-glow' : 'text-zinc-600'
                  }`}>
                      {game.homeScore}
                  </span>
              )}
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center justify-center h-full">
            <div className="h-8 w-[1px] bg-gradient-to-b from-transparent via-zinc-700 to-transparent mb-2"></div>
            <div className="text-zinc-700 text-[10px] font-black tracking-widest font-display italic">VS</div>
            <div className="h-8 w-[1px] bg-gradient-to-t from-transparent via-zinc-700 to-transparent mt-2"></div>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center relative">
              {game.awayTeam.logo ? (
                 <img src={game.awayTeam.logo} alt={awayName} className="w-12 h-12 mb-2 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              ) : (
                 <span className="text-4xl mb-3">🏀</span>
              )}
              <span className="font-display font-bold text-zinc-100 text-sm tracking-wide text-center">{awayName}</span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 rounded text-[10px] text-zinc-400 font-mono border border-white/5">
                {game.awayTeam.wins}W - {game.awayTeam.losses}L
              </span>
              
              {/* Score Display */}
              {(game.status !== GameStatus.SCHEDULED) && (
                  <span className={`text-3xl font-mono font-bold mt-2 ${
                    (game.awayScore || 0) > (game.homeScore || 0) ? 'text-white text-shadow-glow' : 'text-zinc-600'
                  }`}>
                      {game.awayScore}
                  </span>
              )}
          </div>
        </div>

        {/* Polymarket Bar - Cyber Style */}
        <div className="mb-5 relative group/bar">
          <div className="flex justify-between text-[9px] text-zinc-500 mb-1.5 uppercase tracking-widest font-display font-semibold">
              <span className={game.oddsSource === 'POLYMARKET' ? 'text-blue-400' : 'text-zinc-500'}>
                {game.oddsSource === 'POLYMARKET' ? t.marketOdds : 'WIN PROBABILITY'}
              </span>
              {game.marketData.volumeUsd > 0 && (
                <span className="text-zinc-600 font-mono">${(game.marketData.volumeUsd / 1000).toFixed(0)}K VOL</span>
              )}
          </div>
          
          <div className="h-1.5 w-full bg-zinc-900/50 rounded-full overflow-hidden flex ring-1 ring-white/5 relative">
              <div style={{ width: homeWidth }} className="bg-gradient-to-r from-cyber-primary/40 to-cyber-primary h-full relative transition-all duration-1000">
                {/* Shine effect */}
                <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
              </div>
              <div style={{ width: awayWidth }} className="bg-gradient-to-l from-cyber-secondary/40 to-cyber-secondary h-full relative transition-all duration-1000">
                 <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/50 shadow-[0_0_10px_rgba(217,70,239,0.8)]"></div>
              </div>
          </div>
          
          <div className="flex justify-between text-[10px] mt-1.5 font-mono">
              <span className="text-cyber-primary">{(game.marketData.homeWinProb * 100).toFixed(1)}%</span>
              <span className="text-cyber-secondary">{(game.marketData.awayWinProb * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Footer / Actions */}
        <div className="flex justify-between items-end pt-2 border-t border-white/5">
          {game.predictedWinnerId ? (
              <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1 font-display">{t.aiPick}</span>
                  <div className="flex items-center gap-2">
                      <span className={`font-display font-bold text-sm ${
                          game.predictedWinnerId === game.homeTeam.id ? 'text-cyber-primary' : 'text-cyber-secondary'
                      }`}>
                          {game.predictedWinnerId === game.homeTeam.id ? homeName : awayName}
                      </span>
                      {game.resultVerified && (
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            game.predictionCorrect 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                              {game.predictionCorrect ? t.win : t.loss}
                          </span>
                      )}
                  </div>
              </div>
          ) : (
              <div className="text-[10px] text-zinc-700 font-mono">-- WAITING FOR INPUT --</div>
          )}

          <div className="flex gap-2">
              {game.status === GameStatus.SCHEDULED && !game.predictedWinnerId && (
                  <button 
                      onClick={() => onAnalyze(game)}
                      disabled={game.isLocked}
                      className={`px-4 py-2 rounded text-[10px] font-bold tracking-widest uppercase transition-all font-display ${
                          game.isLocked 
                          ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed' 
                          : 'bg-white text-black hover:bg-cyber-primary hover:text-black hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      }`}
                  >
                      {game.isLocked ? t.locked : t.analyzeBtn}
                  </button>
              )}
              
              {/* Optional Manual Override button for testing/demo even if live */}
              {(game.status === GameStatus.SCHEDULED || game.status === GameStatus.LIVE) && (
                   <button 
                   onClick={() => onSimulateResult(game)}
                   className="px-3 py-2 rounded text-[10px] font-bold text-zinc-600 hover:text-zinc-300 border border-transparent hover:border-zinc-800 transition-all font-display"
                   title="Force Verify (Test)"
               >
                   DEV: VERIFY
               </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;