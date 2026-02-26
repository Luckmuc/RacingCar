import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Map } from '../models/Map';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const mapRepository = AppDataSource.getRepository(Map);

// Get all public maps
router.get('/', async (req, res: Response) => {
  try {
    const maps = await mapRepository.find({
      where: { isPublic: true },
    });
    res.json(maps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

// Get user's maps
router.get('/user/maps', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const maps = await mapRepository.find({
      where: { creatorId: userId },
    });
    res.json(maps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch maps' });
  }
});

// Get single map
router.get('/:mapId', async (req, res: Response) => {
  try {
    const map = await mapRepository.findOne({
      where: { id: req.params.mapId },
    });
    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch map' });
  }
});

// Create/Edit map
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, checkpoints, trackPath, obstacles, difficulty, isPublic } = req.body;
    const userId = req.user!.userId;

    if (!name || checkpoints.length < 2) {
      return res.status(400).json({ error: 'Invalid map data' });
    }

    const map = mapRepository.create({
      name,
      description,
      checkpoints,
      trackPath,
      obstacles,
      difficulty: difficulty || 3,
      isPublic: isPublic || false,
      creatorId: userId,
    });

    await mapRepository.save(map);
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save map' });
  }
});

// Update map
router.put('/:mapId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapRepository.findOne({
      where: { id: req.params.mapId },
    });

    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    if (map.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { name, description, checkpoints, trackPath, obstacles, difficulty, isPublic } = req.body;
    
    Object.assign(map, {
      name,
      description,
      checkpoints,
      trackPath,
      obstacles,
      difficulty,
      isPublic,
    });

    await mapRepository.save(map);
    res.json(map);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update map' });
  }
});

// Delete map
router.delete('/:mapId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const map = await mapRepository.findOne({
      where: { id: req.params.mapId },
    });

    if (!map) {
      return res.status(404).json({ error: 'Map not found' });
    }

    if (map.creatorId !== req.user!.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await mapRepository.remove(map);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete map' });
  }
});

export default router;
