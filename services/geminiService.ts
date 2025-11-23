
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Game, AiPredictionResponse, Language } from '../types';

// Safely access process.env to prevent "process is not defined" crash in browsers
const getApiKey = () => {
  try {
    // In some build environments (Vite), process might not be defined on the client
    // We check availability to avoid a white screen crash
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

// Schema for structured JSON output
const predictionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    winnerId: {
      type: Type.STRING,
      description: "The ID of the team predicted to win (e.g., 'LAL', 'BOS'). MUST match one of the input team IDs.",
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence percentage from 0 to 100.",
    },
    reasoning: {
      type: Type.STRING,
      description: "A concise paragraph explaining the prediction. You MUST explicitly mention 'Momentum' or 'Recent Form' in your reasoning.",
    },
    keyMatchupFactor: {
      type: Type.STRING,
      description: "One short sentence identifying the key factor (e.g., 'High Rolling Std Dev', 'Recent Form Surge').",
    },
  },
  required: ["winnerId", "confidence", "reasoning", "keyMatchupFactor"],
};

export const analyzeGame = async (game: Game, lang: Language): Promise<AiPredictionResponse> => {
  if (!apiKey) {
    return {
      winnerId: game.marketData.homeWinProb > game.marketData.awayWinProb ? game.homeTeam.id : game.awayTeam.id,
      confidence: 50,
      reasoning: lang === 'zh' 
        ? "⚠️ 錯誤：未設定 API 金鑰。請在 Vercel 設定環境變數 API_KEY。" 
        : "⚠️ Error: API Key not configured. Please set API_KEY in Vercel environment variables.",
      keyMatchupFactor: "Missing API Key"
    };
  }

  const teamNameHome = lang === 'zh' ? game.homeTeam.nameZh : game.homeTeam.name;
  const teamNameAway = lang === 'zh' ? game.awayTeam.nameZh : game.awayTeam.name;

  const prompt = `
    Act as an elite NBA Data Scientist and Sports Bettor.
    Analyze the following matchup to predict the winner.
    
    IMPORTANT INSTRUCTION ON METHODOLOGY:
    Do not rely solely on season-long averages. You MUST apply a "Rolling Window" logic similar to pandas dataframe rolling statistics.
    1. PRIORITIZE Recent Form (Last 10 Games) over Season Record. This is your 'rolling_5_pts' and 'rolling_5_win_rate' equivalent.
    2. Consider Stability: If a team is volatile (high standard deviation in recent performance), lower the confidence.
    3. MARKET SIGNAL: If Polymarket probability is high (>60%), respect the 'Smart Money'.
    
    Output Language: ${lang === 'zh' ? 'Traditional Chinese (繁體中文)' : 'English'}.

    Home Team: ${teamNameHome} (${game.homeTeam.id})
    - Season Record: ${game.homeTeam.wins}-${game.homeTeam.losses}
    - Recent Form (Last 10): ${game.homeTeam.last10} (Win Rate: ${(game.homeTeam.recentForm * 100).toFixed(0)}%)
    - PPG: ${game.homeTeam.ppg}
    - Score (If Live): ${game.homeScore}

    Away Team: ${teamNameAway} (${game.awayTeam.id})
    - Season Record: ${game.awayTeam.wins}-${game.awayTeam.losses}
    - Recent Form (Last 10): ${game.awayTeam.last10} (Win Rate: ${(game.awayTeam.recentForm * 100).toFixed(0)}%)
    - PPG: ${game.awayTeam.ppg}
    - Score (If Live): ${game.awayScore}

    Polymarket / Odds Data:
    - Source: ${game.oddsSource}
    - Home Win Prob: ${(game.marketData.homeWinProb * 100).toFixed(1)}%
    - Away Win Prob: ${(game.marketData.awayWinProb * 100).toFixed(1)}%

    Task:
    Predict the winner based on the "Momentum" (Recent Form) vs "Market Sentiment" (Odds).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: predictionSchema,
        temperature: 0.3, // Lower temperature for more analytical/conservative answers
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini.");
    }

    const prediction = JSON.parse(text) as AiPredictionResponse;
    return prediction;

  } catch (error: any) {
    console.error("Gemini Analysis Failed:", error);
    
    let errorMessage = lang === 'zh' ? "AI 分析暫時無法使用。" : "AI Analysis unavailable.";
    
    if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
       errorMessage = lang === 'zh' 
        ? "⚠️ 免費 API 額度已達上限。請稍後再試。" 
        : "⚠️ Free API quota exceeded. Please try again later.";
    }

    return {
      winnerId: game.marketData.homeWinProb > game.marketData.awayWinProb ? game.homeTeam.id : game.awayTeam.id,
      confidence: 50,
      reasoning: errorMessage,
      keyMatchupFactor: "API Limit"
    };
  }
};
