import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from './contexts/GameContext';
import { usePage, useNavigate } from './components/Router';
import { Login, Register } from './components/Auth';
import { Home } from './components/Home';
import Landing from './components/Landing';
import Garage from './components/Garage';
import Leaderboard from './components/Leaderboard';
import Race from './components/Race';
import Maps from './components/Maps';
import MapEditor from './components/MapEditor';
import Profile from './components/Profile';
import Party from './components/Party';
import { LandingScene } from './lib/RaceEngine';
import './services/i18n';
import './styles/Global.css';

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { state, logout } = useGame();
  const page = usePage();
  const navigate = useNavigate();

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const sceneRef = React.useRef<LandingScene | null>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    const scene = new LandingScene(canvasRef.current);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  const isFullscreen = page === 'race' || page === 'landing';

  const renderPage = () => {
    switch (page) {
      case 'landing':
        return <Landing />;
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
        return state.isAuthenticated ? <Home /> : <Landing />;
    }
  };

  if (isFullscreen) {
    return (
      <div className="app-fullscreen">
        <canvas ref={canvasRef} className="global-bg-canvas" />
        <div className="app-overlay-content">
          {renderPage()}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <canvas ref={canvasRef} className="global-bg-canvas" />
      <div className="app-overlay-content">
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
                  navigate('landing');
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
    </div>
  );
};

export default App;
