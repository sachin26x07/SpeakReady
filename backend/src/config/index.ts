import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  transcription: {
    apiKey: process.env.TRANSCRIPTION_API_KEY || '',
    provider: process.env.TRANSCRIPTION_PROVIDER || '',
  },

  rateLimit: {
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.AI_RATE_LIMIT_MAX || '30', 10),
  },
};

export function getProviderStatus() {
  return {
    groq: {
      configured: Boolean(config.groq.apiKey),
      model: config.groq.model,
    },
    gemini: {
      configured: Boolean(config.gemini.apiKey),
      model: config.gemini.model,
    },
    transcription: {
      configured: Boolean(config.transcription.apiKey),
      provider: config.transcription.provider,
    },
  };
}
