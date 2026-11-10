import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { briefingRouter } from './routes/briefingRoutes.js';
import { researchRouter } from './routes/researchRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '5mb' }));

// Request logging in development
app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Root API Health
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'MeetBrief AI Backend',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/research', researchRouter);
app.use('/api/briefings', briefingRouter);
app.use('/api/settings', settingsRouter);

// Serve frontend static production build if available (e.g. Render, Railway, Production)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler for API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error occurred',
  });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🌲 MeetBrief AI Backend running on port ${PORT}`);
  console.log(`🌲 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌲 Settings status: http://localhost:${PORT}/api/settings/status`);
  console.log(`===============================================`);
});
