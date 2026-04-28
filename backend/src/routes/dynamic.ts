// backend/src/routes/dynamic.ts
// Dynamically generates CRUD API routes from AppConfig entities

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { validateRecord } from '../validators/recordValidator';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { notificationService } from '../services/notificationService';
import { dynamicDataService } from '../services/dynamicDataService';
import { AppConfig } from '../types/config';
import { NotFoundError, ValidationError, UnauthorizedError } from '../types/errors';

const prisma = new PrismaClient();
export const dynamicRouter = Router({ mergeParams: true });

// Middleware: load app config for this slug
dynamicRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const app = await prisma.appInstance.findUnique({
      where: { slug: req.params.appSlug },
    });

    if (!app) {
      throw new NotFoundError('Application not found');
    }

    (req as any).appInstance = app;
    (req as any).appConfig = app.config as unknown as AppConfig;
    next();
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:appSlug/data/:entityId
// List records with pagination, filtering, sorting
dynamicRouter.get('/:entityId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;
    const user = (req as any).user;

    const entity = appConfig.entities.find(e => e.id === entityId);
    if (!entity) {
      throw new NotFoundError(`Entity "${entityId}" not found in configuration`);
    }

    // Auth check
    if (appConfig.auth?.enabled) {
      const perms = entity.permissions?.read;
      if (perms && perms.length > 0 && !user) {
        throw new UnauthorizedError('Authentication required to view these records');
      }
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const search = req.query.search as string | undefined;
    const sortField = (req.query.sort as string) || 'createdAt';
    const sortDir = (req.query.dir as string) === 'asc' ? 'asc' : 'desc';
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : [];

    const result = await dynamicDataService.listRecords({
      appId: appInstance.id,
      entityId,
      page,
      pageSize,
      search,
      sortField,
      sortDir,
      userId: user?.id,
      isUserScoped: !!entity.userScoped,
      filters
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:appSlug/data/:entityId/:recordId
dynamicRouter.get('/:entityId/:recordId', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, recordId } = req.params;
    const appInstance = (req as any).appInstance;

    const record = await dynamicDataService.getRecord(appInstance.id, entityId, recordId);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// POST /api/apps/:appSlug/data/:entityId
dynamicRouter.post('/:entityId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;
    const user = (req as any).user;

    const entity = appConfig.entities.find(e => e.id === entityId);
    if (!entity) {
      throw new NotFoundError(`Entity "${entityId}" not found`);
    }

    // Validate against entity field config
    const { data, errors } = validateRecord(req.body, entity);
    if (errors.length > 0) {
      throw new ValidationError('Validation failed for record creation', errors);
    }

    const record = await dynamicDataService.createRecord({
      appId: appInstance.id,
      entityId,
      data,
      userId: user?.id,
    });

    // Trigger notifications async
    notificationService.trigger('record.created', appInstance.id, appConfig, {
      entityId,
      record,
    }).catch(console.error);

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

// PUT /api/apps/:appSlug/data/:entityId/:recordId
dynamicRouter.put('/:entityId/:recordId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, recordId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;
    const user = (req as any).user;

    const entity = appConfig.entities.find(e => e.id === entityId);
    if (!entity) {
      throw new NotFoundError(`Entity "${entityId}" not found`);
    }

    const { data, errors } = validateRecord(req.body, entity);
    if (errors.length > 0) {
      throw new ValidationError('Validation failed for record update', errors);
    }

    const updated = await dynamicDataService.updateRecord({
      appId: appInstance.id,
      entityId,
      recordId,
      data,
      userId: user?.id,
    });

    notificationService.trigger('record.updated', appInstance.id, appConfig, {
      entityId,
      record: updated,
    }).catch(console.error);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/apps/:appSlug/data/:entityId/:recordId
dynamicRouter.delete('/:entityId/:recordId', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId, recordId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;

    const entity = appConfig.entities.find(e => e.id === entityId);
    const softDelete = entity?.softDelete !== false;

    await dynamicDataService.deleteRecord(appInstance.id, entityId, recordId, softDelete);

    notificationService.trigger('record.deleted', appInstance.id, appConfig, {
      entityId,
      recordId,
    }).catch(console.error);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:appSlug/data/:entityId/export
dynamicRouter.get('/:entityId/export/csv', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entityId } = req.params;
    const appInstance = (req as any).appInstance;
    const appConfig: AppConfig = (req as any).appConfig;

    const entity = appConfig.entities.find(e => e.id === entityId);
    if (!entity) throw new NotFoundError('Entity not found');

    const result = await dynamicDataService.listRecords({
      appId: appInstance.id,
      entityId,
      page: 1,
      pageSize: 10000, // Export all for now
    });

    const fields = entity.fields.map(f => f.id);
    const headers = ['id', ...fields];
    const rows = result.data.map((r: any) => {
      return [r.id, ...fields.map(f => r[f] ?? '')].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${entityId}-export.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});
