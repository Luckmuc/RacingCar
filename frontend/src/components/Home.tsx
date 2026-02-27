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
    // Party mode goes to the party page
    if (mode === 'party') {
      navigate('party');
      return;
    }
    // If no car selected, go to garage first
    if (!state.selectedCar) {
      navigate('garage');
      return;
    }
    // If no map selected, go to maps to pick one
    if (!state.selectedMap) {
      navigate('maps');
      return;
    }
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
        <h2>{t('home.raceModes')}</h2>
        <div className="modes-grid">
          <div className="mode-card" onClick={() => startRace('normal')}>
            <h3>{t('home.normalRace')}</h3>
            <p>Race against 3 AI opponents</p>
          </div>

          <div className="mode-card" onClick={() => startRace('training')}>
            <h3>{t('home.trainingRace')}</h3>
            <p>Race against your best lap</p>
          </div>

          <div className="mode-card" onClick={() => startRace('multiplayer')}>
            <h3>{t('home.multiplayerRace')}</h3>
            <p>Race online with others</p>
          </div>

          <div className="mode-card" onClick={() => startRace('party')}>
            <h3>{t('home.partyRace')}</h3>
            <p>Race with friends in a party</p>
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
