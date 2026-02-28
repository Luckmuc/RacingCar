import React from 'react';
import { useNavigate } from './Router';
import '../styles/Landing.css';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-overlay">
        {/* Top right auth buttons */}
        <div className="landing-nav">
          <button onClick={() => navigate('login')} className="landing-btn landing-btn-outline">
            Login
          </button>
          <button onClick={() => navigate('register')} className="landing-btn landing-btn-primary">
            Register
          </button>
        </div>

        {/* Center content */}
        <div className="landing-center">
          <div className="landing-flag">
            <svg viewBox="0 0 64 64" className="checkered-flag" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="4" width="6" height="6" fill="#fff" />
              <rect x="14" y="4" width="6" height="6" fill="#111" />
              <rect x="20" y="4" width="6" height="6" fill="#fff" />
              <rect x="26" y="4" width="6" height="6" fill="#111" />
              <rect x="32" y="4" width="6" height="6" fill="#fff" />
              <rect x="38" y="4" width="6" height="6" fill="#111" />
              <rect x="44" y="4" width="6" height="6" fill="#fff" />
              <rect x="50" y="4" width="6" height="6" fill="#111" />

              <rect x="8" y="10" width="6" height="6" fill="#111" />
              <rect x="14" y="10" width="6" height="6" fill="#fff" />
              <rect x="20" y="10" width="6" height="6" fill="#111" />
              <rect x="26" y="10" width="6" height="6" fill="#fff" />
              <rect x="32" y="10" width="6" height="6" fill="#111" />
              <rect x="38" y="10" width="6" height="6" fill="#fff" />
              <rect x="44" y="10" width="6" height="6" fill="#111" />
              <rect x="50" y="10" width="6" height="6" fill="#fff" />

              <rect x="8" y="16" width="6" height="6" fill="#fff" />
              <rect x="14" y="16" width="6" height="6" fill="#111" />
              <rect x="20" y="16" width="6" height="6" fill="#fff" />
              <rect x="26" y="16" width="6" height="6" fill="#111" />
              <rect x="32" y="16" width="6" height="6" fill="#fff" />
              <rect x="38" y="16" width="6" height="6" fill="#111" />
              <rect x="44" y="16" width="6" height="6" fill="#fff" />
              <rect x="50" y="16" width="6" height="6" fill="#111" />

              <rect x="8" y="22" width="6" height="6" fill="#111" />
              <rect x="14" y="22" width="6" height="6" fill="#fff" />
              <rect x="20" y="22" width="6" height="6" fill="#111" />
              <rect x="26" y="22" width="6" height="6" fill="#fff" />
              <rect x="32" y="22" width="6" height="6" fill="#111" />
              <rect x="38" y="22" width="6" height="6" fill="#fff" />
              <rect x="44" y="22" width="6" height="6" fill="#111" />
              <rect x="50" y="22" width="6" height="6" fill="#fff" />

              {/* Pole */}
              <rect x="4" y="2" width="4" height="58" rx="2" fill="#888" />
              <circle cx="6" cy="2" r="3" fill="#d4af37" />
            </svg>
          </div>
          <h1 className="landing-title">RACING</h1>
          <p className="landing-subtitle">Ultimate Racing Experience</p>
          <button
            onClick={() => navigate('login')}
            className="landing-btn landing-btn-play"
          >
            PLAY NOW
          </button>
        </div>

        {/* Bottom info */}
        <div className="landing-footer">
          <span>Built with Three.js</span>
          <span>&bull;</span>
          <span>Multiplayer Racing</span>
        </div>
      </div>
    </div>
  );
};

export default Landing;
