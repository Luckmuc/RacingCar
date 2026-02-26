# 🏁 Racing Game - Multiplayer Web Racing

A fully-featured, high-performance 3D multiplayer racing game built with modern web technologies. Race against AI opponents, compete on leaderboards, customize your cars, and create custom race tracks.

## Features

### 🎮 Gameplay
- **Multiple Race Modes**: Normal (vs AI), Training (vs Your Ghost), Multiplayer (online), Party (with friends)
- **3D Graphics**: Built with Three.js for stunning visuals
- **Physics Engine**: Realistic car physics with speed, acceleration, and handling
- **Damage System**: Cars take damage on collisions and crashes
- **Custom Maps**: Create and share your own race tracks using the Map Editor

### 🚗 Car System
- **Multiple Cars**: 5+ unique cars with different stats
- **Car Customization**: Colors, stats, performance characteristics
- **Garage System**: Buy, sell, and repair cars
- **Condition System**: Repair damaged cars using gems

### 💎 Progression & Economics
- **Gem Currency**: Earn gems by racing and completing challenges
- **Car Shop**: Purchase new cars with earned gems
- **Leaderboard**: Global rankings and per-map records
- **Statistics**: Track your wins, races, and personal bests

### 👥 Social Features
- **Party System**: Invite friends and race together
- **Leaderboards**: Global rankings with top 10 per map
- **Profile System**: View your stats, cars, and achievements

### 🌐 Localization
- **English & German** fully supported
- Language selector on all pages

### 🔐 Security
- **User Authentication**: Secure registration and login
- **JWT Tokens**: Stateless authentication system
- **Password Hashing**: bcryptjs for secure password storage

## Tech Stack

### Backend
- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Database**: PostgreSQL 16
- **Real-time**: Socket.IO
- **ORM**: TypeORM
- **Language**: TypeScript

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **3D Graphics**: Three.js
- **Styling**: CSS3 with Grid & Flexbox
- **i18n**: react-i18next
- **HTTP Client**: Axios
- **Language**: TypeScript

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Orchestration**: systemd
- **Proxy**: Ready for Caddy reverse proxy

## Installation

### Prerequisites
- Docker & Docker Compose
- Git
- Linux system (Ubuntu 20.04+)

### Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd RacingCar

# 2. Run setup script
sudo chmod +x deploy/setup-docker.sh
sudo ./deploy/setup-docker.sh

# 3. Configure environment
sudo nano /opt/racing-game/.env
# Update database password and JWT secret

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001/api
```

### Manual Installation

1. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. **Setup database**
```bash
psql -U postgres
CREATE DATABASE racing_game;
```

3. **Create .env files**
```bash
cp backend/.env.example backend/.env
```

4. **Run development servers**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Cars
- `GET /api/cars` - Get all cars
- `GET /api/cars/owned` - Get user's cars
- `POST /api/cars/buy/:id` - Buy a car
- `POST /api/cars/repair/:id` - Repair a car

### Maps
- `GET /api/maps` - Get public maps
- `POST /api/maps` - Create new map
- `PUT /api/maps/:id` - Update map
- `DELETE /api/maps/:id` - Delete map

### Leaderboard
- `GET /api/leaderboard/:mapId` - Get map leaderboard
- `GET /api/leaderboard/global/top` - Get global leaderboard
- `POST /api/race/save` - Save race result

## Deployment

### Docker
```bash
docker compose up -d
```

### Systemd Service
```bash
sudo systemctl start racing-game.service
sudo systemctl status racing-game.service
```

### Caddy Reverse Proxy
```
racing.example.com {
    reverse_proxy /api* localhost:3001
    reverse_proxy /socket.io* localhost:3001
    reverse_proxy localhost:3000
}
```

## License

MIT
