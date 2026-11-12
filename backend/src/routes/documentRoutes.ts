import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { documentParserService } from '../services/documentParserService.js';
import { storage } from '../services/storageService.js';
import { DocumentMetadata } from '../types/index.js';

export const documentRouter = Router();

// Configure Multer for secure document uploads
const storageConfig = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = documentParserService.sanitizeFilename(file.originalname);
    cb(null, safeName);
  },
});

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.doc', '.pptx', '.txt']);

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file max
    files: 5,                   // Maximum 5 files
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(
          `Unsupported file type "${ext}". Supported formats: PDF (.pdf), Word (.docx, .doc), PowerPoint (.pptx), and Plain Text (.txt)`
        )
      );
    }
    cb(null, true);
  },
});

// POST /api/documents/upload
documentRouter.post(
  '/upload',
  (req: Request, res: Response, next) => {
    upload.array('documents', 5)(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size limit exceeded. Maximum 10 MB per file.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Maximum 5 files allowed per research request.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message || 'File validation failed' });
      }
      next();
    });
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files were uploaded' });
        return;
      }

      const uploadedDocs: DocumentMetadata[] = [];
      const intelList = [];

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const docId = uuidv4();

        const docMeta: DocumentMetadata = {
          id: docId,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          extension: ext,
          uploadedAt: new Date().toISOString(),
          status: 'processing',
        };

        storage.saveDocument(docMeta);

        try {
          const filePath = path.join(config.uploadsDir, file.filename);
          const { pages, isScanned, requiresOcr } = await documentParserService.extractTextAndPages(
            filePath,
            ext
          );

          docMeta.pageCount = pages.length;
          docMeta.isScannedPdf = isScanned;
          docMeta.requiresOcr = requiresOcr;
          docMeta.status = 'processed';
          storage.saveDocument(docMeta);

          const intel = await documentParserService.extractIntelligence(docMeta, pages);
          storage.saveIntelligence(intel);

          uploadedDocs.push(docMeta);
          intelList.push(intel);
        } catch (extractErr: any) {
          console.error(`Failed to parse ${file.originalname}:`, extractErr);
          docMeta.status = 'error';
          docMeta.error = extractErr.message || 'Text extraction failed';
          storage.saveDocument(docMeta);
          uploadedDocs.push(docMeta);
        }
      }

      res.status(201).json({
        success: true,
        documents: uploadedDocs,
        intelligence: intelList,
      });
    } catch (err: any) {
      console.error('Error handling upload:', err);
      res.status(500).json({ error: err.message || 'Failed to process uploaded files' });
    }
  }
);

// GET /api/documents
documentRouter.get('/', (_req: Request, res: Response): void => {
  try {
    const list = storage.listDocuments();
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/documents/:id
documentRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const doc = storage.getDocument(id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    const intel = storage.getIntelligence(id);
    res.json({ document: doc, intelligence: intel });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// DELETE /api/documents/:id
documentRouter.delete('/:id', (req: Request, res: Response): void => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const success = storage.deleteDocument(id);
    if (!success) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json({ success: true, message: 'Document and extracted intelligence deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/documents/:id/reprocess
documentRouter.post('/:id/reprocess', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const doc = storage.getDocument(id);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const filePath = path.join(config.uploadsDir, doc.storedName);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Physical file no longer exists on server' });
      return;
    }

    doc.status = 'processing';
    storage.saveDocument(doc);

    const { pages, isScanned, requiresOcr } = await documentParserService.extractTextAndPages(
      filePath,
      doc.extension
    );

    doc.pageCount = pages.length;
    doc.isScannedPdf = isScanned;
    doc.requiresOcr = requiresOcr;
    doc.status = 'processed';
    doc.error = undefined;
    storage.saveDocument(doc);

    const intel = await documentParserService.extractIntelligence(doc, pages);
    storage.saveIntelligence(intel);

    res.json({ success: true, document: doc, intelligence: intel });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Reprocessing failed' });
  }
});
