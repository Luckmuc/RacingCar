export const GAME_CONFIG = {
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRE_SECONDS: 7 * 24 * 60 * 60, // 7 days in seconds
  
  // Gems earning
  GEM_BASE_REWARD: 10,
  GEM_WIN_BONUS: 50,
  
  // Car pricing
  STARTER_CAR_GEMS: 0, // Free starter car
  
  // Physics
  MAX_CAR_SPEED: 200, // km/h default
  FRICTION: 0.98,
  ACCELERATION: 10,
  
  // Game rules
  BOT_COUNT_NORMAL: 3,
  RACE_TIMEOUT: 600000, // 10 minutes
  MAX_DAMAGE: 100,
  DAMAGE_PER_COLLISION: 5,
};
