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
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve uploaded assets as static files
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
      console.log('[OK] Database connected');

      // Seed all 5 cars
      const carRepo = AppDataSource.getRepository('Car');
      const carOwnershipRepo = AppDataSource.getRepository('CarOwnership');
      const carCount = await carRepo.count();

      if (carCount < 5) {
        // Clear ownership first, then cars (foreign key constraint)
        try {
          await carOwnershipRepo.delete({});
          await carRepo.delete({});
        } catch (e) {
          console.log('Note: Could not clear old cars, may already be clean');
        }

        const defaultCars = [
          {
            name: 'Porsche GT3 RS',
            description: 'Track-focused supercar with naturally aspirated flat-six',
            maxSpeed: 296,
            acceleration: 9.5,
            handling: 9,
            durability: 7,
            price: 0,
            weight: 1450,
            color: '#FFFFFF',
            imageUrl: '/models/porsche_gt3_rs.glb',
          },
          {
            name: 'BMW M4 Competition',
            description: 'Twin-turbo inline-six with razor-sharp handling',
            maxSpeed: 280,
            acceleration: 8.5,
            handling: 8.5,
            durability: 8,
            price: 200,
            weight: 1725,
            color: '#1E3A5F',
            imageUrl: '/models/bmw_m4.glb',
          },
          {
            name: 'Lamborghini Huracan',
            description: 'Naturally aspirated V10 mid-engine Italian supercar',
            maxSpeed: 325,
            acceleration: 9.8,
            handling: 8,
            durability: 6,
            price: 400,
            weight: 1422,
            color: '#00CC00',
            imageUrl: '/models/lamborghini_huracan.glb',
          },
          {
            name: 'Mercedes AMG ONE',
            description: 'Formula 1 hybrid technology for the road',
            maxSpeed: 352,
            acceleration: 9.9,
            handling: 9.5,
            durability: 5,
            price: 600,
            weight: 1695,
            color: '#C0C0C0',
            imageUrl: '/models/mercedes_amg_one.glb',
          },
          {
            name: 'Mercedes AMG GT Black Series',
            description: 'Handcrafted twin-turbo V8 flat-plane crank beast',
            maxSpeed: 325,
            acceleration: 9.7,
            handling: 9.2,
            durability: 6.5,
            price: 500,
            weight: 1550,
            color: '#1A1A1A',
            imageUrl: '/models/mercedes_amg_gt_black_series.glb',
          },
        ];

        for (const car of defaultCars) {
          await carRepo.insert(car);
        }
        console.log('[OK] All 5 cars seeded');
      } else {
        console.log('[OK] Cars already seeded (' + carCount + ')');
      }

      // Maps: no auto-seed — user builds new maps from 3D editor
      console.log('[OK] Maps: ready (user-created only)');
    }

    // Start listening
    httpServer.listen(GAME_CONFIG.PORT, GAME_CONFIG.HOST, () => {
      console.log(`[OK] Server running at ${GAME_CONFIG.HOST}:${GAME_CONFIG.PORT}`);
      console.log(`[OK] WebSocket ready on ws://${GAME_CONFIG.HOST}:${GAME_CONFIG.PORT}`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
