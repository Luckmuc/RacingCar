import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Car, Map, GameState } from '../types';
import { authService, carsService, mapsService } from '../services/api';
import { initializeSocket, closeSocket } from '../services/socket';

interface GameContextType {
  state: GameState;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  loadCars: () => Promise<void>;
  loadMaps: () => Promise<void>;
  selectCar: (car: Car) => void;
  selectMap: (map: Map) => void;
  buyCar: (carId: number) => Promise<void>;
  repairCar: (carId: number) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>({
    user: null,
    isAuthenticated: false,
    cars: [],
    ownedCars: [],
    selectedCar: null,
    maps: [],
    userMaps: [],
    selectedMap: null,
  });

  const loadProfile = useCallback(async () => {
    try {
      const response = await authService.getProfile();
      setState(prev => ({
        ...prev,
        user: response.data,
      }));
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, []);

  const loadCars = useCallback(async () => {
    try {
      const allCarsResponse = await carsService.getAllCars();
      const ownedCarsResponse = await carsService.getOwnedCars();
      
      const allCars = Array.isArray(allCarsResponse.data) ? allCarsResponse.data : [];
      const ownedCars = Array.isArray(ownedCarsResponse.data) ? ownedCarsResponse.data : [];
      setState(prev => ({
        ...prev,
        cars: allCars,
        ownedCars,
        // Auto-select first owned car if none selected
        selectedCar: prev.selectedCar || (ownedCars.length > 0 ? ownedCars[0] : null),
      }));
    } catch (error) {
      console.error('Failed to load cars:', error);
    }
  }, []);

  const loadMaps = useCallback(async () => {
    try {
      const publicMapsResponse = await mapsService.getPublicMaps();
      const publicMaps = Array.isArray(publicMapsResponse.data) ? publicMapsResponse.data : [];
      let userMaps: any[] = [];
      try {
        const userMapsResponse = await mapsService.getUserMaps();
        userMaps = Array.isArray(userMapsResponse.data) ? userMapsResponse.data : [];
      } catch {
        // User may not have maps yet
      }
      
      setState(prev => ({
        ...prev,
        maps: publicMaps,
        userMaps,
        selectedMap: prev.selectedMap || (publicMaps.length > 0 ? publicMaps[0] : null),
      }));
    } catch (error) {
      console.error('Failed to load maps:', error);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([loadProfile(), loadCars(), loadMaps()]);
  }, [loadProfile, loadCars, loadMaps]);

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login(username, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));

    try { initializeSocket(token); } catch (e) { console.error('Socket init failed:', e); }

    // Load data after token is stored
    await loadAllData();
  }, [loadAllData]);

  const register = useCallback(async (username: string, password: string) => {
    const response = await authService.register(username, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));

    try { initializeSocket(token); } catch (e) { console.error('Socket init failed:', e); }
    await loadAllData();
  }, [loadAllData]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    try { closeSocket(); } catch (e) { /* ignore */ }
    setState({
      user: null,
      isAuthenticated: false,
      cars: [],
      ownedCars: [],
      selectedCar: null,
      maps: [],
      userMaps: [],
      selectedMap: null,
    });
  }, []);

  // Auto-login on mount if token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setState(prev => ({ ...prev, isAuthenticated: true }));
      try { initializeSocket(token); } catch (e) { console.error('Socket init failed:', e); }
      loadAllData().catch(() => {
        // Token expired or invalid
        localStorage.removeItem('token');
        setState(prev => ({ ...prev, isAuthenticated: false }));
      });
    }
  }, [loadAllData]);

  const selectCar = useCallback((car: Car) => {
    setState(prev => ({
      ...prev,
      selectedCar: car,
    }));
  }, []);

  const selectMap = useCallback((map: Map) => {
    setState(prev => ({
      ...prev,
      selectedMap: map,
    }));
  }, []);

  const buyCar = useCallback(async (carId: number) => {
    try {
      await carsService.buyCar(carId);
      await loadCars();
      await loadProfile();
    } catch (error) {
      console.error('Failed to buy car:', error);
      throw error;
    }
  }, [loadCars, loadProfile]);

  const repairCar = useCallback(async (carId: number) => {
    try {
      await carsService.repairCar(carId);
      await loadCars();
      await loadProfile();
    } catch (error) {
      console.error('Failed to repair car:', error);
      throw error;
    }
  }, [loadCars, loadProfile]);

  const value: GameContextType = {
    state,
    login,
    register,
    logout,
    loadProfile,
    loadCars,
    loadMaps,
    selectCar,
    selectMap,
    buyCar,
    repairCar,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
