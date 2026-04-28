// backend/src/middleware/admin.ts
import { Request, Response, NextFunction } from 'express';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  
  next();
}
