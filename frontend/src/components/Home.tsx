import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import '../styles/Home.css';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const navigate = useNavigate();

  const startRace = (mode: string) => {
    if (mode === 'party') {
      navigate('party');
      return;
    }
    if (!state.selectedCar) {
      navigate('garage');
      return;
    }
    if (!state.selectedCar) {
      navigate('garage');
      return;
    }
    // Attach the initial mode so Race.tsx can auto-start
    (state as any).raceInitialMode = mode === 'training' ? 'ghost' : mode === 'race_bots' ? 'bots' : 'normal';
    navigate('race', { mode });
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <p className="welcome">
          {state.user && `${t('messages.welcomeBack')}, ${state.user.username}!`}
        </p>
        {state.selectedCar && (
          <p className="selected-info">Car: {state.selectedCar.name}</p>
        )}
        {state.selectedMap && (
          <p className="selected-info">Map: {state.selectedMap.name}</p>
        )}
      </div>

      <div className="race-modes">
        <h2>Race</h2>
        <div className="modes-grid">
          <div className="mode-card" onClick={() => startRace('solo')}>
            <h3>Solo</h3>
            <p>Race alone against the clock</p>
          </div>

          <div className="mode-card" onClick={() => startRace('race_bots')}>
            <h3>vs AI</h3>
            <p>Race against 4 opponents</p>
          </div>

          <div className="mode-card" onClick={() => startRace('training')}>
            <h3>Training</h3>
            <p>Race against your ghost</p>
          </div>

          <div className="mode-card" onClick={() => startRace('party')}>
            <h3>Party</h3>
            <p>Invite friends to race</p>
          </div>
        </div>
      </div>

      <div className="quick-links">
        <button onClick={() => navigate('garage')} className="btn-primary">
          Garage
        </button>
        <button onClick={() => navigate('maps')} className="btn-primary">
          Maps
        </button>
        <button onClick={() => navigate('leaderboard')} className="btn-primary">
          Leaderboard
        </button>
        <button onClick={() => navigate('profile')} className="btn-primary">
          Profile
        </button>
      </div>
    </div>
  );
};
