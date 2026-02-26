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
    const user = userRepository.create({
      username,
      passwordHash,
      gems: 100, // Starting gems
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

export default router;
