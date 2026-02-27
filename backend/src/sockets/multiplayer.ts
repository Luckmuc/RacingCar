import { Server, Socket } from 'socket.io';
import { AppDataSource } from '../config/database';
import { Party } from '../models/Party';
import { AuthService } from '../services/auth.service';

interface PlayerState {
  userId: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  carId: number;
}

interface RaceSession {
  id: string;
  mode: 'normal' | 'training' | 'multiplayer' | 'party';
  mapId: string;
  players: Map<string, PlayerState>;
  bots: PlayerState[];
  startTime: number;
  finished: Set<string>;
}

const raceSessions = new Map<string, RaceSession>();

export const initializeMultiplayer = (io: Server) => {
  const partyRepository = AppDataSource.getRepository(Party);

  // Middleware: authenticate on handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const payload = AuthService.verifyToken(token);
      if (payload) {
        (socket as any).userId = payload.userId;
        (socket as any).username = payload.username;
        return next();
      }
    }
    // Allow connection but unauthenticated
    next();
  });

  io.on('connection', (socket: Socket) => {
    let userId: string | null = (socket as any).userId || null;
    let username: string | null = (socket as any).username || null;
    let currentRace: string | null = null;

    if (userId) {
      socket.emit('authenticated', { success: true });
    }

    // Also allow explicit authenticate event
    socket.on('authenticate', (token: string) => {
      const payload = AuthService.verifyToken(token);
      if (payload) {
        userId = payload.userId;
        username = payload.username;
        socket.emit('authenticated', { success: true });
      } else {
        socket.emit('authenticated', { success: false });
      }
    });

    // Party invitations
    socket.on('invite-to-party', async (invitedUsername: string) => {
      if (!userId) return;
      
      // Would look up user by username and create invite
      // Simplified for now
      socket.emit('invite-sent', { to: invitedUsername });
    });

    socket.on('accept-party-invite', async (partyId: string) => {
      if (!userId) return;
      
      const party = await partyRepository.findOne({
        where: { id: partyId },
      });

      if (party && party.invitedIds?.includes(userId)) {
        party.memberIds.push(userId);
        party.invitedIds = party.invitedIds.filter(id => id !== userId);
        await partyRepository.save(party);
        
        // Notify party members
        io.to(partyId).emit('member-joined', { userId, username });
      }
    });

    // Race events
    socket.on('start-race', (data: { mapId: string; mode: 'normal' | 'training'; carId: number }) => {
      if (!userId) return;

      const raceId = `race_${Date.now()}_${Math.random()}`;
      const session: RaceSession = {
        id: raceId,
        mode: data.mode,
        mapId: data.mapId,
        players: new Map(),
        bots: [],
        startTime: Date.now(),
        finished: new Set(),
      };

      // Add player
      session.players.set(userId, {
        userId,
        username: username!,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        speed: 0,
        carId: data.carId,
      });

      // Add bots for normal mode
      if (data.mode === 'normal') {
        for (let i = 0; i < 3; i++) {
          session.bots.push({
            userId: `bot_${i}`,
            username: `Bot_${i}`,
            position: { x: Math.random() * 100, y: 0, z: Math.random() * 100 },
            rotation: 0,
            speed: 0,
            carId: 1,
          });
        }
      }

      raceSessions.set(raceId, session);
      currentRace = raceId;

      socket.join(raceId);
      socket.emit('race-started', { raceId, session });
      io.to(raceId).emit('player-joined', { userId, username });
    });

    // Player position updates
    socket.on('player-update', (data: { raceId: string; position: any; rotation: number; speed: number }) => {
      const race = raceSessions.get(data.raceId);
      if (!race || !userId) return;

      const player = race.players.get(userId);
      if (player) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.speed = data.speed;

        // Broadcast to others in race
        socket.to(data.raceId).emit('player-moved', { userId, ...data });
      }
    });

    // Race finish
    socket.on('race-finish', (data: { raceId: string; finishTime: number }) => {
      const race = raceSessions.get(data.raceId);
      if (!race || !userId) return;

      race.finished.add(userId);

      io.to(data.raceId).emit('player-finished', {
        userId,
        username,
        finishTime: data.finishTime,
        position: race.finished.size,
      });

      // Clean up race after all finish
      if (race.players.size === race.finished.size) {
        setTimeout(() => {
          raceSessions.delete(data.raceId);
        }, 5000);
      }
    });

    socket.on('disconnect', () => {
      if (currentRace) {
        io.to(currentRace).emit('player-left', { userId });
      }
    });
  });
};
