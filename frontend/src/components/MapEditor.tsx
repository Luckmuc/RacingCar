import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, usePageParams } from './Router';
import '../styles/Maps.css';

export const MapEditor: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = usePageParams();
  const [mapName, setMapName] = useState('');
  const [mapDesc, setMapDesc] = useState('');
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!mapName) {
      setMessage(t('editor.mapName') + ' required');
      return;
    }

    try {
      setMessage('Map saved successfully!');
      setTimeout(() => navigate('maps'), 1500);
    } catch (error) {
      setMessage('Failed to save map');
    }
  };

  return (
    <div className="editor-container">
      <h1>✏️ {t('editor.title')}</h1>

      <div className="editor-canvas">
        <div className="canvas-placeholder">
          {t('editor.drawTrack')} - [3D Map Editor Canvas]
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

        <div className="editor-buttons">
          <button onClick={handleSave} className="btn-primary">
            💾 {t('common.save')}
          </button>
          <button onClick={() => navigate('maps')} className="btn-secondary">
            {t('common.cancel')}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapEditor;
