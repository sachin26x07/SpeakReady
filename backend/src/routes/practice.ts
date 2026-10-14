import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { AIProvider } from '../services/aiProvider';
import {
  generateGrammarQuestions,
  generateListeningExercise,
  generateRepeatSentences,
  generateSpeakingPrompt,
  evaluateSpeakingAnswer,
  generateReadingPassage,
  generateVocabularyWords,
  compareTranscripts,
} from '../services/aiServices';

const router = Router();

// ============================================================
// Grammar
// ============================================================

router.post('/grammar/generate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    count: z.number().min(1).max(20).default(5),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    topic: z.string().default('mixed'),
    questionType: z.enum(['fill-blank', 'multiple-choice', 'error-identification', 'sentence-ordering', 'sentence-correction']).optional(),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
    recentIds: z.array(z.string()).default([]),
    recentQuestions: z.array(z.string()).default([]),
  });
  const body = schema.parse(req.body);
  const questions = await generateGrammarQuestions(
    body.count, body.difficulty, body.topic, body.provider as AIProvider, body.recentIds, body.questionType, body.recentQuestions
  );
  res.json({ questions });
}));

// ============================================================
// Listening Comprehension
// ============================================================

router.post('/listening/generate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    topic: z.string().default('workplace conversation'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);
  const exercise = await generateListeningExercise(body.difficulty, body.topic, body.provider as AIProvider);
  res.json({ exercise });
}));

// ============================================================
// Repeat Sentences
// ============================================================

router.post('/repeat/generate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    level: z.number().min(1).max(5).default(1),
    count: z.number().min(1).max(10).default(3),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
    recentSentences: z.array(z.string()).default([]),
  });
  const body = schema.parse(req.body);
  const sentences = await generateRepeatSentences(
    body.level, body.count, body.provider as AIProvider, body.recentSentences
  );
  res.json({ sentences });
}));

// POST /api/practice/repeat/compare - Transcript comparison (no AI needed)
router.post('/repeat/compare', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    original: z.string().min(1),
    transcript: z.string().min(0),
  });
  const body = schema.parse(req.body);
  const result = compareTranscripts(body.original, body.transcript);
  res.json(result);
}));

// ============================================================
// Speaking Practice
// ============================================================

router.post('/speaking/prompt', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    category: z.string().default('general'),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);
  const prompt = await generateSpeakingPrompt(body.category, body.difficulty, body.provider as AIProvider);
  res.json({ prompt });
}));

router.post('/speaking/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    question: z.string().min(1),
    transcript: z.string().min(1, 'Transcript cannot be empty'),
    language: z.enum(['english', 'hinglish']).default('english'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);
  const evaluation = await evaluateSpeakingAnswer(
    body.question, body.transcript, body.language, body.provider as AIProvider
  );
  res.json({ evaluation });
}));

// ============================================================
// Reading Aloud
// ============================================================

router.post('/reading/generate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    topic: z.string().default('workplace English'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);
  const passage = await generateReadingPassage(body.difficulty, body.topic, body.provider as AIProvider);
  res.json({ passage });
}));

// ============================================================
// Vocabulary
// ============================================================

router.post('/vocabulary/generate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    theme: z.string().default('professional communication'),
    count: z.number().min(1).max(20).default(5),
    level: z.string().default('intermediate'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);
  const words = await generateVocabularyWords(body.theme, body.count, body.level, body.provider as AIProvider);
  res.json({ words });
}));

export default router;
