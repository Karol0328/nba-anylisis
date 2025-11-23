
import { Game, GameStatus } from './types';

// Helper to create dates relative to now
const today = new Date();
export const getRelativeDate = (daysOffset: number, hoursOffset: number = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(today.getHours() + hoursOffset);
  d.setMinutes(0);
  return d.toISOString();
};

export const LOCK_WINDOW_MINUTES = 30;

export const TRANSLATIONS = {
  en: {
    dashboard: "Command Center",
    accuracy: "AI Accuracy",
    winsLoss: "W / L Record",
    noGames: "No scheduled operations detected.",
    locked: "LOCKED",
    open: "OPEN",
    final: "FINAL",
    live: "LIVE",
    analyzeBtn: "INITIATE ANALYSIS",
    simBtn: "SIM",
    prediction: "TARGET",
    confidence: "CONFIDENCE",
    reasoning: "AI LOGIC",
    keyFactor: "VECTOR",
    marketOdds: "MARKET SENTIMENT",
    win: "SUCCESS",
    loss: "FAILURE",
    vs: "VS",
    footerInfo: "System locks 30m prior to engagement. Neural Core by Gemini.",
    analyzing: "PROCESSING DATA STREAMS...",
    winner: "PROJECTED VICTOR",
    aiPick: "AI TARGET",
    confirmLock: "CONFIRM LOCK",
    cancel: "ABORT"
  },
  zh: {
    dashboard: "戰情中心",
    accuracy: "AI 準確率",
    winsLoss: "勝敗紀錄",
    noGames: "本日無賽事數據 (或是 API 連線失敗)",
    locked: "已鎖定",
    open: "開放預測",
    final: "已結束",
    live: "進行中",
    analyzeBtn: "啟動分析",
    simBtn: "模擬",
    prediction: "預測目標",
    confidence: "信心指數",
    reasoning: "AI 邏輯運算",
    keyFactor: "關鍵變數",
    marketOdds: "市場資金流向",
    win: "準確",
    loss: "失準",
    vs: "VS",
    footerInfo: "系統於開賽前 30 分鐘鎖定。核心由 Gemini 提供。",
    analyzing: "正在分析數據流...",
    winner: "預測勝隊",
    aiPick: "AI 選擇",
    confirmLock: "鎖定預測",
    cancel: "取消"
  }
};

// Full 30 NBA Teams - Used for Stat Enrichment (PPG, Last 10)
export const TEAMS = {
  // Eastern Conference
  BOS: { id: 'BOS', name: 'Celtics', nameZh: '塞爾提克', wins: 45, losses: 12, ppg: 120.8, oppg: 110.5, last10: "9-1", logo: "https://a.espncdn.com/i/teamlogos/nba/500/bos.png" },
  MIL: { id: 'MIL', name: 'Bucks', nameZh: '公鹿', wins: 35, losses: 21, ppg: 122.1, oppg: 118.5, last10: "5-5", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mil.png" },
  CLE: { id: 'CLE', name: 'Cavaliers', nameZh: '騎士', wins: 36, losses: 19, ppg: 115.2, oppg: 110.1, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/cle.png" },
  NYK: { id: 'NYK', name: 'Knicks', nameZh: '尼克', wins: 33, losses: 22, ppg: 114.5, oppg: 109.8, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/nyk.png" },
  PHI: { id: 'PHI', name: '76ers', nameZh: '76人', wins: 32, losses: 23, ppg: 117.5, oppg: 113.2, last10: "3-7", logo: "https://a.espncdn.com/i/teamlogos/nba/500/phi.png" },
  IND: { id: 'IND', name: 'Pacers', nameZh: '溜馬', wins: 31, losses: 25, ppg: 123.5, oppg: 122.1, last10: "5-5", logo: "https://a.espncdn.com/i/teamlogos/nba/500/ind.png" },
  MIA: { id: 'MIA', name: 'Heat', nameZh: '熱火', wins: 30, losses: 25, ppg: 110.6, oppg: 109.8, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mia.png" },
  ORL: { id: 'ORL', name: 'Magic', nameZh: '魔術', wins: 30, losses: 25, ppg: 111.8, oppg: 110.9, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/orl.png" },
  CHI: { id: 'CHI', name: 'Bulls', nameZh: '公牛', wins: 26, losses: 29, ppg: 111.9, oppg: 113.2, last10: "5-5", logo: "https://a.espncdn.com/i/teamlogos/nba/500/chi.png" },
  ATL: { id: 'ATL', name: 'Hawks', nameZh: '老鷹', wins: 24, losses: 31, ppg: 121.2, oppg: 123.8, last10: "4-6", logo: "https://a.espncdn.com/i/teamlogos/nba/500/atl.png" },
  BKN: { id: 'BKN', name: 'Nets', nameZh: '籃網', wins: 21, losses: 33, ppg: 113.5, oppg: 115.8, last10: "3-7", logo: "https://a.espncdn.com/i/teamlogos/nba/500/bkn.png" },
  TOR: { id: 'TOR', name: 'Raptors', nameZh: '暴龍', wins: 19, losses: 36, ppg: 114.2, oppg: 117.5, last10: "3-7", logo: "https://a.espncdn.com/i/teamlogos/nba/500/tor.png" },
  CHA: { id: 'CHA', name: 'Hornets', nameZh: '黃蜂', wins: 13, losses: 41, ppg: 108.5, oppg: 119.8, last10: "3-7", logo: "https://a.espncdn.com/i/teamlogos/nba/500/cha.png" },
  WAS: { id: 'WAS', name: 'Wizards', nameZh: '巫師', wins: 9, losses: 45, ppg: 114.8, oppg: 124.2, last10: "0-10", logo: "https://a.espncdn.com/i/teamlogos/nba/500/was.png" },
  DET: { id: 'DET', name: 'Pistons', nameZh: '活塞', wins: 8, losses: 46, ppg: 112.5, oppg: 122.1, last10: "2-8", logo: "https://a.espncdn.com/i/teamlogos/nba/500/det.png" },

  // Western Conference
  MIN: { id: 'MIN', name: 'Timberwolves', nameZh: '灰狼', wins: 39, losses: 16, ppg: 113.8, oppg: 106.5, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/min.png" },
  OKC: { id: 'OKC', name: 'Thunder', nameZh: '雷霆', wins: 37, losses: 17, ppg: 120.8, oppg: 113.2, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/okc.png" },
  LAC: { id: 'LAC', name: 'Clippers', nameZh: '快艇', wins: 36, losses: 17, ppg: 118.2, oppg: 112.5, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/lac.png" },
  DEN: { id: 'DEN', name: 'Nuggets', nameZh: '金塊', wins: 36, losses: 19, ppg: 114.2, oppg: 110.8, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/den.png" },
  PHX: { id: 'PHX', name: 'Suns', nameZh: '太陽', wins: 33, losses: 22, ppg: 117.5, oppg: 114.5, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/phx.png" },
  NOP: { id: 'NOP', name: 'Pelicans', nameZh: '鵜鶘', wins: 33, losses: 22, ppg: 116.5, oppg: 112.8, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/nop.png" },
  DAL: { id: 'DAL', name: 'Mavericks', nameZh: '獨行俠', wins: 32, losses: 23, ppg: 118.8, oppg: 117.5, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/dal.png" },
  SAC: { id: 'SAC', name: 'Kings', nameZh: '國王', wins: 31, losses: 23, ppg: 118.5, oppg: 117.8, last10: "5-5", logo: "https://a.espncdn.com/i/teamlogos/nba/500/sac.png" },
  LAL: { id: 'LAL', name: 'Lakers', nameZh: '湖人', wins: 30, losses: 26, ppg: 116.8, oppg: 117.2, last10: "6-4", logo: "https://a.espncdn.com/i/teamlogos/nba/500/lal.png" },
  GSW: { id: 'GSW', name: 'Warriors', nameZh: '勇士', wins: 27, losses: 26, ppg: 119.5, oppg: 118.2, last10: "7-3", logo: "https://a.espncdn.com/i/teamlogos/nba/500/gsw.png" },
  UTA: { id: 'UTA', name: 'Jazz', nameZh: '爵士', wins: 26, losses: 30, ppg: 117.5, oppg: 120.2, last10: "4-6", logo: "https://a.espncdn.com/i/teamlogos/nba/500/uta.png" },
  HOU: { id: 'HOU', name: 'Rockets', nameZh: '火箭', wins: 24, losses: 30, ppg: 113.5, oppg: 112.8, last10: "3-7", logo: "https://a.espncdn.com/i/teamlogos/nba/500/hou.png" },
  MEM: { id: 'MEM', name: 'Grizzlies', nameZh: '灰熊', wins: 20, losses: 36, ppg: 106.8, oppg: 112.5, last10: "2-8", logo: "https://a.espncdn.com/i/teamlogos/nba/500/mem.png" },
  POR: { id: 'POR', name: 'Trail Blazers', nameZh: '拓荒者', wins: 15, losses: 39, ppg: 107.8, oppg: 116.5, last10: "2-8", logo: "https://a.espncdn.com/i/teamlogos/nba/500/por.png" },
  SAS: { id: 'SAS', name: 'Spurs', nameZh: '馬刺', wins: 11, losses: 44, ppg: 112.2, oppg: 120.5, last10: "1-9", logo: "https://a.espncdn.com/i/teamlogos/nba/500/sas.png" },
};
