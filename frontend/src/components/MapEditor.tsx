import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from './Router';
import { mapsService } from '../services/api';
import '../styles/Editor.css';

export const MapEditor: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mapName, setMapName] = useState('');
  const [mapDesc, setMapDesc] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!mapName) {
      setMessage(t('editor.mapName') + ' required');
      return;
    }

    setSaving(true);
    try {
      // Generate a simple track with checkpoints
      const checkpoints = [
        { x: 0, y: 0, z: 0 },
        { x: 150, y: 0, z: 100 },
        { x: 300, y: 0, z: 0 },
        { x: 150, y: 0, z: -100 },
      ];
      const trackPath = [
        { x: 0, y: 0, z: 0 },
        { x: 75, y: 0, z: 60 },
        { x: 150, y: 0, z: 100 },
        { x: 225, y: 0, z: 60 },
        { x: 300, y: 0, z: 0 },
        { x: 225, y: 0, z: -60 },
        { x: 150, y: 0, z: -100 },
        { x: 75, y: 0, z: -60 },
      ];

      await mapsService.createMap({
        name: mapName,
        description: mapDesc || 'Custom map',
        checkpoints,
        trackPath,
        obstacles: [],
        difficulty,
        isPublic,
      });

      setMessage('Map saved successfully!');
      setTimeout(() => navigate('maps'), 1500);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to save map');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="editor-container">
      <h1>{t('editor.title')}</h1>

      <div className="editor-canvas">
        <div className="canvas-placeholder">
          {t('editor.drawTrack')} - Track will be auto-generated
        </div>
      </div>

      <div className="editor-controls">
        <div className="control-group">
          <label>{t('editor.mapName')}</label>
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            placeholder={t('editor.mapName')}
          />
        </div>

        <div className="control-group">
          <label>{t('editor.mapDescription')}</label>
          <textarea
            value={mapDesc}
            onChange={(e) => setMapDesc(e.target.value)}
            placeholder={t('editor.mapDescription')}
          ></textarea>
        </div>

        <div className="control-group">
          <label>Difficulty (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={difficulty}
            onChange={(e) => setDifficulty(parseInt(e.target.value) || 3)}
          />
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            {t('editor.isPublic')}
          </label>
        </div>

        <div className="editor-buttons">
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
          <button onClick={() => navigate('maps')} className="btn-secondary">
            {t('common.cancel')}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Failed') || message.includes('required') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapEditor;
