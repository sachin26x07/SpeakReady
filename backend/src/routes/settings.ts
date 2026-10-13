import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { testProviderConnection, AIProvider } from '../services/aiProvider';
import { getProviderStatus, config } from '../config';

const router = Router();

// GET /api/settings/status
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    status: getProviderStatus(),
    config: {
      groqModel: config.groq.model,
      geminiModel: config.gemini.model,
    },
  });
}));

// POST /api/settings/test-connection
router.post('/test-connection', asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({ provider: z.enum(['groq', 'gemini']) });
  const { provider } = schema.parse(req.body);
  const result = await testProviderConnection(provider as AIProvider);
  res.json(result);
}));

export default router;
