import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

// ============================================================
// Shared AI Provider Interface
// ============================================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
}

export type AIProvider = 'groq' | 'gemini';

// ============================================================
// Groq Provider
// ============================================================

function getGroqApiKey(): string {
  if (!config.groq.apiKey) {
    throw new Error('Groq API key not configured. Add GROQ_API_KEY to backend .env');
  }
  return config.groq.apiKey;
}

async function callGroq(messages: AIMessage[]): Promise<AIResponse> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getGroqApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq API request failed (${response.status}): ${errorBody}`);
  }

  const completion = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = completion.choices?.[0]?.message?.content || '';
  return { text, provider: 'groq', model: config.groq.model };
}

// ============================================================
// Gemini Provider
// ============================================================

let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!config.gemini.apiKey) {
    throw new Error('Gemini API key not configured. Add GEMINI_API_KEY to backend .env');
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return geminiClient;
}

async function callGemini(messages: AIMessage[]): Promise<AIResponse> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: config.gemini.model });

  // Separate system prompt from conversation
  const systemMsg = messages.find(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role !== 'system');

  const history = conversationMsgs.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMsg = conversationMsgs[conversationMsgs.length - 1];
  const userPrompt = systemMsg
    ? `${systemMsg.content}\n\n${lastMsg?.content || ''}`
    : lastMsg?.content || '';

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userPrompt);
  const text = result.response.text();
  return { text, provider: 'gemini', model: config.gemini.model };
}

// ============================================================
// Main dispatch function
// ============================================================

export async function callAI(
  messages: AIMessage[],
  provider: AIProvider = 'gemini'
): Promise<AIResponse> {
  try {
    if (provider === 'groq') {
      return await callGroq(messages);
    }
    return await callGemini(messages);
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    throw new Error(`AI provider "${provider}" error: ${errMsg}`);
  }
}

export async function testProviderConnection(provider: AIProvider): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await callAI(
      [
        { role: 'user', content: 'Reply with exactly: "Connection successful"' }
      ],
      provider
    );
    return { ok: true, message: result.text };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Unknown error' };
  }
}
