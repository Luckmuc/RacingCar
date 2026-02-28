import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from './Router';
import '../styles/Party.css';

const API_BASE = '/api';

async function searchUsers(token: string, q: string): Promise<string[]> {
  if (!q || q.length < 1) return [];
  try {
    const res = await fetch(`${API_BASE}/auth/users/search?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok ? res.json() : [];
  } catch {
    return [];
  }
}

export const Party: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [inviteUsername, setInviteUsername] = useState('');
  const [message, setMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!inviteUsername) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchUsers(token, inviteUsername);
      setSuggestions(results);
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [inviteUsername, token]);

  const handleInvite = async () => {
    if (!inviteUsername) {
      setMessage(t('party.enterUsername'));
      return;
    }
    try {
      setMessage(`${t('party.inviteReceived')}: ${inviteUsername}`);
      setInviteUsername('');
      setSuggestions([]);
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Failed to send invite');
    }
  };

  const handleSuggestionClick = (name: string) => {
    setInviteUsername(name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className="party-container">
      <h1>{t('party.title')}</h1>

      <div className="party-card">
        <h2>{t('party.invitePlayer')}</h2>
        <div className="party-form">
          <div className="party-input-wrap">
            <input
              type="text"
              value={inviteUsername}
              onChange={(e) => { setInviteUsername(e.target.value); setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t('party.enterUsername')}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="party-suggestions">
                {suggestions.map(name => (
                  <div
                    key={name}
                    className="party-suggestion-item"
                    onMouseDown={() => handleSuggestionClick(name)}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
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
