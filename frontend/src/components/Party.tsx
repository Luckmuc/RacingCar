import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from './Router';
import '../styles/Maps.css';

export const Party: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inviteUsername, setInviteUsername] = useState('');
  const [message, setMessage] = useState('');

  const handleInvite = async () => {
    if (!inviteUsername) {
      setMessage(t('party.enterUsername'));
      return;
    }

    try {
      setMessage(`${t('party.inviteReceived')}: ${inviteUsername}`);
      setInviteUsername('');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to send invite');
    }
  };

  return (
    <div className="party-container">
      <h1>{t('party.title')}</h1>

      <div className="party-card">
        <h2>{t('party.invitePlayer')}</h2>
        <div className="party-form">
          <input
            type="text"
            value={inviteUsername}
            onChange={(e) => setInviteUsername(e.target.value)}
            placeholder={t('party.enterUsername')}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          />
          <button onClick={handleInvite} className="btn-primary">
            {t('party.invitePlayer')}
          </button>
        </div>

        {message && (
          <div className={`message ${message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </div>

      <button onClick={() => navigate('home')} className="btn-secondary">
        {t('common.back')}
      </button>
    </div>
  );
};

export default Party;
