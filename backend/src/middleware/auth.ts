import { Request, Response, NextFunction } from 'express';
import { AuthService, JWTPayload } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = AuthService.extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};
