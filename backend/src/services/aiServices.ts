import { callAI, AIProvider } from './aiProvider';
import { z } from 'zod';

// ============================================================
// Helper to parse JSON from AI response (strips markdown fences)
// ============================================================

function extractJSON(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
  if (start !== -1) {
    const lastBrace = text.lastIndexOf('}');
    const lastBracket = text.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end !== -1) return text.slice(start, end + 1);
  }
  return text.trim();
}

async function callAndParseJSON<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  provider: AIProvider,
  systemPrompt?: string
): Promise<T> {
  const messages = systemPrompt
    ? [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt },
      ]
    : [{ role: 'user' as const, content: prompt }];

  const response = await callAI(messages, provider);
  const jsonStr = extractJSON(response.text);
  const parsed = JSON.parse(jsonStr);
  return schema.parse(parsed);
}

// ============================================================
// Grammar Practice
// ============================================================

const GrammarQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['fill-blank', 'multiple-choice', 'error-identification', 'sentence-ordering', 'sentence-correction']),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
  explanation: z.string(),
  rule: z.string(),
  examples: z.array(z.string()),
  topic: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

const GrammarBatchSchema = z.object({
  questions: z.array(GrammarQuestionSchema),
});

export type GrammarQuestion = z.infer<typeof GrammarQuestionSchema>;

export async function generateGrammarQuestions(
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  topic: string,
  provider: AIProvider,
  recentIds: string[] = [],
  questionType?: GrammarQuestion['type'],
  recentQuestions: string[] = []
): Promise<GrammarQuestion[]> {
  const avoidHint = recentIds.length > 0 ? `Avoid repeating questions with IDs: ${recentIds.slice(-10).join(', ')}.` : '';
  const avoidQuestionHint = recentQuestions.length > 0
    ? `At least 70% of this batch must use question wording different from these recent questions. Avoid repeating or lightly rephrasing them:\n${recentQuestions.slice(-10).map(question => `- ${question}`).join('\n')}`
    : '';
  const typeHint = questionType
    ? `Every question must have the type "${questionType}". Do not generate questions of any other type.`
    : 'Types to include: fill-blank, multiple-choice, error-identification, sentence-correction, sentence-ordering.';
  const prompt = `Generate ${count} English grammar practice questions for a student preparing for Cognizant GenC English assessment.
Difficulty: ${difficulty}. Topic focus: ${topic}.
${avoidHint}
${avoidQuestionHint}

Each question must have a unique id (short slug like "tense-q1-abc").
${typeHint}
For multiple-choice include exactly 4 options.
For every multiple-choice question, set "answer" to the exact full text of the correct option, not its letter or position.
For fill-blank, mark the blank with _____.
Do NOT include the answer in the question text.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "multiple-choice",
      "question": "...",
      "options": ["will have completed", "completed", "will complete", "has completed"],
      "answer": "will have completed",
      "explanation": "Detailed grammar explanation...",
      "rule": "The grammar rule name/concept",
      "examples": ["Example 1", "Example 2"],
      "topic": "Tenses",
      "difficulty": "${difficulty}"
    }
  ]
}`;

  const result = await callAndParseJSON(prompt, GrammarBatchSchema, provider);
  return result.questions;
}

// ============================================================
// Listening Comprehension
// ============================================================

const ListeningExerciseSchema = z.object({
  id: z.string(),
  passage: z.string(),
  context: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    type: z.enum(['multiple-choice', 'short-answer']),
    options: z.array(z.string()).optional(),
    answer: z.string(),
    explanation: z.string(),
  })),
  vocabulary: z.array(z.object({
    word: z.string(),
    meaning: z.string(),
    pronunciation_hint: z.string(),
  })).optional(),
});

export type ListeningExercise = z.infer<typeof ListeningExerciseSchema>;

export async function generateListeningExercise(
  difficulty: 'easy' | 'medium' | 'hard',
  topic: string,
  provider: AIProvider
): Promise<ListeningExercise> {
  const prompt = `Generate an English listening comprehension exercise for a student preparing for Cognizant GenC assessment.
Difficulty: ${difficulty}. Topic: ${topic}.

Create a realistic short passage (3-6 sentences for easy, 6-10 for medium, 10-15 for hard) that could be read aloud.
Include 2-3 comprehension questions.
For multiple-choice questions, set "answer" to the exact full text of the correct option, not its letter or position.

Return ONLY valid JSON:
{
  "id": "listening-abc123",
  "passage": "The full passage text...",
  "context": "Brief context about this passage (e.g., workplace announcement, conversation)",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": "q1",
      "question": "What is the main idea?",
      "type": "multiple-choice",
      "options": ["A...", "B...", "C...", "D..."],
      "answer": "A...",
      "explanation": "The passage says..."
    }
  ],
  "vocabulary": [
    {
      "word": "example",
      "meaning": "a thing that represents...",
      "pronunciation_hint": "eg-ZAM-pul"
    }
  ]
}`;

  return await callAndParseJSON(prompt, ListeningExerciseSchema, provider);
}

// ============================================================
// Repeat Sentences
// ============================================================

const RepeatSentenceSchema = z.object({
  id: z.string(),
  sentence: z.string(),
  level: z.number().min(1).max(5),
  topic: z.string(),
  phonetic_hint: z.string().optional(),
});

const RepeatSentenceBatchSchema = z.object({
  sentences: z.array(RepeatSentenceSchema),
});

export type RepeatSentence = z.infer<typeof RepeatSentenceSchema>;

export async function generateRepeatSentences(
  level: number,
  count: number,
  provider: AIProvider,
  recentSentences: string[] = []
): Promise<RepeatSentence[]> {
  const wordRange = level === 1 ? '3-5' : level === 2 ? '6-10' : level === 3 ? '11-15' : level === 4 ? '15-20' : '20-30';
  const style = level <= 2 ? 'simple everyday English' : level <= 3 ? 'workplace and formal English' : 'complex conversational and instructional English';
  const avoidHint = recentSentences.length > 0 ? `Do not repeat these sentences: ${recentSentences.slice(-5).join(' | ')}` : '';

  const prompt = `Generate ${count} English sentences for "listen and repeat" practice.
Level ${level}: ${wordRange} words. Style: ${style}.
${avoidHint}

Return ONLY valid JSON:
{
  "sentences": [
    {
      "id": "sent-abc",
      "sentence": "The complete sentence here.",
      "level": ${level},
      "topic": "workplace / everyday / formal",
      "phonetic_hint": "optional hint for difficult words"
    }
  ]
}`;

  const result = await callAndParseJSON(prompt, RepeatSentenceBatchSchema, provider);
  return result.sentences;
}

// ============================================================
// Speaking Practice
// ============================================================

const SpeakingPromptSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: z.string(),
  hints: z.array(z.string()),
  example_points: z.array(z.string()),
  follow_up: z.string(),
});

export type SpeakingPrompt = z.infer<typeof SpeakingPromptSchema>;

export async function generateSpeakingPrompt(
  category: string,
  difficulty: 'easy' | 'medium' | 'hard',
  provider: AIProvider
): Promise<SpeakingPrompt> {
  const prompt = `Generate one English speaking practice question for a student preparing for Cognizant GenC interview/assessment.
Category: ${category}. Difficulty: ${difficulty}.

Return ONLY valid JSON:
{
  "id": "speak-abc",
  "question": "The speaking question...",
  "category": "${category}",
  "hints": ["Think about...", "Mention...", "Consider..."],
  "example_points": ["Key point 1 to cover", "Key point 2"],
  "follow_up": "A follow-up question based on the main question"
}`;

  return await callAndParseJSON(prompt, SpeakingPromptSchema, provider);
}

// ============================================================
// Evaluate Speaking Answer
// ============================================================

const SpeakingEvaluationSchema = z.object({
  overall_score: z.number().min(0).max(10),
  scores: z.object({
    relevance: z.number().min(0).max(10),
    organization: z.number().min(0).max(10),
    grammar: z.number().min(0).max(10),
    vocabulary: z.number().min(0).max(10),
    completeness: z.number().min(0).max(10),
    clarity: z.number().min(0).max(10),
  }),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corrected_sentences: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    explanation: z.string(),
  })),
  model_answer: z.string(),
  tips: z.array(z.string()),
  follow_up_question: z.string(),
  fillers_detected: z.array(z.string()),
  feedback_summary: z.string(),
});

export type SpeakingEvaluation = z.infer<typeof SpeakingEvaluationSchema>;

export async function evaluateSpeakingAnswer(
  question: string,
  transcript: string,
  language: 'english' | 'hinglish',
  provider: AIProvider
): Promise<SpeakingEvaluation> {
  const langNote = language === 'hinglish'
    ? 'Provide feedback in a mix of Hindi and English (Hinglish) so the student can understand easily.'
    : 'Provide feedback in clear, simple English.';

  const prompt = `You are an English communication trainer evaluating a student's spoken response.
${langNote}

Question asked: "${question}"

Student's transcript: "${transcript}"

Evaluate the response carefully. Score each dimension 0-10. Identify filler words (um, uh, like, you know, basically, etc.).
Suggest corrections for grammatically incorrect sentences only.
Write a model answer that demonstrates an ideal response.

Return ONLY valid JSON:
{
  "overall_score": 7,
  "scores": {
    "relevance": 8,
    "organization": 7,
    "grammar": 6,
    "vocabulary": 7,
    "completeness": 7,
    "clarity": 8
  },
  "strengths": ["Good point 1", "Good point 2"],
  "improvements": ["Needs improvement 1", "Needs improvement 2"],
  "corrected_sentences": [
    {
      "original": "I am go to office",
      "corrected": "I go to the office",
      "explanation": "Use base form after subject"
    }
  ],
  "model_answer": "A natural, well-organized model answer...",
  "tips": ["Tip 1", "Tip 2", "Tip 3"],
  "follow_up_question": "Tell me more about...",
  "fillers_detected": ["um", "like"],
  "feedback_summary": "Brief overall feedback in 2-3 sentences"
}`;

  return await callAndParseJSON(prompt, SpeakingEvaluationSchema, provider);
}

// ============================================================
// Resume-Based Interview Questions
// ============================================================

const InterviewQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['hr', 'technical', 'project', 'behavioral', 'cross-question']),
  resume_reference: z.string(),
  follow_up: z.string(),
  what_to_cover: z.array(z.string()),
});

const InterviewBatchSchema = z.object({
  questions: z.array(InterviewQuestionSchema),
});

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export async function generateResumeQuestions(
  resumeText: string,
  interviewType: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  count: number,
  provider: AIProvider
): Promise<InterviewQuestion[]> {
  const prompt = `You are an experienced interviewer at a top IT company (like Cognizant).
Based on the candidate's resume below, generate ${count} interview questions.

Interview type: ${interviewType}
Difficulty: ${difficulty}

IMPORTANT: Only ask about skills, projects, education, and experience that are ACTUALLY mentioned in the resume. Do not invent anything.

Resume text:
---
${resumeText.slice(0, 3000)}
---

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "iq-abc",
      "question": "Tell me about the React project you mentioned...",
      "type": "project",
      "resume_reference": "The specific part of the resume this references",
      "follow_up": "A follow-up question",
      "what_to_cover": ["Mention this", "Explain that", "Describe the challenge"]
    }
  ]
}`;

  const result = await callAndParseJSON(prompt, InterviewBatchSchema, provider);
  return result.questions;
}

// ============================================================
// Evaluate Interview Answer
// ============================================================

const InterviewEvaluationSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z.string(),
  strengths: z.array(z.string()),
  missing_points: z.array(z.string()),
  grammar_issues: z.array(z.object({
    original: z.string(),
    corrected: z.string(),
    rule: z.string(),
  })),
  suggested_answer: z.string(),
  follow_up_question: z.string(),
});

export type InterviewEvaluation = z.infer<typeof InterviewEvaluationSchema>;

export async function evaluateInterviewAnswer(
  question: string,
  answer: string,
  resumeContext: string,
  language: 'english' | 'hinglish',
  provider: AIProvider
): Promise<InterviewEvaluation> {
  const langNote = language === 'hinglish'
    ? 'Give feedback in Hinglish (mix of Hindi and English).'
    : 'Give feedback in simple English.';

  const prompt = `You are an interviewer evaluating a candidate's interview answer.
${langNote}

Question: "${question}"
Candidate's answer: "${answer}"
Resume context: "${resumeContext.slice(0, 1000)}"

Evaluate: accuracy, completeness, clarity, grammar, and relevance.
Suggest a better answer only using facts from the resume and the candidate's answer.

Return ONLY valid JSON:
{
  "score": 7,
  "feedback": "Overall feedback...",
  "strengths": ["Good point 1"],
  "missing_points": ["Should have mentioned X"],
  "grammar_issues": [
    {
      "original": "incorrect sentence",
      "corrected": "correct sentence",
      "rule": "Grammar rule"
    }
  ],
  "suggested_answer": "A better structured answer...",
  "follow_up_question": "Can you explain..."
}`;

  return await callAndParseJSON(prompt, InterviewEvaluationSchema, provider);
}

// ============================================================
// Reading Passage
// ============================================================

const ReadingPassageSchema = z.object({
  id: z.string(),
  title: z.string(),
  passage: z.string(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  topic: z.string(),
  word_count: z.number(),
  difficult_words: z.array(z.object({
    word: z.string(),
    pronunciation: z.string(),
    meaning: z.string(),
  })),
  reading_tips: z.array(z.string()),
});

export type ReadingPassage = z.infer<typeof ReadingPassageSchema>;

export async function generateReadingPassage(
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  topic: string,
  provider: AIProvider
): Promise<ReadingPassage> {
  const wordCount = difficulty === 'beginner' ? '60-80' : difficulty === 'intermediate' ? '100-130' : '150-200';
  const prompt = `Generate an English reading passage for a student to practice reading aloud.
Difficulty: ${difficulty}. Topic: ${topic}. Length: ${wordCount} words.

Use natural, flowing English that sounds good when read aloud. Avoid very short choppy sentences.

Return ONLY valid JSON:
{
  "id": "read-abc",
  "title": "Passage title",
  "passage": "The full passage text...",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "word_count": 80,
  "difficult_words": [
    {
      "word": "example",
      "pronunciation": "eg-ZAM-pul",
      "meaning": "a representative instance"
    }
  ],
  "reading_tips": ["Tip about pacing", "Tip about pausing at commas"]
}`;

  return await callAndParseJSON(prompt, ReadingPassageSchema, provider);
}

// ============================================================
// Vocabulary Builder
// ============================================================

const VocabularyWordSchema = z.object({
  word: z.string(),
  pronunciation: z.string(),
  part_of_speech: z.string(),
  definition: z.string(),
  simple_definition: z.string(),
  examples: z.array(z.string()),
  synonyms: z.array(z.string()),
  antonyms: z.array(z.string()),
  usage_tip: z.string(),
  memory_trick: z.string(),
});

const VocabularyBatchSchema = z.object({
  words: z.array(VocabularyWordSchema),
});

export type VocabularyWord = z.infer<typeof VocabularyWordSchema>;

export async function generateVocabularyWords(
  theme: string,
  count: number,
  level: string,
  provider: AIProvider
): Promise<VocabularyWord[]> {
  const prompt = `Generate ${count} English vocabulary words useful for a student preparing for Cognizant GenC interview and improving communication.
Theme: ${theme}. Level: ${level}.

Return ONLY valid JSON:
{
  "words": [
    {
      "word": "articulate",
      "pronunciation": "aar-TIK-yoo-lit",
      "part_of_speech": "adjective/verb",
      "definition": "Having or showing the ability to speak fluently and coherently",
      "simple_definition": "Able to express thoughts clearly",
      "examples": ["She is very articulate during interviews.", "He articulated his ideas well."],
      "synonyms": ["eloquent", "fluent", "expressive"],
      "antonyms": ["inarticulate", "unclear"],
      "usage_tip": "Use this word when describing someone who speaks very clearly and confidently",
      "memory_trick": "Think of 'article' + 'late' = writing articles clearly"
    }
  ]
}`;

  const result = await callAndParseJSON(prompt, VocabularyBatchSchema, provider);
  return result.words;
}

// ============================================================
// Transcript Comparison (word-by-word diff)
// ============================================================

export interface WordDiff {
  word: string;
  status: 'correct' | 'omitted' | 'substituted' | 'extra';
  expected?: string;
}

export function compareTranscripts(original: string, transcript: string): {
  diffs: WordDiff[];
  accuracy: number;
  omitted: string[];
  substituted: { expected: string; got: string }[];
  extra: string[];
} {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s']/g, '').trim();
  const origWords = normalize(original).split(/\s+/).filter(Boolean);
  const transWords = normalize(transcript).split(/\s+/).filter(Boolean);

  // Simple LCS-based diff
  const diffs: WordDiff[] = [];
  const omitted: string[] = [];
  const substituted: { expected: string; got: string }[] = [];
  const extra: string[] = [];

  let i = 0, j = 0;
  while (i < origWords.length || j < transWords.length) {
    if (i >= origWords.length) {
      diffs.push({ word: transWords[j], status: 'extra' });
      extra.push(transWords[j]);
      j++;
    } else if (j >= transWords.length) {
      diffs.push({ word: origWords[i], status: 'omitted' });
      omitted.push(origWords[i]);
      i++;
    } else if (origWords[i] === transWords[j]) {
      diffs.push({ word: origWords[i], status: 'correct' });
      i++;
      j++;
    } else {
      // Check if word was omitted (look ahead)
      const nextMatchInTrans = transWords.slice(j).findIndex(w => w === origWords[i]);
      const nextMatchInOrig = origWords.slice(i).findIndex(w => w === transWords[j]);

      if (nextMatchInTrans !== -1 && (nextMatchInOrig === -1 || nextMatchInTrans <= nextMatchInOrig)) {
        diffs.push({ word: transWords[j], status: 'extra' });
        extra.push(transWords[j]);
        j++;
      } else if (nextMatchInOrig !== -1) {
        diffs.push({ word: origWords[i], status: 'omitted' });
        omitted.push(origWords[i]);
        i++;
      } else {
        diffs.push({ word: transWords[j], status: 'substituted', expected: origWords[i] });
        substituted.push({ expected: origWords[i], got: transWords[j] });
        i++;
        j++;
      }
    }
  }

  const correct = diffs.filter(d => d.status === 'correct').length;
  const accuracy = origWords.length > 0 ? Math.round((correct / origWords.length) * 100) : 0;

  return { diffs, accuracy, omitted, substituted, extra };
}
