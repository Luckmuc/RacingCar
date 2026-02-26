import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import '../styles/Profile.css';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { state } = useGame();
  const navigate = useNavigate();

  if (!state.user) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">U</div>
        <div className="profile-info">
          <h1>{state.user.username}</h1>
          <div className="stats-grid">
            <div className="stat">
              <div className="stat-label">Level</div>
              <div className="stat-value">{state.user.level}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Gems</div>
              <div className="stat-value">{state.user.gems}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Wins</div>
              <div className="stat-value">{state.user.totalWins}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Races</div>
              <div className="stat-value">{state.user.totalRaces}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2>Cars</h2>
        <div className="cars-list">
          {state.ownedCars.length > 0 ? (
            state.ownedCars.map(car => (
              <div key={car.id} className="car-summary">
                <div 
                  className="car-color-dot" 
                  style={{ backgroundColor: car.color }}
                ></div>
                <div>
                  <h4>{car.name}</h4>
                  <div className="car-quick-stats">
                    {car.condition && (
                      <span>{car.condition}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p>{t('common.loading')}</p>
          )}
        </div>
      </div>

      <button onClick={() => navigate('home')} className="btn-secondary">
        {t('common.back')}
      </button>
    </div>
  );
};

export default Profile;
