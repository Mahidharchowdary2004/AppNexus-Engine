// backend/src/routes/apps.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { validateAndNormalizeConfig } from '../services/configValidator';
import { notificationService } from '../services/notificationService';
import { NotFoundError, ForbiddenError, ValidationError } from '../types/errors';

const prisma = new PrismaClient();
export const appsRouter = Router();

// GET /api/apps — list user's apps (Admins see all)
appsRouter.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    // If admin, show all active apps. If user, show only owned apps.
    const filter = user.role === 'admin' ? { isActive: true } : { ownerId: user.id, isActive: true };
    
    const apps = await prisma.appInstance.findMany({
      where: filter,
      select: { 
        id: true, 
        slug: true, 
        name: true, 
        createdAt: true, 
        updatedAt: true,
        owner: { select: { email: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ success: true, data: apps });
  } catch (err) {
    next(err);
  }
});

// POST /api/apps — create app from config
appsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const rawConfig = req.body;

    const result = validateAndNormalizeConfig(rawConfig);

    if (!result.valid) {
      throw new ValidationError('Application configuration is invalid', result.errors);
    }

    const config = result.normalized;
    const slug = await generateUniqueSlug(config.id);
    const configHash = crypto.createHash('md5').update(JSON.stringify(config)).digest('hex');

    const app = await prisma.appInstance.create({
      data: {
        slug,
        name: config.name,
        config: config as object,
        configHash,
        ownerId: user.id,
      },
    });

    // Trigger notification
    notificationService.trigger('system.app_created', app.id, config, {
      userId: user.id,
      userName: user.name,
      appSlug: app.slug,
      appName: app.name,
    }).catch(console.error);

    res.status(201).json({
      success: true,
      data: { id: app.id, slug: app.slug, name: app.name },
      warnings: result.warnings,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:slug — get app config + metadata
appsRouter.get('/:slug', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const app = await prisma.appInstance.findUnique({
      where: { slug: req.params.slug },
    });

    if (!app) throw new NotFoundError('Application not found');

    res.json({ success: true, data: { id: app.id, slug: app.slug, name: app.name, config: app.config } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/apps/:slug — update config
appsRouter.put('/:slug', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const app = await prisma.appInstance.findUnique({ where: { slug: req.params.slug } });

    if (!app) throw new NotFoundError('Application not found');
    
    // Check ownership or admin status
    if (app.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to update this application');
    }

    const result = validateAndNormalizeConfig(req.body);

    if (!result.valid) {
      throw new ValidationError('Updated configuration is invalid', result.errors);
    }

    const config = result.normalized;
    const configHash = crypto.createHash('md5').update(JSON.stringify(config)).digest('hex');

    if (configHash === app.configHash) {
      return res.json({ success: true, data: { unchanged: true }, warnings: result.warnings });
    }

    await prisma.appInstance.update({
      where: { id: app.id },
      data: { config: config as object, configHash, name: config.name },
    });

    res.json({ success: true, warnings: result.warnings });
  } catch (err) {
    next(err);
  }
});

// GET /api/apps/:slug/notifications — get notification logs
appsRouter.get('/:slug/notifications', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const app = await prisma.appInstance.findUnique({ where: { slug: req.params.slug } });

    if (!app) throw new NotFoundError('Application not found');
    if (app.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    const logs = await prisma.notificationLog.findMany({
      where: { appId: app.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/apps/:slug
appsRouter.delete('/:slug', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const app = await prisma.appInstance.findUnique({ where: { slug: req.params.slug } });

    if (!app) throw new NotFoundError('Application not found');
    
    if (app.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to delete this application');
    }

    await prisma.appInstance.update({ where: { id: app.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/apps/validate — validate config without creating
appsRouter.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = validateAndNormalizeConfig(req.body);
    res.json({
      success: true,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      normalized: result.normalized,
    });
  } catch (err) {
    next(err);
  }
});

async function generateUniqueSlug(base: string): Promise<string> {
  const clean = base.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
  const existing = await prisma.appInstance.findUnique({ where: { slug: clean } });
  if (!existing) return clean;
  return `${clean}-${Math.random().toString(36).slice(2, 7)}`;
}
