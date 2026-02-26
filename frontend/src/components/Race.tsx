import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { usePageParams, useNavigate } from './Router';
import { RaceScene } from '../lib/RaceEngine';
import { leaderboardService } from '../services/api';
import '../styles/Race.css';

export const Race: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const navigate = useNavigate();
  const params = usePageParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raceSceneRef = useRef<RaceScene | null>(null);
  const [raceFinished, setRaceFinished] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [condition, setCondition] = useState(100);
  const [message, setMessage] = useState('');
  const raceFinishedRef = useRef(false);
  const inputRef = useRef({ forward: 0, turn: 0 });
  const animationIdRef = useRef<number>(0);

  const hasPrereqs = !!(state.selectedMap && state.selectedCar);

  useEffect(() => {
    if (!hasPrereqs || !canvasRef.current) return;

    const scene = new RaceScene(canvasRef.current, state.selectedMap!);
    raceSceneRef.current = scene;
    raceFinishedRef.current = false;
    setRaceFinished(false);
    setRaceTime(0);
    setMessage('');

    // Add the player car mesh
    const colorStr = state.selectedCar!.color || '#00d4ff';
    const colorNum = parseInt(colorStr.replace('#', ''), 16) || 0x00d4ff;
    scene.addCar(scene.playerCar, colorNum);

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
      setSpeed(scene.playerCar.speed);
      setCondition(scene.playerCar.condition);

      if (scene.raceFinished && !raceFinishedRef.current) {
        raceFinishedRef.current = true;
        setRaceFinished(true);
        setMessage(t('race.raceFinished'));

        if (state.selectedMap && state.selectedCar) {
          leaderboardService.saveRace({
            mapId: state.selectedMap.id,
            finishTime: Math.round(scene.raceTime * 1000),
            position: 1,
            carId: state.selectedCar.id,
            mode: params.mode || 'normal',
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
  }, [hasPrereqs]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds * 100) % 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centis.toString().padStart(2, '0')}`;
  };

  if (!hasPrereqs) {
    return (
      <div className="race-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div className="race-finish-dialog" style={{ position: 'relative', transform: 'none', top: 'auto', left: 'auto' }}>
          <h2>Race Setup</h2>
          <p>
            {!state.selectedCar && 'Select a car from the Garage first. '}
            {!state.selectedMap && 'Select a map to race on. '}
          </p>
          <div className="finish-buttons">
            {!state.selectedCar && (
              <button onClick={() => navigate('garage')} className="btn-primary">
                Go to Garage
              </button>
            )}
            {!state.selectedMap && (
              <button onClick={() => navigate('maps')} className="btn-primary">
                Choose Map
              </button>
            )}
            <button onClick={() => navigate('home')} className="btn-secondary">
              {t('race.backToHome')}
            </button>
          </div>
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
          </div>
        </div>

        <div className="hud-center">
          {message && <div className="message-overlay">{message}</div>}
        </div>

        <div className="hud-bottom">
          <div className="speedometer">
            <div className="speed-value">
              {Math.round(speed)}
            </div>
            <div className="speed-label">km/h</div>
          </div>

          <div className="controls-hint">
            <p>W/A/S/D or Arrow Keys</p>
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
            <div className="finish-buttons">
              <button onClick={() => navigate('home')} className="btn-primary">
                {t('race.backToHome')}
              </button>
              <button onClick={() => {
                setRaceFinished(false);
                setRaceTime(0);
                raceFinishedRef.current = false;
                navigate('maps');
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
