import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from './Router';
import '../styles/Garage.css';

export const Garage: React.FC = () => {
  const { t } = useTranslation();
  const { state, selectCar, buyCar, repairCar } = useGame();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<'owned' | 'shop'>('owned');
  const [message, setMessage] = useState('');
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  const handleSelectCar = useCallback((car: any) => {
    selectCar(car);
    setMessage(`${car.name} selected!`);
    setTimeout(() => {
      navigate('home');
    }, 900);
  }, [selectCar, navigate]);

  const handleBuyCar = async (carId: number) => {
    try {
      await buyCar(carId);
      setMessage(t('garage.carBought'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || t('garage.insufficientGems'));
    }
  };

  const handleRepairCar = async (carId: number) => {
    try {
      await repairCar(carId);
      setMessage(t('garage.carRepaired'));
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Repair failed');
    }
  };

  return (
    <div className="garage-container">
      <div className="garage-header">
        <h1>{t('garage.title')}</h1>
        <p>Gems: <span className="gem-count">{state.user?.gems || 0}</span></p>
      </div>

      {message && (
        <div className={`message ${message.includes('selected') ? 'success' : message.includes('failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="garage-bg-bar">
        <span style={{ color: '#888', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.85rem' }}>
          {hoveredModel || 'Hover over a car to see its name'}
        </span>
      </div>

      <div className="garage-tabs">
        <button
          className={`tab ${selectedTab === 'owned' ? 'active' : ''}`}
          onClick={() => setSelectedTab('owned')}
        >
          {t('garage.myCars')} ({state.ownedCars.length})
        </button>
        <button
          className={`tab ${selectedTab === 'shop' ? 'active' : ''}`}
          onClick={() => setSelectedTab('shop')}
        >
          {t('garage.allCars')} ({state.cars.length})
        </button>
      </div>

      <div className="garage-grid grid-3">
        {selectedTab === 'owned' ? (
          state.ownedCars.length > 0 ? (
            state.ownedCars.map(car => (
              <div
                key={car.id}
                className="car-card"
                onMouseEnter={() => setHoveredModel(car.name)}
                onMouseLeave={() => setHoveredModel(null)}
              >
                <h3>{car.name}</h3>
                <p>{car.description}</p>

                <div className="car-stats">
                  <div>ACC {car.acceleration}</div>
                  <div>SPD {car.maxSpeed}</div>
                  <div>HND {car.handling}</div>
                  <div>DUR {car.durability}</div>
                </div>

                <div className="condition-bar">
                  <div
                    className="condition-fill"
                    style={{ width: `${car.condition || 100}%` }}
                  ></div>
                </div>
                <small>{t('garage.condition')}: {car.condition || 100}%</small>

                <button
                  className={`btn-primary ${state.selectedCar?.id === car.id ? 'btn-selected' : ''}`}
                  onClick={() => handleSelectCar(car)}
                >
                  {state.selectedCar?.id === car.id ? 'Selected' : t('garage.selectCar')}
                </button>

                {car.condition! < 100 && (
                  <button
                    className="btn-secondary"
                    onClick={() => handleRepairCar(car.id)}
                  >
                    {t('garage.repairCar')}
                  </button>
                )}
              </div>
            ))
          ) : (
            <p>{t('garage.title')} {t('common.loading').toLowerCase()}</p>
          )
        ) : (
          state.cars.map(car => {
            const owned = state.ownedCars.some(oc => oc.id === car.id);
            return (
              <div
                key={car.id}
                className="car-card"
                onMouseEnter={() => setHoveredModel(car.name)}
                onMouseLeave={() => setHoveredModel(null)}
              >
                <h3>{car.name}</h3>
                <p>{car.description}</p>

                <div className="car-stats">
                  <div>ACC {car.acceleration}</div>
                  <div>SPD {car.maxSpeed}</div>
                  <div>HND {car.handling}</div>
                  <div>DUR {car.durability}</div>
                </div>

                <div className="price">{car.price} gems</div>

                {owned ? (
                  <div className="badge accent">{t('garage.alreadyOwned')}</div>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => handleBuyCar(car.id)}
                    disabled={(state.user?.gems ?? 0) < car.price}
                  >
                    {t('garage.buyCar')}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <button onClick={() => navigate('home')} className="btn-secondary" style={{ marginTop: '2rem' }}>
        {t('common.back')}
      </button>
    </div>
  );
};

export default Garage;
