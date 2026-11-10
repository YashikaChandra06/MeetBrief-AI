import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { researchPipeline } from '../services/researchPipeline.js';
import { storage } from '../services/storageService.js';

export const researchRouter = Router();

const createResearchSchema = z.object({
  subjectName: z.string().min(1, 'Subject name is required').max(200),
  subjectType: z.enum(['company', 'person']),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Meeting date must be YYYY-MM-DD'),
  meetingTime: z.string().optional(),
  meetingPurpose: z.string().max(1000).optional(),
  additionalContext: z.string().max(2000).optional(),
});

// POST /api/research
researchRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createResearchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation error',
        details: parseResult.error.format(),
      });
      return;
    }

    const job = await researchPipeline.createJob(parseResult.data);
    res.status(201).json({
      success: true,
      job,
    });
  } catch (err: any) {
    console.error('Error starting research:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/research/:id
researchRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const job = storage.getJob(id);
    if (!job) {
      res.status(404).json({ error: 'Research job not found' });
      return;
    }
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/research
researchRouter.get('/', (_req: Request, res: Response): void => {
  try {
    const jobs = storage.listJobs();
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});
