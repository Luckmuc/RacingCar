import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import 'dotenv/config';

import { AppDataSource } from './config/database';
import { GAME_CONFIG } from './config/gameConfig';
import { initializeMultiplayer } from './sockets/multiplayer';

// Routes
import authRoutes from './routes/auth';
import leaderboardRoutes from './routes/leaderboard';
import carsRoutes from './routes/cars';
import mapsRoutes from './routes/maps';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/maps', mapsRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize WebSocket
initializeMultiplayer(io);

// Database and start server
const startServer = async () => {
  try {
    // Initialize database
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✓ Database connected');

      // Seed default cars if not exist
      const carRepo = AppDataSource.getRepository('Car');
      const carCount = await carRepo.count();
      if (carCount === 0) {
        const defaultCars = [
          {
            name: 'Speed Demon',
            description: 'starter',
            maxSpeed: 200,
            acceleration: 8,
            handling: 5,
            durability: 3,
            price: 0,
            weight: 1200,
            color: '#FF6B00',
          },
          {
            name: 'Thunder Bolt',
            description: 'Fast and agile',
            maxSpeed: 240,
            acceleration: 9,
            handling: 8,
            durability: 4,
            price: 500,
            weight: 1100,
            color: '#FFD700',
          },
          {
            name: 'Iron Tank',
            description: 'Slow but durable',
            maxSpeed: 160,
            acceleration: 6,
            handling: 3,
            durability: 9,
            price: 500,
            weight: 1500,
            color: '#808080',
          },
          {
            name: 'Precision Racer',
            description: 'Best handling',
            maxSpeed: 220,
            acceleration: 7,
            handling: 10,
            durability: 5,
            price: 750,
            weight: 1150,
            color: '#0066FF',
          },
          {
            name: 'Rocket',
            description: 'Legendary car',
            maxSpeed: 280,
            acceleration: 10,
            handling: 7,
            durability: 6,
            price: 2000,
            weight: 1000,
            color: '#FF0000',
          },
        ];

        for (const car of defaultCars) {
          await carRepo.insert(car);
        }
        console.log('✓ Default cars seeded');
      }
    }

    // Start listening
    httpServer.listen(GAME_CONFIG.PORT, GAME_CONFIG.HOST, () => {
      console.log(`✓ Server running at ${GAME_CONFIG.HOST}:${GAME_CONFIG.PORT}`);
      console.log(`✓ WebSocket ready on ws://${GAME_CONFIG.HOST}:${GAME_CONFIG.PORT}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
