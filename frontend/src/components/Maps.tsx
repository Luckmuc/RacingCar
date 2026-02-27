import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import { mapsService } from '../services/api';
import '../styles/Maps.css';

export const Maps: React.FC = () => {
  const { t } = useTranslation();
  const { state, selectMap, loadMaps } = useGame();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<'public' | 'user'>('public');

  const handleDeleteMap = async (mapId: string) => {
    if (!window.confirm('Are you sure you want to delete this map?')) return;
    try {
      await mapsService.deleteMap(mapId);
      await loadMaps();
    } catch (error) {
      console.error('Failed to delete map:', error);
    }
  };

  return (
    <div className="maps-container">
      <h1>{t('maps.title')}</h1>

      <div className="maps-controls">
        <button onClick={() => navigate('editor')} className="btn-primary">
          {t('maps.createMap')}
        </button>
      </div>

      <div className="maps-tabs">
        <button
          className={`tab ${selectedTab === 'public' ? 'active' : ''}`}
          onClick={() => setSelectedTab('public')}
        >
          {t('maps.publicMaps')} ({state.maps.length})
        </button>
        <button
          className={`tab ${selectedTab === 'user' ? 'active' : ''}`}
          onClick={() => setSelectedTab('user')}
        >
          {t('maps.myMaps')} ({state.userMaps.length})
        </button>
      </div>

      <div className="maps-grid grid-3">
        {selectedTab === 'public'
          ? state.maps.map(map => (
              <div key={map.id} className="map-card">
                <div className="map-difficulty">
                  Level {map.difficulty}/5
                </div>
                <h3>{map.name}</h3>
                <p>{map.description}</p>
                <button
                  onClick={() => {
                    selectMap(map);
                    navigate('race', { mode: 'normal' });
                  }}
                  className="btn-primary"
                >
                  {t('maps.playMap')}
                </button>
              </div>
            ))
          : state.userMaps.map(map => (
              <div key={map.id} className="map-card">
                <div className="map-difficulty">
                  Level {map.difficulty}/5
                </div>
                <h3>{map.name}</h3>
                <p>{map.description}</p>
                <div className="map-buttons">
                  <button
                    onClick={() => {
                      selectMap(map);
                      navigate('race', { mode: 'normal' });
                    }}
                    className="btn-primary"
                  >
                    {t('maps.playMap')}
                  </button>
                  <button
                    onClick={() => navigate('editor', { mapId: map.id })}
                    className="btn-secondary"
                  >
                    {t('maps.editMap')}
                  </button>
                  <button
                    onClick={() => handleDeleteMap(map.id)}
                    className="btn-danger"
                  >
                    {t('maps.deleteMap')}
                  </button>
                </div>
              </div>
            ))}
      </div>

      <button onClick={() => navigate('home')} className="btn-secondary" style={{ marginTop: '2rem' }}>
        {t('common.back')}
      </button>
    </div>
  );
};

export default Maps;
