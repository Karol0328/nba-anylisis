import React from 'react';
import { Game, AiPredictionResponse, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game | null;
  analysis: AiPredictionResponse | null;
  isLoading: boolean;
  onConfirm: () => void;
  lang: Language;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
  isOpen, onClose, game, analysis, isLoading, onConfirm, lang 
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[lang];

  const homeName = game ? (lang === 'zh' ? game.homeTeam.nameZh : game.homeTeam.name) : '';
  const awayName = game ? (lang === 'zh' ? game.awayTeam.nameZh : game.awayTeam.name) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-panel border-cyber-primary/20 rounded-xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden relative">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-primary via-cyber-secondary to-cyber-primary"></div>

        {/* Minimal Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/40">
          <h2 className="text-xs font-bold text-cyber-primary uppercase tracking-[0.2em] font-display neon-text">
            Gemini Neural Core
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-black/0 to-black/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-zinc-800 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-cyber-primary rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-cyber-primary text-xs animate-pulse font-mono tracking-widest">{t.analyzing}</p>
            </div>
          ) : analysis && game ? (
            <div className="space-y-6">
              
              {/* Matchup Title */}
              <div className="text-center pb-2">
                <div className="text-lg font-display font-medium text-white">
                  {homeName} <span className="text-zinc-600 mx-2 text-xs font-mono">VS</span> {awayName}
                </div>
              </div>

              {/* The Pick - Cyber Box */}
              <div className="bg-black/40 rounded-lg p-5 text-center border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-cyber-primary/5 group-hover:bg-cyber-primary/10 transition-all"></div>
                <div className="relative z-10">
                    <div className="text-[9px] text-zinc-400 uppercase tracking-[0.2em] mb-2 font-display">{t.winner}</div>
                    <div className={`text-4xl font-display font-bold mb-2 neon-text ${
                        analysis.winnerId === game.homeTeam.id ? 'text-cyber-primary' : 'text-cyber-secondary'
                    }`}>
                    {analysis.winnerId === game.homeTeam.id ? homeName : awayName}
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300">
                    {t.confidence}: <span className="text-white ml-2">{analysis.confidence}%</span>
                    </div>
                </div>
              </div>

              {/* Reasoning */}
              <div>
                <h3 className="text-[9px] font-bold text-cyber-primary mb-2 uppercase tracking-[0.2em] font-display">{t.reasoning}</h3>
                <p className="text-zinc-300 text-sm leading-relaxed font-light border-l border-zinc-700 pl-4">
                  {analysis.reasoning}
                </p>
              </div>

              {/* Key Factor */}
              <div className="bg-white/5 rounded p-4 border border-white/5">
                <h3 className="text-[9px] font-bold text-cyber-secondary mb-1 uppercase tracking-[0.2em] font-display">{t.keyFactor}</h3>
                <p className="text-zinc-100 text-sm font-mono">"{analysis.keyMatchupFactor}"</p>
              </div>

            </div>
          ) : (
             <div className="text-center text-zinc-500 font-mono text-xs">NO DATA AVAILABLE</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-black/40">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest font-display"
          >
            {t.cancel}
          </button>
          {!isLoading && analysis && (
            <button 
                onClick={onConfirm}
                className="px-6 py-2 rounded bg-white hover:bg-cyber-primary hover:text-black text-black font-bold text-[10px] uppercase tracking-widest transition-all font-display hover:shadow-[0_0_15px_rgba(6,182,212,0.6)]"
            >
                {t.confirmLock}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;