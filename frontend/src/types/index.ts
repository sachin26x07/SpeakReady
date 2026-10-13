// ============================================================
// AI Provider types
// ============================================================

export type AIProvider = 'groq' | 'gemini';
export type FeedbackLanguage = 'english' | 'hinglish';

export interface AppSettings {
  provider: AIProvider;
  feedbackLanguage: FeedbackLanguage;
  darkMode: boolean;
  dailyGoalMinutes: number;
  enabledActivities: {
    reading: boolean;
    listening: boolean;
    repeat: boolean;
    grammar: boolean;
    speaking: boolean;
  };
  autoPlayTTS: boolean;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
}

// ============================================================
// Practice session types
// ============================================================

export type Difficulty = 'easy' | 'medium' | 'hard';
export type ReadingDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface GrammarQuestion {
  id: string;
  type: 'fill-blank' | 'multiple-choice' | 'error-identification' | 'sentence-ordering' | 'sentence-correction';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  rule: string;
  examples: string[];
  topic: string;
  difficulty: Difficulty;
}

export interface GrammarResult {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topic: string;
  timestamp: number;
}

export interface ListeningQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer';
  options?: string[];
  answer: string;
  explanation: string;
}

export interface VocabularyItem {
  word: string;
  meaning: string;
  pronunciation_hint: string;
}

export interface ListeningExercise {
  id: string;
  passage: string;
  context: string;
  difficulty: Difficulty;
  questions: ListeningQuestion[];
  vocabulary?: VocabularyItem[];
}

export interface RepeatSentence {
  id: string;
  sentence: string;
  level: number;
  topic: string;
  phonetic_hint?: string;
}

export interface WordDiff {
  word: string;
  status: 'correct' | 'omitted' | 'substituted' | 'extra';
  expected?: string;
}

export interface TranscriptComparison {
  diffs: WordDiff[];
  accuracy: number;
  omitted: string[];
  substituted: { expected: string; got: string }[];
  extra: string[];
}

export interface SpeakingPrompt {
  id: string;
  question: string;
  category: string;
  hints: string[];
  example_points: string[];
  follow_up: string;
}

export interface SpeakingEvaluation {
  overall_score: number;
  scores: {
    relevance: number;
    organization: number;
    grammar: number;
    vocabulary: number;
    completeness: number;
    clarity: number;
  };
  strengths: string[];
  improvements: string[];
  corrected_sentences: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  model_answer: string;
  tips: string[];
  follow_up_question: string;
  fillers_detected: string[];
  feedback_summary: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  passage: string;
  difficulty: ReadingDifficulty;
  topic: string;
  word_count: number;
  difficult_words: { word: string; pronunciation: string; meaning: string }[];
  reading_tips: string[];
}

export interface VocabularyWord {
  word: string;
  pronunciation: string;
  part_of_speech: string;
  definition: string;
  simple_definition: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  usage_tip: string;
  memory_trick: string;
}

// ============================================================
// Interview types
// ============================================================

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'hr' | 'technical' | 'project' | 'behavioral' | 'cross-question';
  resume_reference: string;
  follow_up: string;
  what_to_cover: string[];
}

export interface InterviewEvaluation {
  score: number;
  feedback: string;
  strengths: string[];
  missing_points: string[];
  grammar_issues: { original: string; corrected: string; rule: string }[];
  suggested_answer: string;
  follow_up_question: string;
}

// ============================================================
// Progress tracking types
// ============================================================

export interface DailySession {
  date: string; // YYYY-MM-DD
  minutesPracticed: number;
  activitiesCompleted: string[];
  grammarAccuracy: number;
  listeningAccuracy: number;
  repeatAccuracy: number;
  speakingScore: number;
  questionsAnswered: number;
}

export interface WeakArea {
  topic: string;
  errorCount: number;
  lastSeen: number;
}

export interface ProgressData {
  streak: number;
  lastPracticeDate: string;
  totalSessions: number;
  totalMinutes: number;
  grammarResults: GrammarResult[];
  sessions: DailySession[];
  weakAreas: WeakArea[];
  recentGrammarIds: string[];
  recentSentences: string[];
}

// ============================================================
// Resume types
// ============================================================

export interface ResumeData {
  filename: string;
  text: string;
  wordCount: number;
  uploadedAt: number;
}
