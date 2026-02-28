import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import { RaceScene, RaceOptions, CarStats, getGhostData, saveGhostData } from '../lib/RaceEngine';
import { leaderboardService, mapsService } from '../services/api';
import '../styles/Race.css';
import type { Map as GameMap } from '../types';

type RaceMode = 'normal' | 'bots' | 'ghost';

export const Race: React.FC = () => {
  const { t } = useTranslation();
  const { state, selectMap } = useGame();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raceSceneRef = useRef<RaceScene | null>(null);
  const [raceFinished, setRaceFinished] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [condition, setCondition] = useState(100);
  const [message, setMessage] = useState('');
  const [raceMode, setRaceMode] = useState<RaceMode | null>(null);
  const [position, setPosition] = useState(1);
  const [countdownLights, setCountdownLights] = useState(0);
  const [countdownActive, setCountdownActive] = useState(true);
  const [gemsEarned, setGemsEarned] = useState(0);
  const raceFinishedRef = useRef(false);
  const inputRef = useRef({ forward: 0, turn: 0 });
  const animationIdRef = useRef<number>(0);

  const hasPrereqs = !!(state.selectedCar); // Map is auto-picked by roulette
  const mapId = state.selectedMap?.id || '';
  const hasGhost = !!getGhostData(mapId);

  // Roulette state
  const [rouletteActive, setRouletteActive] = useState(false);
  const [rouletteMaps, setRouletteMaps] = useState<GameMap[]>([]);
  const [rouletteIdx, setRouletteIdx] = useState(0);
  const [rouletteDone, setRouletteDone] = useState(false);

  // If launched from the Training card on Home, jump straight to ghost (or solo if no ghost yet)
  const initialMode = (state as any).raceInitialMode as RaceMode | undefined;

  // Auto-start when a mode was pre-selected from Home
  useEffect(() => {
    if (initialMode && !raceMode && hasPrereqs) {
      if (initialMode === 'ghost') {
        setRaceMode(hasGhost ? 'ghost' : 'normal');
      } else {
        setRaceMode(initialMode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasPrereqs || !canvasRef.current || !raceMode) return;

    const modelPath = state.selectedCar?.imageUrl || '/models/porsche_gt3_rs.glb';
    const ghostData = raceMode === 'ghost' ? getGhostData(mapId) : null;

    // Pass DB stats so each car feels distinct
    const carStats: CarStats = {
      maxSpeed: state.selectedCar?.maxSpeed ?? 200,
      acceleration: state.selectedCar?.acceleration ?? 6,
      handling: state.selectedCar?.handling ?? 6,
      durability: state.selectedCar?.durability ?? 6,
    };

    const options: RaceOptions = {
      modelPath,
      mode: raceMode,
      ghostData: ghostData || undefined,
      botCount: 4,
      carStats,
    };

    const mapData = { ...state.selectedMap!, playerName: state.user?.username || 'Player' };
    const scene = new RaceScene(canvasRef.current, mapData as any, options);
    raceSceneRef.current = scene;
    raceFinishedRef.current = false;
    setRaceFinished(false);
    setRaceTime(0);
    setMessage('');

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          inputRef.current.forward = 1; break;
        case 's': case 'arrowdown':
          inputRef.current.forward = -0.5; break;
        case 'a': case 'arrowleft':
          inputRef.current.turn = -1; break;
        case 'd': case 'arrowright':
          inputRef.current.turn = 1; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w': case 's': case 'arrowup': case 'arrowdown':
          inputRef.current.forward = 0; break;
        case 'a': case 'd': case 'arrowleft': case 'arrowright':
          inputRef.current.turn = 0; break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const deltaTime = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      scene.update(deltaTime, inputRef.current);
      setRaceTime(scene.raceTime);
      setSpeed(scene.playerCar.getSpeedKmh());
      setCondition(scene.playerCar.condition);
      setCountdownLights(scene.countdownLights);
      setCountdownActive(scene.countdownActive);

      if (scene.mode === 'bots') {
        setPosition(scene.getPlayerPosition());
      }

      if (scene.raceFinished && !raceFinishedRef.current) {
        raceFinishedRef.current = true;
        setRaceFinished(true);
        setMessage(t('race.raceFinished'));
        setGemsEarned(50); // Show gem reward

        // Save ghost data
        const ghostFrames = scene.ghostRecorder.getData();
        if (ghostFrames.length > 0) {
          const existingGhost = getGhostData(mapId);
          // Save if no existing ghost or this is faster
          if (!existingGhost || scene.raceTime < existingGhost[existingGhost.length - 1]?.t) {
            saveGhostData(mapId, ghostFrames);
          }
        }

        if (state.selectedMap && state.selectedCar) {
          leaderboardService.saveRace({
            mapId: state.selectedMap.id,
            finishTime: Math.round(scene.raceTime * 1000),
            position: scene.mode === 'bots' ? scene.getPlayerPosition() : 1,
            carId: state.selectedCar.id,
            mode: raceMode,
          }).catch(console.error);
        }
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      scene.dispose();
      raceSceneRef.current = null;
    };
  }, [hasPrereqs, raceMode, state.selectedMap]); // Added state.selectedMap to dependencies

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds * 100) % 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  // No car selected
  if (!state.selectedCar) {
    return (
      <div className="race-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="race-mode-select">
          <h2>Missing Setup</h2>
          <p className="mode-info">Select a car from the Garage first.</p>
          <div className="finish-buttons">
            <button onClick={() => navigate('garage')} className="btn-primary">Go to Garage</button>
            <button onClick={() => navigate('home')} className="btn-secondary">{t('race.backToHome')}</button>
          </div>
        </div>
      </div>
    );
  }

  // Map roulette phase — fires when mode is chosen but no map is selected
  if (raceMode && !state.selectedMap && !rouletteDone) {
    // Start roulette if not already running
    if (!rouletteActive && rouletteMaps.length === 0) {
      // Fetch public maps
      mapsService.getPublicMaps().then(r => {
        const maps = r.data as GameMap[];
        if (maps.length === 0) {
          setMessage('No maps available! Create one in the editor first.');
          return;
        }
        setRouletteMaps(maps);
        setRouletteActive(true);

        // Animate: rapid index cycling that decelerates
        let tick = 0;
        const winnerIdx = Math.floor(Math.random() * maps.length);
        const totalTicks = 25 + winnerIdx;
        const timer = setInterval(() => {
          tick++;
          setRouletteIdx(tick % maps.length);
          if (tick >= totalTicks) {
            clearInterval(timer);
            setRouletteIdx(winnerIdx);
            setRouletteActive(false);
            // Delay before confirming
            setTimeout(() => {
              selectMap(maps[winnerIdx]); // Use selectMap from context
              setRouletteDone(true);
            }, 800);
          }
        }, tick < 15 ? 80 : tick < 20 ? 150 : 250);
      });
    }

    return (
      <div className="race-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="roulette-container">
          <h2 className="roulette-title">Selecting Map...</h2>
          <div className="roulette-strip">
            {rouletteMaps.map((m, i) => (
              <div
                key={m.id}
                className={`roulette-card ${i === rouletteIdx ? 'roulette-card-active' : ''} ${!rouletteActive && i === rouletteIdx ? 'roulette-card-winner' : ''}`}
              >
                <h3>{m.name}</h3>
                <p>Difficulty {m.difficulty}/5</p>
              </div>
            ))}
          </div>
          {message && <p className="mode-info" style={{ color: '#ff6b6b' }}>{message}</p>}
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (!raceMode) {
    return (
      <div className="race-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="race-mode-select">
          <h2>Select Race Mode</h2>
          <p className="mode-info">{state.selectedMap?.name} &bull; {state.selectedCar?.name}</p>
          <div className="mode-buttons">
            <button className="mode-btn" onClick={() => setRaceMode('normal')}>
              <span className="mode-name">Solo Race</span>
              <span className="mode-desc">Race alone against the clock</span>
            </button>
            <button className="mode-btn" onClick={() => setRaceMode('bots')}>
              <span className="mode-name">Race vs AI</span>
              <span className="mode-desc">Compete against 4 AI opponents</span>
            </button>
            <button
              className={`mode-btn ${!hasGhost ? 'mode-btn-disabled' : ''}`}
              onClick={() => hasGhost && setRaceMode('ghost')}
              title={!hasGhost ? 'Complete a lap first to unlock ghost mode' : ''}
            >
              <span className="mode-name">Ghost Mode</span>
              <span className="mode-desc">
                {hasGhost ? 'Race against your best lap' : 'Complete a lap first to unlock'}
              </span>
            </button>
          </div>
          <button onClick={() => navigate('home')} className="btn-secondary" style={{ marginTop: '1.5rem' }}>
            {t('race.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="race-container">
      <canvas ref={canvasRef} className="race-canvas"></canvas>

      <div className="race-hud">
        <div className="hud-top">
          <div className="info-panel">
            <div className="info-row">
              <span>{state.selectedMap?.name}</span>
              <span>{formatTime(raceTime)}</span>
            </div>
            {raceMode === 'bots' && (
              <div className="info-row">
                <span>Position</span>
                <span>P{position}</span>
              </div>
            )}
            {raceMode === 'ghost' && (
              <div className="info-row">
                <span>Mode</span>
                <span>👻 Ghost</span>
              </div>
            )}
          </div>
        </div>

        <div className="hud-center">
          {countdownActive && (
            <div className="countdown-overlay">
              <div className="countdown-lights">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`countdown-light ${i < countdownLights ? 'lit' : ''}`}
                  ></div>
                ))}
              </div>
              {countdownLights >= 5 && <div className="countdown-text">READY</div>}
            </div>
          )}
          {!countdownActive && countdownLights === 0 && raceTime < 1.5 && (
            <div className="countdown-go">GO!</div>
          )}
          {message && !countdownActive && raceTime >= 1.5 && <div className="message-overlay">{message}</div>}
        </div>

        <div className="hud-bottom">
          <div className="speedometer">
            <div className="speed-value">
              {Math.round(speed)}
            </div>
            <div className="speed-label">km/h</div>
          </div>

          <div className="car-status">
            <div className="condition">
              {Math.round(condition)}%
            </div>
          </div>
        </div>

        {raceFinished && (
          <div className="race-finish-dialog">
            <h2>{t('race.raceFinished')}</h2>
            <p>{t('race.time')}: {formatTime(raceTime)}</p>
            {raceMode === 'bots' && <p>Position: P{position}</p>}
            <p className="gems-reward">+{gemsEarned} 💎 Gems earned!</p>
            <div className="finish-buttons">
              <button onClick={() => navigate('home')} className="btn-primary">
                {t('race.backToHome')}
              </button>
              <button onClick={() => {
                setRaceFinished(false);
                setRaceTime(0);
                setRaceMode(null);
                raceFinishedRef.current = false;
              }} className="btn-secondary">
                {t('race.nextRace')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Race;
