// backend/src/routes/csv.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { requireAuth } from '../middleware/auth';
import { validateRecord } from '../validators/recordValidator';
import { AppConfig } from '../types/config';
import { NotFoundError, ValidationError, AppError } from '../types/errors';

const prisma = new PrismaClient();
export const csvRouter = Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Middleware: load app
csvRouter.use(async (req, res, next) => {
  try {
    const app = await prisma.appInstance.findUnique({ where: { slug: req.params.appSlug } });
    if (!app) throw new NotFoundError('Application not found');
    (req as any).appInstance = app;
    (req as any).appConfig = app.config as unknown as AppConfig;
    next();
  } catch (err) {
    next(err);
  }
});

// POST /api/apps/:appSlug/csv/:entityId/preview
// Upload CSV and return column headers + first 5 rows for mapping
csvRouter.post('/:entityId/preview', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ValidationError('No file uploaded');

    const { entityId } = req.params;
    const appConfig: AppConfig = (req as any).appConfig;
    const entity = appConfig.entities.find(e => e.id === entityId);

    if (!entity) throw new NotFoundError('Entity not found');

    const rows = await parseCSV(req.file.buffer);
    if (rows.length === 0) throw new ValidationError('CSV file is empty');

    const csvHeaders = Object.keys(rows[0]);
    const previewRows = rows.slice(0, 5);

    // Auto-suggest column mappings by matching names
    const suggestedMapping: Record<string, string> = {};
    for (const header of csvHeaders) {
      const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
      const match = entity.fields.find(f =>
        f.id.toLowerCase() === normalized ||
        f.label.toLowerCase().replace(/[\s_-]/g, '') === normalized
      );
      if (match) suggestedMapping[header] = match.id;
    }

    res.json({
      success: true,
      data: {
        csvHeaders,
        previewRows,
        totalRows: rows.length,
        entityFields: entity.fields.map(f => ({ id: f.id, label: f.label, type: f.type, required: f.required })),
        suggestedMapping,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/apps/:appSlug/csv/:entityId/import
// Import with a column mapping
csvRouter.post('/:entityId/import', requireAuth, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new ValidationError('No file uploaded');

    const { entityId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;
    const user = (req as any).user;

    const entity = appConfig.entities.find(e => e.id === entityId);
    if (!entity) throw new NotFoundError('Entity not found');

    const columnMap: Record<string, string> = JSON.parse(req.body.columnMap || '{}');

    // Create import record
    const importRecord = await prisma.csvImport.create({
      data: {
        appId: appInstance.id,
        entityId,
        userId: user.id,
        filename: req.file.originalname,
        status: 'processing',
        columnMap,
      },
    });

    // Process async (respond immediately, process in background)
    res.json({ success: true, data: { importId: importRecord.id, status: 'processing' } });

    // Background processing
    processImport(importRecord.id, req.file.buffer, entity, appInstance.id, user.id, columnMap, appConfig)
      .catch(console.error);

  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:appSlug/csv/imports/:importId — poll status
csvRouter.get('/imports/:importId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const importRecord = await prisma.csvImport.findUnique({
      where: { id: req.params.importId },
    });

    if (!importRecord) throw new NotFoundError('Import not found');
    res.json({ success: true, data: importRecord });
  } catch (err) {
    next(err);
  }
});

async function processImport(
  importId: string,
  buffer: Buffer,
  entity: AppConfig['entities'][0],
  appId: string,
  userId: string,
  columnMap: Record<string, string>,
  appConfig: AppConfig
) {
  let importedRows = 0;
  let failedRows = 0;
  const errors: { row: number; error: string }[] = [];

  try {
    const rows = await parseCSV(buffer);

    await prisma.csvImport.update({
      where: { id: importId },
      data: { totalRows: rows.length },
    });

    // Batch insert
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const records: object[] = [];

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNum = i + j + 2; // 1-indexed + header row

        // Apply column mapping
        const mapped: Record<string, unknown> = {};
        for (const [csvCol, entityField] of Object.entries(columnMap)) {
          if (row[csvCol] !== undefined && row[csvCol] !== '') {
            mapped[entityField] = row[csvCol];
          }
        }

        // Validate
        const { data, errors: valErrors } = validateRecord(mapped, entity);
        if (valErrors.length > 0) {
          failedRows++;
          errors.push({ row: rowNum, error: valErrors.map(e => e.message).join('; ') });
          continue;
        }

        records.push({ appId, entityId: entity.id, data, createdBy: userId, updatedBy: userId });
        importedRows++;
      }

      if (records.length > 0) {
        await prisma.dynamicRecord.createMany({ data: records as any });
      }
    }

    await prisma.csvImport.update({
      where: { id: importId },
      data: { status: 'done', importedRows, failedRows, errors },
    });
  } catch (err) {
    await prisma.csvImport.update({
      where: { id: importId },
      data: { status: 'failed', errors: [{ row: 0, error: String(err) }] },
    });
  }
}

function parseCSV(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    Readable.from(buffer)
      .pipe(parse({ columns: true, skip_empty_lines: true, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}
