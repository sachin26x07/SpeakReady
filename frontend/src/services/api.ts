const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ============================================================
// Generic fetch wrapper
// ============================================================

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data.error || data.message || `Request failed with status ${res.status}`;
    const err = new Error(errMsg) as any;
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data as T;
}

// ============================================================
// Settings APIs
// ============================================================

export async function checkProviderStatus() {
  return apiFetch<{
    status: {
      groq: { configured: boolean; model: string };
      gemini: { configured: boolean; model: string };
    };
    config: { groqModel: string; geminiModel: string };
  }>('/api/settings/status');
}

export async function testConnection(provider: 'groq' | 'gemini') {
  return apiFetch<{ ok: boolean; message: string }>('/api/settings/test-connection', {
    method: 'POST',
    body: JSON.stringify({ provider }),
  });
}

// ============================================================
// Grammar APIs
// ============================================================

export async function generateGrammar(params: {
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  provider: string;
  recentIds?: string[];
}) {
  return apiFetch<{ questions: any[] }>('/api/practice/grammar/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Listening APIs
// ============================================================

export async function generateListening(params: {
  difficulty?: 'easy' | 'medium' | 'hard';
  topic?: string;
  provider: string;
}) {
  return apiFetch<{ exercise: any }>('/api/practice/listening/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Repeat Sentences APIs
// ============================================================

export async function generateRepeatSentences(params: {
  level?: number;
  count?: number;
  provider: string;
  recentSentences?: string[];
}) {
  return apiFetch<{ sentences: any[] }>('/api/practice/repeat/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function compareTranscript(params: { original: string; transcript: string }) {
  return apiFetch<{
    diffs: any[];
    accuracy: number;
    omitted: string[];
    substituted: any[];
    extra: string[];
  }>('/api/practice/repeat/compare', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Speaking APIs
// ============================================================

export async function getSpeakingPrompt(params: {
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  provider: string;
}) {
  return apiFetch<{ prompt: any }>('/api/practice/speaking/prompt', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function evaluateSpeaking(params: {
  question: string;
  transcript: string;
  language?: string;
  provider: string;
}) {
  return apiFetch<{ evaluation: any }>('/api/practice/speaking/evaluate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Reading APIs
// ============================================================

export async function generateReading(params: {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
  provider: string;
}) {
  return apiFetch<{ passage: any }>('/api/practice/reading/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Vocabulary APIs
// ============================================================

export async function generateVocabulary(params: {
  theme?: string;
  count?: number;
  level?: string;
  provider: string;
}) {
  return apiFetch<{ words: any[] }>('/api/practice/vocabulary/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================================
// Interview APIs
// ============================================================

export async function parseResume(file: File) {
  const formData = new FormData();
  formData.append('resume', file);
  const res = await fetch(`${API_BASE}/api/interview/parse-resume`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to parse resume');
  return data as { success: boolean; filename: string; text: string; charCount: number; wordCount: number };
}

export async function generateInterviewQuestions(params: {
  resumeText: string;
  interviewType?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  count?: number;
  provider: string;
}) {
  return apiFetch<{ questions: any[] }>('/api/interview/generate-questions', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function evaluateInterview(params: {
  question: string;
  answer: string;
  resumeContext?: string;
  language?: string;
  provider: string;
}) {
  return apiFetch<{ evaluation: any }>('/api/interview/evaluate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
