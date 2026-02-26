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
  const [raceScene, setRaceScene] = useState<RaceScene | null>(null);
  const [raceFinished, setRaceFinished] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const [message, setMessage] = useState('');
  
  const [playerInput, setPlayerInput] = useState({ forward: 0, turn: 0 });

  useEffect(() => {
    if (!canvasRef.current || !state.selectedMap || !state.selectedCar) {
      navigate('home');
      return;
    }

    const scene = new RaceScene(canvasRef.current, state.selectedMap);
    setRaceScene(scene);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          setPlayerInput(prev => ({ ...prev, forward: 1 }));
          break;
        case 's':
          setPlayerInput(prev => ({ ...prev, forward: -0.5 }));
          break;
        case 'a':
          setPlayerInput(prev => ({ ...prev, turn: -1 }));
          break;
        case 'd':
          setPlayerInput(prev => ({ ...prev, turn: 1 }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 's':
          setPlayerInput(prev => ({ ...prev, forward: 0 }));
          break;
        case 'a':
        case 'd':
          setPlayerInput(prev => ({ ...prev, turn: 0 }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      scene.update(deltaTime, playerInput);
      setRaceTime(scene.raceTime);

      if (scene.raceFinished && !raceFinished) {
        setRaceFinished(true);
        setMessage(t('race.raceFinished'));
        
        // Save race result
        leaderboardService.saveRace({
          mapId: state.selectedMap!.id,
          finishTime: scene.raceTime,
          position: 1,
          carId: state.selectedCar!.id,
          mode: params.mode || 'normal',
        }).catch(console.error);
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      scene.dispose();
    };
  }, [state.selectedMap, state.selectedCar, playerInput, raceFinished, params, navigate, t]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${seconds.toString().padStart(2, '0')}:${centis.toString().padStart(2, '0')}`;
  };

  return (
    <div className="race-container">
      <canvas ref={canvasRef} className="race-canvas"></canvas>

      <div className="race-hud">
        <div className="hud-top">
          <div className="info-panel">
            <div className="info-row">
              <span>{state.selectedMap?.name}</span>
              <span>⏱️ {formatTime(raceTime)}</span>
            </div>
          </div>
        </div>

        <div className="hud-center">
          {message && <div className="message-overlay">{message}</div>}
        </div>

        <div className="hud-bottom">
          <div className="speedometer">
            <div className="speed-value">
              {Math.round(raceScene?.playerCar.speed || 0)}
            </div>
            <div className="speed-label">km/h</div>
          </div>

          <div className="controls-hint">
            <p>🎮 W/A/S/D {t('race.checkpoint')}</p>
          </div>

          <div className="car-status">
            <div className="condition">
              💪 {Math.round(raceScene?.playerCar.condition || 100)}%
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
              <button onClick={() => navigate('race', { mode: params.mode })} className="btn-secondary">
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
