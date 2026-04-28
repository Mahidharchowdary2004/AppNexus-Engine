// backend/src/routes/admin.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const prisma = new PrismaClient();
export const adminRouter = Router();

// All admin routes require authentication and admin role
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

// GET /api/admin/users - List all users with pagination and search
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, role, isActive } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = String(role);
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              apps: true,
              records: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:id - Get single user details
adminRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        customData: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            apps: true,
            records: true,
            sessions: true,
            csvImports: true,
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Failed to fetch user:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// POST /api/admin/users - Create new user
adminRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role, isActive } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ success: false, error: 'Email and name are required' });
    }
    
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }
    
    const data: any = {
      email,
      name,
      role: role || 'user',
      isActive: isActive !== undefined ? isActive : true,
    };
    
    // Hash password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    
    const user = await prisma.user.create({ data });
    
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - Update user
adminRouter.put('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    
    // Hash password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      }
      data.passwordHash = await bcrypt.hash(password, 12);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
    
    res.json({ success: true, data: updatedUser });
  } catch (err) {
    console.error('Failed to update user:', err);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Delete user
adminRouter.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    const currentUser = (req as any).user;
    if (currentUser.id === id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    await prisma.user.delete({ where: { id } });
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
});

// GET /api/admin/stats - Get admin dashboard statistics
adminRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalApps,
      totalRecords,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.appInstance.count(),
      prisma.dynamicRecord.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        adminUsers,
        totalApps,
        totalRecords,
        recentUsers,
      },
    });
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
  }
});
