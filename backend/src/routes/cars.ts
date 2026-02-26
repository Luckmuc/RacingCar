import { Router, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Car } from '../models/Car';
import { CarOwnership } from '../models/CarOwnership';
import { User } from '../models/User';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
const carRepository = AppDataSource.getRepository(Car);
const carOwnershipRepository = AppDataSource.getRepository(CarOwnership);
const userRepository = AppDataSource.getRepository(User);

// Get all cars
router.get('/', async (req, res: Response) => {
  try {
    const cars = await carRepository.find();
    res.json(cars);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch cars' });
  }
});

// Get user's cars
router.get('/owned', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const ownedCars = await carOwnershipRepository.find({
      where: { userId },
      relations: ['car'],
    });

    res.json(ownedCars.map(ownership => ({
      id: ownership.car.id,
      name: ownership.car.name,
      condition: ownership.condition,
      ...ownership.car,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch owned cars' });
  }
});

// Buy a car
router.post('/buy/:carId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const carId = parseInt(req.params.carId);
    const userId = req.user!.userId;

    const car = await carRepository.findOne({ where: { id: carId } });
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user || user.gems < car.price) {
      return res.status(400).json({ error: 'Insufficient gems' });
    }

    // Check if already owned
    const existing = await carOwnershipRepository.findOne({
      where: { userId, carId },
    });
    if (existing) {
      return res.status(400).json({ error: 'Car already owned' });
    }

    // Purchase
    user.gems -= car.price;
    await userRepository.save(user);

    const ownership = carOwnershipRepository.create({
      userId,
      carId,
    });
    await carOwnershipRepository.save(ownership);

    res.json({ success: true, gemsRemaining: user.gems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to buy car' });
  }
});

// Repair car
router.post('/repair/:carId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const carId = parseInt(req.params.carId);
    const userId = req.user!.userId;

    const ownership = await carOwnershipRepository.findOne({
      where: { userId, carId },
    });

    if (!ownership) {
      return res.status(404).json({ error: 'Car not owned' });
    }

    const repairCost = Math.floor((100 - ownership.condition) * 10); // 10 gems per damage point
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user || user.gems < repairCost) {
      return res.status(400).json({ error: 'Insufficient gems for repair' });
    }

    user.gems -= repairCost;
    ownership.condition = 100;

    await userRepository.save(user);
    await carOwnershipRepository.save(ownership);

    res.json({ success: true, gemsRemaining: user.gems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to repair car' });
  }
});

export default router;
