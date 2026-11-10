import { Router, Request, Response } from 'express';
import { generateBriefingPdf } from '../services/pdfService.js';
import { researchPipeline } from '../services/researchPipeline.js';
import { storage } from '../services/storageService.js';

export const briefingRouter = Router();

// GET /api/briefings
briefingRouter.get('/', (_req: Request, res: Response): void => {
  try {
    const list = storage.listBriefings();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/briefings/:id
briefingRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const briefing = storage.getBriefing(id);
    if (!briefing) {
      res.status(404).json({ error: 'Briefing not found' });
      return;
    }
    res.json(briefing);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/briefings/:id
briefingRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = storage.deleteBriefing(id);
    if (!success) {
      res.status(404).json({ error: 'Briefing not found' });
      return;
    }
    res.json({ success: true, message: 'Briefing deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/briefings/:id/regenerate
briefingRouter.post('/:id/regenerate', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await researchPipeline.regenerateBriefing(id);
    res.json({ success: true, briefing: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to regenerate briefing' });
  }
});

// GET /api/briefings/:id/pdf
briefingRouter.get('/:id/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const briefing = storage.getBriefing(id);
    if (!briefing) {
      res.status(404).json({ error: 'Briefing not found' });
      return;
    }

    const pdfBuffer = await generateBriefingPdf(briefing);
    const filename = `MeetBrief-${briefing.subjectName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${
      briefing.meetingDate
    }.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('Error generating PDF:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
});
