import type {
  AppSettings,
  ProgressData,
  DailySession,
  GrammarResult,
  ResumeData,
} from '../types';

// ============================================================
// Keys
// ============================================================

const KEYS = {
  settings: 'speakready_settings',
  progress: 'speakready_progress',
  resume: 'speakready_resume',
  recentGrammarIds: 'speakready_recent_grammar',
  recentSentences: 'speakready_recent_sentences',
} as const;

// ============================================================
// Default values
// ============================================================

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  feedbackLanguage: 'english',
  darkMode: false,
  dailyGoalMinutes: 30,
  enabledActivities: {
    reading: true,
    listening: true,
    repeat: true,
    grammar: true,
    speaking: true,
  },
  autoPlayTTS: true,
  ttsRate: 0.9,
  ttsPitch: 1,
  ttsVolume: 1,
};

const DEFAULT_PROGRESS: ProgressData = {
  streak: 0,
  lastPracticeDate: '',
  totalSessions: 0,
  totalMinutes: 0,
  grammarResults: [],
  sessions: [],
  weakAreas: [],
  recentGrammarIds: [],
  recentSentences: [],
};

// ============================================================
// Generic storage helpers
// ============================================================

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[Storage] Failed to save ${key}:`, e);
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ============================================================
// Settings
// ============================================================

export function getSettings(): AppSettings {
  const savedSettings = load<Partial<Omit<AppSettings, 'provider'>> & {
    provider?: string;
  }>(KEYS.settings, {});
  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    provider: savedSettings.provider === 'groq' || savedSettings.provider === 'gemini'
      ? savedSettings.provider
      : DEFAULT_SETTINGS.provider,
  };
}

export function saveSettings(settings: AppSettings): void {
  save(KEYS.settings, settings);
}

// ============================================================
// Progress
// ============================================================

export function getProgress(): ProgressData {
  return { ...DEFAULT_PROGRESS, ...load<Partial<ProgressData>>(KEYS.progress, {}) };
}

export function saveProgress(progress: ProgressData): void {
  save(KEYS.progress, progress);
}

export function recordGrammarResult(result: GrammarResult): void {
  const p = getProgress();
  p.grammarResults = [...(p.grammarResults || []).slice(-199), result]; // Keep last 200
  
  // Update weak areas
  if (!result.isCorrect) {
    const existing = p.weakAreas.find(w => w.topic === result.topic);
    if (existing) {
      existing.errorCount++;
      existing.lastSeen = result.timestamp;
    } else {
      p.weakAreas.push({ topic: result.topic, errorCount: 1, lastSeen: result.timestamp });
    }
  }

  // Track recent IDs
  p.recentGrammarIds = [...(p.recentGrammarIds || []).slice(-49), result.questionId];

  saveProgress(p);
}

export function recordDailySession(session: Partial<DailySession>): void {
  const p = getProgress();
  const today = new Date().toISOString().split('T')[0];
  
  const existingIndex = p.sessions.findIndex(s => s.date === today);
  if (existingIndex >= 0) {
    const existing = p.sessions[existingIndex];
    p.sessions[existingIndex] = {
      ...existing,
      minutesPracticed: existing.minutesPracticed + (session.minutesPracticed || 0),
      activitiesCompleted: [...new Set([...existing.activitiesCompleted, ...(session.activitiesCompleted || [])])],
      questionsAnswered: existing.questionsAnswered + (session.questionsAnswered || 0),
      grammarAccuracy: session.grammarAccuracy ?? existing.grammarAccuracy,
      listeningAccuracy: session.listeningAccuracy ?? existing.listeningAccuracy,
      repeatAccuracy: session.repeatAccuracy ?? existing.repeatAccuracy,
      speakingScore: session.speakingScore ?? existing.speakingScore,
    };
  } else {
    p.sessions = [...p.sessions.slice(-89), { // Keep last 90 days
      date: today,
      minutesPracticed: session.minutesPracticed || 0,
      activitiesCompleted: session.activitiesCompleted || [],
      grammarAccuracy: session.grammarAccuracy || 0,
      listeningAccuracy: session.listeningAccuracy || 0,
      repeatAccuracy: session.repeatAccuracy || 0,
      speakingScore: session.speakingScore || 0,
      questionsAnswered: session.questionsAnswered || 0,
    }];
  }

  // Update streak
  const lastDate = p.lastPracticeDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (lastDate === today) {
    // Same day, no change
  } else if (lastDate === yesterdayStr) {
    p.streak = (p.streak || 0) + 1;
  } else if (!lastDate) {
    p.streak = 1;
  } else {
    p.streak = 1; // Reset
  }
  
  p.lastPracticeDate = today;
  p.totalSessions = (p.totalSessions || 0) + (existingIndex >= 0 ? 0 : 1);
  p.totalMinutes = (p.totalMinutes || 0) + (session.minutesPracticed || 0);

  saveProgress(p);
}

export function addRecentSentence(sentence: string): void {
  const p = getProgress();
  p.recentSentences = [...(p.recentSentences || []).slice(-29), sentence];
  saveProgress(p);
}

// ============================================================
// Resume
// ============================================================

export function getResume(): ResumeData | null {
  return load<ResumeData | null>(KEYS.resume, null);
}

export function saveResume(data: ResumeData): void {
  save(KEYS.resume, data);
}

export function clearResume(): void {
  localStorage.removeItem(KEYS.resume);
}

// ============================================================
// Export / Import / Reset
// ============================================================

export function exportData(): string {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    progress: getProgress(),
    resume: getResume(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonStr: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonStr);
    if (data.settings) saveSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    if (data.progress) saveProgress({ ...DEFAULT_PROGRESS, ...data.progress });
    if (data.resume) saveResume(data.resume);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export function resetAllData(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

// ============================================================
// Today's stats helper
// ============================================================

export function getTodaySession(): DailySession | null {
  const p = getProgress();
  const today = new Date().toISOString().split('T')[0];
  return p.sessions.find(s => s.date === today) || null;
}

export function getWeeklyStats(): { dates: string[]; minutes: number[] } {
  const p = getProgress();
  const dates: string[] = [];
  const minutes: number[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);
    const session = p.sessions.find(s => s.date === dateStr);
    minutes.push(session?.minutesPracticed || 0);
  }
  
  return { dates, minutes };
}
