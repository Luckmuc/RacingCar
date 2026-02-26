import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import '../styles/Home.css';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="hero-section">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
        <p className="welcome">
          {state.user && `${t('messages.welcomeBack')}, ${state.user.username}!`}
        </p>
      </div>

      <div className="race-modes">
        <h2>{t('home.raceModes')}</h2>
        <div className="modes-grid">
          <div className="mode-card" onClick={() => navigate('race', { mode: 'normal' })}>
            <h3>🤖 {t('home.normalRace')}</h3>
            <p>Race against 3 AI opponents</p>
          </div>

          <div className="mode-card" onClick={() => navigate('race', { mode: 'training' })}>
            <h3>👻 {t('home.trainingRace')}</h3>
            <p>Race against your best lap</p>
          </div>

          <div className="mode-card" onClick={() => navigate('race', { mode: 'multiplayer' })}>
            <h3>🏁 {t('home.multiplayerRace')}</h3>
            <p>Race online with others</p>
          </div>

          <div className="mode-card" onClick={() => navigate('race', { mode: 'party' })}>
            <h3>🎉 {t('home.partyRace')}</h3>
            <p>Race with friends in a party</p>
          </div>
        </div>
      </div>

      <div className="quick-links">
        <button onClick={() => navigate('garage')} className="btn-primary">
          🚗 Garage
        </button>
        <button onClick={() => navigate('maps')} className="btn-primary">
          🗺️ Maps
        </button>
        <button onClick={() => navigate('leaderboard')} className="btn-primary">
          📊 Leaderboard
        </button>
        <button onClick={() => navigate('profile')} className="btn-primary">
          👤 Profile
        </button>
      </div>
    </div>
  );
};
