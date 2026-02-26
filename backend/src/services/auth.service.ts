import jwt from 'jsonwebtoken';
import { GAME_CONFIG } from '../config/gameConfig';

export interface JWTPayload {
  userId: string;
  username: string;
}

export class AuthService {
  static generateToken(userId: string, username: string): string {
    return jwt.sign(
      { userId, username } as JWTPayload,
      GAME_CONFIG.JWT_SECRET,
      { expiresIn: GAME_CONFIG.JWT_EXPIRE }
    );
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, GAME_CONFIG.JWT_SECRET) as JWTPayload;
    } catch {
      return null;
    }
  }

  static extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
  }
}
