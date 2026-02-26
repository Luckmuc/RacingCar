import { DataSource } from 'typeorm';
import { User } from '../models/User';
import { Car } from '../models/Car';
import { CarOwnership } from '../models/CarOwnership';
import { Map } from '../models/Map';
import { Race } from '../models/Race';
import { Party } from '../models/Party';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'racing_game',
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Car, CarOwnership, Map, Race, Party],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
});
