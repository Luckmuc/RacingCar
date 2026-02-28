export interface User {
  id: string;
  username: string;
  gems: number;
  totalRaces: number;
  totalWins: number;
  level: number;
}

export interface Car {
  id: number;
  name: string;
  description: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  durability: number;
  price: number;
  weight: number;
  color: string;
  imageUrl?: string;
  condition?: number;
}

export interface Map {
  id: string;
  name: string;
  description: string;
  checkpoints: any[];
  trackPath: any[];
  obstacles: any[];
  sceneData: any[];
  assets: any[];
  difficulty: number;
  isPublic: boolean;
  creatorId: string;
  createdAt: string;
}

export interface RaceResult {
  userId: string;
  username: string;
  finishTime: number;
  position: number;
  gemsEarned: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  finishTime: number;
  position: number;
}

export interface GameState {
  user: User | null;
  isAuthenticated: boolean;
  cars: Car[];
  ownedCars: Car[];
  selectedCar: Car | null;
  maps: Map[];
  userMaps: Map[];
  selectedMap: Map | null;
}

export interface RaceSession {
  id: string;
  mapId: string;
  mode: 'normal' | 'training' | 'multiplayer' | 'party';
  players: globalThis.Map<string, PlayerState>;
  startTime: number;
}

export interface PlayerState {
  userId: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  speed: number;
  carId: number;
  condition: number;
}
