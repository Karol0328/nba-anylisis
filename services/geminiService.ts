
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
      description: "A concise paragraph explaining the prediction based on stats and market odds.",
    },
    keyMatchupFactor: {
      type: Type.STRING,
      description: "One short sentence identifying the key factor (e.g., 'Home court advantage', 'Injury impact').",
    },
  },
  required: ["winnerId", "confidence", "reasoning", "keyMatchupFactor"],
};

export const analyzeGame = async (game: Game, lang: Language): Promise<AiPredictionResponse> => {
  if (!apiKey) {
    // If no API key, return a mock failure response instead of throwing to keep UI alive
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
    Act as a professional NBA sports analyst.
    Analyze the following matchup and predict the winner.
    
    IMPORTANT: Provide the 'reasoning' and 'keyMatchupFactor' in ${lang === 'zh' ? 'Traditional Chinese (繁體中文)' : 'English'}.
    
    Prediction Data Source: ${game.oddsSource === 'POLYMARKET' ? 'Polymarket (Prediction Market)' : 'Sportsbook/Stats'}

    Home Team: ${teamNameHome} (${game.homeTeam.id})
    - Record: ${game.homeTeam.wins}-${game.homeTeam.losses}
    - PPG: ${game.homeTeam.ppg}
    - Opp PPG: ${game.homeTeam.oppg}
    - Last 10: ${game.homeTeam.last10}
    - Score: ${game.homeScore} (If live/final)

    Away Team: ${teamNameAway} (${game.awayTeam.id})
    - Record: ${game.awayTeam.wins}-${game.awayTeam.losses}
    - PPG: ${game.awayTeam.ppg}
    - Opp PPG: ${game.awayTeam.oppg}
    - Last 10: ${game.awayTeam.last10}
    - Score: ${game.awayScore} (If live/final)

    Status: ${game.status}
    Polymarket (Betting Market) Sentiment:
    - ${teamNameHome} Win Probability: ${(game.marketData.homeWinProb * 100).toFixed(1)}%
    - ${teamNameAway} Win Probability: ${(game.marketData.awayWinProb * 100).toFixed(1)}%

    Task:
    1. Compare the historical stats.
    2. Consider the market sentiment (give high weight to Polymarket probabilities if available).
    3. Determine a winner.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: predictionSchema,
        temperature: 0.4, 
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
    
    if (error.message && (error.message.includes('429') || error.message.includes('Quota') || error.message.includes('exhausted'))) {
       errorMessage = lang === 'zh' 
        ? "⚠️ 免費 API 額度已達上限。請稍後再試（約 1 分鐘）。" 
        : "⚠️ Free API quota exceeded. Please try again in a minute.";
    }

    // Fallback in case of API error
    return {
      winnerId: game.marketData.homeWinProb > game.marketData.awayWinProb ? game.homeTeam.id : game.awayTeam.id,
      confidence: 50,
      reasoning: errorMessage,
      keyMatchupFactor: lang === 'zh' ? "API 限制" : "API Limit"
    };
  }
};
