import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Race } from '../models/Race';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const raceRepository = AppDataSource.getRepository(Race);

// Get leaderboard for a map
router.get('/:mapId', async (req, res: Response) => {
  try {
    const { mapId } = req.params;
    const { limit = 10 } = req.query;

    const leaderboard = await raceRepository.query(
      `
      SELECT 
        u.id,
        u.username,
        MIN(r."finishTime") as "finishTime",
        ROW_NUMBER() OVER (ORDER BY MIN(r."finishTime") ASC) as position
      FROM races r
      JOIN users u ON r."userId" = u.id
      WHERE r."mapId" = $1
      GROUP BY u.id, u.username
      ORDER BY "finishTime" ASC
      LIMIT $2
      `,
      [mapId, limit]
    );

    res.json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user position on a specific map
router.get('/:mapId/user/:userId', async (req, res: Response) => {
  try {
    const { mapId, userId } = req.params;

    const userPosition = await raceRepository.query(
      `
      SELECT 
        u.id,
        u.username,
        MIN(r."finishTime") as "finishTime",
        ROW_NUMBER() OVER (ORDER BY MIN(r."finishTime") ASC) as position
      FROM races r
      JOIN users u ON r."userId" = u.id
      WHERE r."mapId" = $1
      GROUP BY u.id, u.username
      HAVING u.id = $2
      `,
      [mapId, userId]
    );

    res.json(userPosition.length > 0 ? userPosition[0] : null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch position' });
  }
});

// Get global leaderboard (best racers)
router.get('/global/top', async (req, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const global = await raceRepository.query(
      `
      SELECT 
        u.id,
        u.username,
        u."totalWins",
        COUNT(r.id) as races,
        AVG(r."finishTime") as "avgTime"
      FROM users u
      LEFT JOIN races r ON u.id = r."userId"
      GROUP BY u.id, u.username, u."totalWins"
      ORDER BY u."totalWins" DESC, "avgTime" ASC
      LIMIT $1
      `,
      [limit]
    );

    res.json(global);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch global leaderboard' });
  }
});

// Save race result
router.post('/race/save', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { mapId, finishTime, position, carId, mode } = req.body;
    const userId = req.user!.userId;

    const race = raceRepository.create({
      userId,
      mapId,
      finishTime,
      position,
      carId,
      mode,
      gemsEarned: Math.floor(finishTime / 1000), // Simple gem calculation
    });

    await raceRepository.save(race);

    res.json({ success: true, gemsEarned: race.gemsEarned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save race' });
  }
});

export default router;
