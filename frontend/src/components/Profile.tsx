import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import { authService } from '../services/api';
import '../styles/Profile.css';

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { state, loadProfile } = useGame();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'stats' | 'settings'>('stats');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Change username form
  const [newUsername, setNewUsername] = useState('');
  const [usernamePassword, setUsernamePassword] = useState('');

  if (!state.user) {
    return <div>{t('common.loading')}</div>;
  }

  const showMessage = (msg: string) => {
    setMessage(msg);
    setError('');
    setTimeout(() => setMessage(''), 4000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setMessage('');
    setTimeout(() => setError(''), 4000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }
    try {
      await authService.changePassword(currentPassword, newPassword);
      showMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handleChangeUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.length < 3) {
      showError('Username must be at least 3 characters');
      return;
    }
    try {
      const response = await authService.changeUsername(newUsername, usernamePassword);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
      }
      await loadProfile();
      showMessage('Username changed successfully');
      setNewUsername('');
      setUsernamePassword('');
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to change username');
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">{state.user.username.charAt(0).toUpperCase()}</div>
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

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats & Cars
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      {message && <div className="profile-message success">{message}</div>}
      {error && <div className="profile-message error">{error}</div>}

      {activeTab === 'stats' && (
        <div className="profile-section">
          <h2>Cars</h2>
          <div className="cars-list">
            {Array.isArray(state.ownedCars) && state.ownedCars.length > 0 ? (
              state.ownedCars.map(car => (
                <div key={car.id} className="car-summary">
                  <div 
                    className="car-color-dot" 
                    style={{ backgroundColor: car.color }}
                  ></div>
                  <div>
                    <h4>{car.name}</h4>
                    <div className="car-quick-stats">
                      {car.condition != null && (
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
      )}

      {activeTab === 'settings' && (
        <>
          <div className="profile-section">
            <h2>Change Username</h2>
            <form onSubmit={handleChangeUsername} className="settings-form">
              <div className="form-group">
                <label>New Username</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="New username"
                  minLength={3}
                  required
                />
              </div>
              <div className="form-group">
                <label>Current Password (to confirm)</label>
                <input
                  type="password"
                  value={usernamePassword}
                  onChange={e => setUsernamePassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
              <button type="submit" className="btn-primary">Change Username</button>
            </form>
          </div>

          <div className="profile-section">
            <h2>Change Password</h2>
            <form onSubmit={handleChangePassword} className="settings-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  minLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={6}
                  required
                />
              </div>
              <button type="submit" className="btn-primary">Change Password</button>
            </form>
          </div>
        </>
      )}

      <button onClick={() => navigate('home')} className="btn-secondary">
        {t('common.back')}
      </button>
    </div>
  );
};

export default Profile;
