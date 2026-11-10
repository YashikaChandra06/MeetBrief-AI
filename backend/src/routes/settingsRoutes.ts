import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { ollamaService } from '../services/ollamaService.js';
import { storage } from '../services/storageService.js';
import { tavilyService } from '../services/tavilyService.js';
import { SystemStatus } from '../types/index.js';

export const settingsRouter = Router();

// GET /api/settings/status
settingsRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const currentKey = config.getTavilyApiKey();
    const isConfigured = Boolean(currentKey && currentKey.trim().length > 0);

    let tavilyValidation: { valid: boolean; message: string } = {
      valid: false,
      message: 'Tavily API key is not configured',
    };

    if (isConfigured) {
      tavilyValidation = await tavilyService.validateApiKey();
    }

    const ollamaStatus = await ollamaService.getStatus();
    const stats = storage.getStats();

    const statusResponse: SystemStatus = {
      tavily: {
        configured: isConfigured,
        valid: tavilyValidation.valid,
        message: tavilyValidation.message,
      },
      ollama: {
        running: ollamaStatus.running,
        baseUrl: ollamaStatus.baseUrl,
        availableModels: ollamaStatus.availableModels,
        selectedModel: ollamaStatus.selectedModel,
        message: ollamaStatus.message,
      },
      storage: {
        status: 'ok',
        briefingsCount: stats.briefingsCount,
        jobsCount: stats.jobsCount,
      },
    };

    res.json(statusResponse);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check system status' });
  }
});

const updateSettingsSchema = z.object({
  tavilyApiKey: z.string().optional(),
  ollamaBaseUrl: z.string().url().optional(),
  ollamaModel: z.string().optional(),
});

// POST /api/settings
settingsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid settings payload', details: parsed.error.format() });
      return;
    }

    const updated = config.updateSettings(parsed.data);

    // Validate key if provided
    let tavilyStatus = { valid: false, message: 'Unchecked' };
    if (updated.tavilyApiKey) {
      tavilyStatus = await tavilyService.validateApiKey(updated.tavilyApiKey);
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        tavilyApiKeyConfigured: Boolean(updated.tavilyApiKey),
        ollamaBaseUrl: updated.ollamaBaseUrl,
        ollamaModel: updated.ollamaModel,
      },
      tavilyStatus,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

// GET /api/health
settingsRouter.get('/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

