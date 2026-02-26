import { AppDataSource } from '../config/database';
import { User } from '../models/User';
import { Car } from '../models/Car';
import { GAME_CONFIG } from '../config/gameConfig';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private carRepository = AppDataSource.getRepository(Car);

  async getUserWithStats(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['cars', 'cars.car'],
    });
    return user;
  }

  async addGemsToUser(userId: string, gems: number) {
    await this.userRepository.increment({ id: userId }, 'gems', gems);
  }

  async getOrCreateStarterCar(userId: string) {
    const starterCar = await this.carRepository.findOne({
      where: { description: 'starter' },
    });
    if (starterCar) {
      const carRepo = AppDataSource.getRepository('CarOwnership');
      await carRepo.insert({
        userId,
        carId: starterCar.id,
      });
    }
  }

  async getUserLeaderboardPosition(mapId: string, userId: string): Promise<{ position: number; finishTime: number } | null> {
    const raceRepo = AppDataSource.getRepository('Race');
    const userRecords = await raceRepo.query(`
      SELECT finishTime, ROW_NUMBER() OVER (ORDER BY "finishTime" ASC) as position
      FROM races
      WHERE "mapId" = $1 AND "userId" = $2
      ORDER BY "finishTime" ASC
      LIMIT 1
    `, [mapId, userId]);
    
    return userRecords.length > 0 ? userRecords[0] : null;
  }
}
