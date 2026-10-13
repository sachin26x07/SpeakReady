import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../middleware/errorHandler';
import { AIProvider } from '../services/aiProvider';
import { generateResumeQuestions, evaluateInterviewAnswer } from '../services/aiServices';

const router = Router();

// Multer setup - store in memory for local processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, DOC, and TXT files are allowed'));
    }
  },
});

// POST /api/interview/parse-resume
router.post('/parse-resume', upload.single('resume'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  let extractedText = '';

  try {
    if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(req.file.buffer);
      extractedText = data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    } else if (ext === '.txt') {
      extractedText = req.file.buffer.toString('utf-8');
    }

    extractedText = extractedText.trim();

    if (!extractedText || extractedText.length < 50) {
      res.status(422).json({
        error: 'Could not extract meaningful text from the file. Please ensure it is not scanned/image-only.',
        code: 'EXTRACTION_FAILED',
      });
      return;
    }

    res.json({
      success: true,
      filename: req.file.originalname,
      text: extractedText,
      charCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).length,
    });
  } catch (err: any) {
    res.status(422).json({
      error: `Failed to parse resume: ${err.message}`,
      code: 'PARSE_ERROR',
    });
  }
}));

// POST /api/interview/generate-questions
router.post('/generate-questions', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    resumeText: z.string().min(50, 'Resume text must be at least 50 characters'),
    interviewType: z.string().default('mixed'),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    count: z.number().min(1).max(15).default(5),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);

  const questions = await generateResumeQuestions(
    body.resumeText,
    body.interviewType,
    body.difficulty,
    body.count,
    body.provider as AIProvider
  );
  res.json({ questions });
}));

// POST /api/interview/evaluate
router.post('/evaluate', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    question: z.string().min(1),
    answer: z.string().min(1, 'Please provide an answer'),
    resumeContext: z.string().default(''),
    language: z.enum(['english', 'hinglish']).default('english'),
    provider: z.enum(['groq', 'gemini']).default('gemini'),
  });
  const body = schema.parse(req.body);

  const evaluation = await evaluateInterviewAnswer(
    body.question,
    body.answer,
    body.resumeContext,
    body.language,
    body.provider as AIProvider
  );
  res.json({ evaluation });
}));

export default router;
