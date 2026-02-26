import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { leaderboardService } from '../services/api';
import { useNavigate } from './Router';
import '../styles/Leaderboard.css';

export const Leaderboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'global' | 'map'>('global');

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTab]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      if (selectedTab === 'global') {
        const response = await leaderboardService.getGlobalLeaderboard(20);
        setGlobalLeaderboard(response.data);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leaderboard-container">
      <h1>{t('leaderboard.title')}</h1>

      <div className="leaderboard-tabs">
        <button
          className={`tab ${selectedTab === 'global' ? 'active' : ''}`}
          onClick={() => setSelectedTab('global')}
        >
          {t('leaderboard.globalTop')}
        </button>
        <button
          className={`tab ${selectedTab === 'map' ? 'active' : ''}`}
          onClick={() => setSelectedTab('map')}
        >
          {t('leaderboard.mapRecords')}
        </button>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="col-position">{t('leaderboard.position')}</div>
            <div className="col-player">{t('leaderboard.player')}</div>
            {selectedTab === 'global' && (
              <>
                <div className="col-wins">{t('leaderboard.wins')}</div>
                <div className="col-races">{t('leaderboard.races')}</div>
              </>
            )}
          </div>

          <div className="table-body">
            {selectedTab === 'global' &&
              globalLeaderboard.map((entry, index) => (
                <div key={entry.id} className="table-row">
                  <div className="col-position">
                    {index < 3 ? ['#1', '#2', '#3'][index] : index + 1}
                  </div>
                  <div className="col-player">{entry.username}</div>
                  <div className="col-wins">{entry.totalWins || 0}</div>
                  <div className="col-races">{entry.races || 0}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      <button onClick={() => navigate('home')} className="btn-secondary" style={{ marginTop: '2rem' }}>
        {t('common.back')}
      </button>
    </div>
  );
};

export default Leaderboard;
