
import React, { useState, useEffect } from 'react';
import { LOCK_WINDOW_MINUTES, TRANSLATIONS } from './constants';
import { Game, GameStatus, AiPredictionResponse, Language } from './types';
import GameCard from './components/GameCard';
import AnalysisModal from './components/AnalysisModal';
import { analyzeGame } from './services/geminiService';
import { fetchNbaGames } from './services/nbaDataService';

const App: React.FC = () => {
  // State
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<AiPredictionResponse | null>(null);
  const [lang, setLang] = useState<Language>('zh'); 
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const t = TRANSLATIONS[lang];

  // Load Games whenever date changes
  useEffect(() => {
    const loadGames = async () => {
      setIsLoadingGames(true);
      setFetchError(null);
      try {
        const fetchedGames = await fetchNbaGames(selectedDate);
        setGames(fetchedGames);
      } catch (err) {
        console.error("Critical error fetching games:", err);
        setFetchError("Failed to load game data.");
        setGames([]);
      } finally {
        setIsLoadingGames(false);
      }
    };
    loadGames();
    
    // Auto-refresh live data every 30 seconds
    const intervalId = setInterval(loadGames, 30000);
    return () => clearInterval(intervalId);
  }, [selectedDate]);

  // Timer to check lock status locally (just visual)
  useEffect(() => {
    const checkLockStatus = () => {
      const now = new Date();
      setGames(prevGames => prevGames.map(game => {
        if (game.status === GameStatus.FINISHED || game.status === GameStatus.LIVE) return game;

        const gameTime = new Date(game.startTime);
        const diffMinutes = (gameTime.getTime() - now.getTime()) / (1000 * 60);
        const shouldLock = diffMinutes <= LOCK_WINDOW_MINUTES;

        if (shouldLock !== game.isLocked) {
          return { ...game, isLocked: shouldLock };
        }
        return game;
      }));
    };

    const intervalId = setInterval(checkLockStatus, 60000); 
    checkLockStatus();

    return () => clearInterval(intervalId);
  }, []);

  const handleAnalyzeClick = async (game: Game) => {
    setSelectedGame(game);
    setIsModalOpen(true);
    setIsAnalyzing(true);
    setCurrentAnalysis(null);

    try {
      const result = await analyzeGame(game, lang);
      setCurrentAnalysis(result);
    } catch (error) {
      console.error("Analysis error", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmPrediction = () => {
    if (!selectedGame || !currentAnalysis) return;

    setGames(prevGames => prevGames.map(g => {
      if (g.id === selectedGame.id) {
        return {
          ...g,
          predictedWinnerId: currentAnalysis.winnerId,
          predictionConfidence: currentAnalysis.confidence,
          predictionReasoning: currentAnalysis.reasoning
        };
      }
      return g;
    }));
    
    setIsModalOpen(false);
    setSelectedGame(null);
    setCurrentAnalysis(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedGame(null);
    setCurrentAnalysis(null);
  };

  const handleSimulateResult = (game: Game) => {
    // Manually force a result for testing purposes since we are on real data now
    // This allows user to see "Win/Loss" badge even if game isn't actually over in real life
    setGames(prevGames => prevGames.map(g => {
      if (g.id === game.id) {
        // Assume home wins for test
        const homeWon = true; 
        return {
          ...g,
          status: GameStatus.FINISHED,
          homeScore: 100, 
          awayScore: 90,
          isLocked: true,
          resultVerified: true,
          predictionCorrect: g.predictedWinnerId ? (g.predictedWinnerId === g.homeTeam.id) : undefined
        };
      }
      return g;
    }));
  };

  const totalPredictions = games.filter(g => g.resultVerified).length;
  const correctPredictions = games.filter(g => g.resultVerified && g.predictionCorrect).length;
  const accuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  // Date Navigation Helpers
  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-screen bg-cyber-dark text-slate-300 pb-20 selection:bg-cyber-primary selection:text-black">
      
      {/* Decorative Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyber-primary/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyber-secondary/5 rounded-full blur-[100px]"></div>
      </div>

      {/* Cyber Navbar */}
      <nav className="border-b border-white/5 bg-cyber-dark/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gradient-to-b from-cyber-primary to-cyber-secondary rounded-sm"></div>
            <div className="font-display font-bold text-xl text-white tracking-widest uppercase">
              Hoops<span className="text-cyber-primary">Oracle</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(l => l === 'en' ? 'zh' : 'en')}
              className="text-[10px] font-bold text-cyber-primary hover:bg-cyber-primary hover:text-black transition-all uppercase tracking-widest border border-cyber-primary/30 px-3 py-1.5 rounded font-display"
            >
              {lang === 'en' ? '中文' : 'ENG'}
            </button>
          </div>
        </div>
      </nav>

      {/* Date Picker Strip - Tech Style */}
      <div className="border-b border-white/5 bg-black/40 pt-3 pb-3 sticky top-16 z-30 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
            <button onClick={() => changeDate(-1)} className="p-2 text-zinc-500 hover:text-cyber-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <div className="flex flex-col items-center">
                <span className="text-white text-lg font-display font-bold tracking-wide">
                    {selectedDate.toLocaleDateString(lang === 'zh' ? 'zh-TW' : 'en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                </span>
                <span className="text-[9px] text-cyber-primary uppercase tracking-[0.2em] font-mono mt-0.5">
                   {selectedDate.toDateString() === new Date().toDateString() ? (lang === 'zh' ? '/// 今天 ///' : '/// TODAY ///') : '/// ARCHIVE ///'}
                </span>
            </div>
            <button onClick={() => changeDate(1)} className="p-2 text-zinc-500 hover:text-cyber-primary transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-8 relative z-10">
        
        {/* HUD Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center border-t border-cyber-primary/20">
            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mb-1 font-display">{t.accuracy}</span>
            <span className={`text-3xl font-mono font-bold ${accuracy >= 50 ? 'text-cyber-primary neon-text' : 'text-zinc-500'}`}>{accuracy}%</span>
          </div>
          <div className="glass-panel p-4 rounded-xl flex flex-col items-center border-t border-cyber-secondary/20">
             <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 mb-1 font-display">{t.winsLoss}</span>
             <div className="flex gap-3 text-lg font-mono font-bold">
                <span className="text-emerald-400 drop-shadow-md">{correctPredictions}W</span>
                <span className="text-zinc-700">|</span>
                <span className="text-red-400 drop-shadow-md">{totalPredictions - correctPredictions}L</span>
             </div>
          </div>
        </div>

        {/* Games Feed */}
        <section>
          {isLoadingGames ? (
             <div className="py-24 text-center">
                <div className="inline-block w-8 h-8 border-2 border-cyber-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">{lang === 'zh' ? "連線 NBA 數據中心..." : "UPLINKING TO NBA DATA..."}</p>
             </div>
          ) : fetchError ? (
            <div className="py-24 text-center border border-dashed border-red-900/50 rounded-xl bg-red-900/10">
                <p className="text-red-400 text-xs font-mono uppercase tracking-widest mb-2">⚠ SYSTEM ERROR</p>
                <p className="text-zinc-500 text-[10px]">{fetchError}</p>
                 <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 px-4 py-2 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded text-[10px] font-bold uppercase tracking-widest"
                >
                  {lang === 'zh' ? "重試" : "RETRY"}
                </button>
            </div>
          ) : games.length > 0 ? (
            games.map(game => (
              <GameCard 
                key={game.id} 
                game={game} 
                onAnalyze={handleAnalyzeClick}
                onSimulateResult={handleSimulateResult}
                lang={lang}
              />
            ))
          ) : (
            <div className="py-24 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-zinc-600 text-xs font-mono uppercase tracking-widest">{t.noGames}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 text-[10px] text-cyber-primary underline hover:text-white"
                >
                  {lang === 'zh' ? "重新整理" : "RETRY CONNECTION"}
                </button>
            </div>
          )}
        </section>

        {/* Cyber Footer */}
        <footer className="mt-16 text-center border-t border-white/5 pt-8 pb-8">
          <div className="flex justify-center items-center gap-2 mb-2 opacity-50">
             <div className="w-1 h-1 bg-cyber-primary rounded-full animate-pulse"></div>
             <div className="w-1 h-1 bg-cyber-secondary rounded-full animate-pulse delay-75"></div>
             <div className="w-1 h-1 bg-cyber-primary rounded-full animate-pulse delay-150"></div>
          </div>
          <p className="text-[9px] text-zinc-600 uppercase tracking-[0.3em] font-display">{t.footerInfo}</p>
        </footer>

      </main>

      {/* Analysis Modal */}
      <AnalysisModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        game={selectedGame}
        analysis={currentAnalysis}
        isLoading={isAnalyzing}
        onConfirm={handleConfirmPrediction}
        lang={lang}
      />
    </div>
  );
};

export default App;
