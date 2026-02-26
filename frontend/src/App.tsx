import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from './contexts/GameContext';
import { usePage, useNavigate } from './components/Router';
import { Login, Register } from './components/Auth';
import { Home } from './components/Home';
import Garage from './components/Garage';
import Leaderboard from './components/Leaderboard';
import Race from './components/Race';
import Maps from './components/Maps';
import MapEditor from './components/MapEditor';
import Profile from './components/Profile';
import Party from './components/Party';
import './services/i18n';
import './styles/Global.css';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, logout } = useGame();
  const page = usePage();
  const navigate = useNavigate();

  // Auto-login is handled by GameContext

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const renderPage = () => {
    switch (page) {
      case 'login':
        return <Login />;
      case 'register':
        return <Register />;
      case 'home':
        return state.isAuthenticated ? <Home /> : <Login />;
      case 'garage':
        return state.isAuthenticated ? <Garage /> : <Login />;
      case 'leaderboard':
        return state.isAuthenticated ? <Leaderboard /> : <Login />;
      case 'race':
        return state.isAuthenticated ? <Race /> : <Login />;
      case 'maps':
        return state.isAuthenticated ? <Maps /> : <Login />;
      case 'editor':
        return state.isAuthenticated ? <MapEditor /> : <Login />;
      case 'profile':
        return state.isAuthenticated ? <Profile /> : <Login />;
      case 'party':
        return state.isAuthenticated ? <Party /> : <Login />;
      default:
        return state.isAuthenticated ? <Home /> : <Login />;
    }
  };

  return (
    <div className="app-container">
      {state.isAuthenticated && (
        <header className="header">
          <h1 onClick={() => navigate('home')} style={{ cursor: 'pointer', margin: 0 }}>
            Racing Game
          </h1>
          <div className="header-controls">
            <select
              className="language-selector"
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
            <button onClick={() => navigate('profile')} className="btn-secondary">
              {state.user?.username}
            </button>
            <button
              onClick={() => {
                logout();
                navigate('login');
              }}
              className="btn-secondary"
            >
              {t('common.logout')}
            </button>
          </div>
        </header>
      )}

      <main className="main-content">
        <div className="container">
          {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;
