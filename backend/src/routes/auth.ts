import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import bcrypt from 'bcryptjs';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const userRepository = AppDataSource.getRepository(User);
const userService = new UserService();

// Register
router.post('/register', async (req: any, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password || username.length < 3 || password.length < 6) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    const existing = await userRepository.findOne({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = username.toLowerCase() === 'luckmuc';
    const user = userRepository.create({
      username,
      passwordHash,
      gems: isAdmin ? 999999999 : 100, // Admin gets infinite gems
    });

    await userRepository.save(user);

    // Give starter car
    await userService.getOrCreateStarterCar(user.id);

    const token = AuthService.generateToken(user.id, user.username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        gems: user.gems,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: any, res: Response) => {
  try {
    const { username, password } = req.body;

    const user = await userRepository.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Admin mode: always ensure Luckmuc has max gems
    if (user.username.toLowerCase() === 'luckmuc' && user.gems < 999999999) {
      user.gems = 999999999;
      await userRepository.save(user);
    }

    const token = AuthService.generateToken(user.id, user.username);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        gems: user.gems,
        totalRaces: user.totalRaces,
        totalWins: user.totalWins,
        level: user.level,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await userService.getUserWithStats(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      gems: user.gems,
      totalRaces: user.totalRaces,
      totalWins: user.totalWins,
      level: user.level,
      cars: user.cars.map(c => ({
        id: c.car.id,
        name: c.car.name,
        condition: c.condition,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Change password
router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.save(user);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Change username
router.put('/change-username', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { newUsername, password } = req.body;

    if (!newUsername || newUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const user = await userRepository.findOne({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    // Check uniqueness
    const existing = await userRepository.findOne({ where: { username: newUsername } });
    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    user.username = newUsername;
    await userRepository.save(user);

    // Generate new token with updated username
    const token = AuthService.generateToken(user.id, user.username);

    res.json({ success: true, username: user.username, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change username' });
  }
});

// Search users by partial username (for Party autocomplete)
router.get('/users/search', authMiddleware, async (req: any, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (q.length < 1) return res.json([]);
    const users = await userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) LIKE :q', { q: `${q.toLowerCase()}%` })
      .select(['user.username'])
      .limit(8)
      .getMany();
    res.json(users.map(u => u.username));
  } catch {
    res.json([]);
  }
});

export default router;
