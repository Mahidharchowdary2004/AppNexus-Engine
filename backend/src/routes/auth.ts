// backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { auth as firebaseAuth } from '../lib/firebase';

const prisma = new PrismaClient();
export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES = '7d';

function signToken(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });

    const token = signToken(user.id, user.email, user.role);
    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Account disabled' });
    }

    const token = signToken(user.id, user.email, user.role);
    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  // With JWT, client just discards token. For session invalidation, track in DB.
  res.json({ success: true });
});

// GET /api/auth/google — redirect to Google
authRouter.get('/google', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(501).json({ success: false, error: 'Google OAuth not configured' });
  }
  const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`;
  const scope = 'email profile';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

// GET /api/auth/google/callback
authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    if (!code) throw new Error('No code');

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenRes.json() as { access_token: string };

    // Get user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = await userRes.json() as { id: string; email: string; name: string; picture: string };

    // Upsert user
    let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } });
    if (!user) {
      user = await prisma.user.upsert({
        where: { email: googleUser.email },
        update: { googleId: googleUser.id, avatar: googleUser.picture, name: googleUser.name },
        create: { email: googleUser.email, googleId: googleUser.id, name: googleUser.name, avatar: googleUser.picture },
      });
    }

    const token = signToken(user.id, user.email, user.role);
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (err) {
    res.redirect(`${frontendUrl}/auth/error`);
  }
});

// POST /api/auth/firebase
authRouter.post('/firebase', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, error: 'ID Token required' });
    }

    // Verify token with Firebase Admin
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email not provided by Firebase' });
    }

    // Upsert user
    let user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    if (!user) {
      // Try to find by email if no firebaseUid exists yet
      user = await prisma.user.findUnique({ where: { email } });
      
      if (user) {
        // Link firebaseUid to existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: { firebaseUid: uid, avatar: picture || user.avatar },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            firebaseUid: uid,
            name: name || email.split('@')[0],
            avatar: picture,
            isActive: true,
            emailVerified: true,
          },
        });
      }
    }

    const token = signToken(user.id, user.email, user.role);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
      },
    });
  } catch (err: any) {
    console.error('Firebase Auth Error:', err);
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
});
