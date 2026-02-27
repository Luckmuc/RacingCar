import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { leaderboardService } from '../services/api';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import '../styles/Leaderboard.css';

export const Leaderboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state } = useGame();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([]);
  const [mapLeaderboard, setMapLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'global' | 'map'>('global');
  const [selectedMapId, setSelectedMapId] = useState<string>('');

  useEffect(() => {
    loadLeaderboard();
  }, [selectedTab, selectedMapId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      if (selectedTab === 'global') {
        const response = await leaderboardService.getGlobalLeaderboard(20);
        setGlobalLeaderboard(response.data);
      } else if (selectedTab === 'map' && selectedMapId) {
        const response = await leaderboardService.getLeaderboard(selectedMapId, 20);
        setMapLeaderboard(Array.isArray(response.data) ? response.data : []);
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
          {selectedTab === 'map' && (
            <div style={{ padding: '1rem' }}>
              <select
                className="language-selector"
                value={selectedMapId}
                onChange={(e) => setSelectedMapId(e.target.value)}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                <option value="">-- Select a map --</option>
                {state.maps.map(map => (
                  <option key={map.id} value={map.id}>{map.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="table-header">
            <div className="col-position">{t('leaderboard.position')}</div>
            <div className="col-player">{t('leaderboard.player')}</div>
            {selectedTab === 'global' ? (
              <>
                <div className="col-wins">{t('leaderboard.wins')}</div>
                <div className="col-races">{t('leaderboard.races')}</div>
              </>
            ) : (
              <div className="col-wins">{t('leaderboard.time')}</div>
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
            {selectedTab === 'map' && !selectedMapId && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                Select a map above to view records
              </div>
            )}
            {selectedTab === 'map' && selectedMapId && mapLeaderboard.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                No records for this map yet
              </div>
            )}
            {selectedTab === 'map' &&
              mapLeaderboard.map((entry, index) => (
                <div key={entry.id || index} className="table-row">
                  <div className="col-position">
                    {index < 3 ? ['#1', '#2', '#3'][index] : index + 1}
                  </div>
                  <div className="col-player">{entry.username}</div>
                  <div className="col-wins">{entry.finishTime ? `${(entry.finishTime / 1000).toFixed(2)}s` : '-'}</div>
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
