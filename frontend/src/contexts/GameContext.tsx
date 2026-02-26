import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, Car, Map, GameState } from '../types';
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

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login(username, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));

    // Initialize WebSocket
    initializeSocket(token);

    // Load user data
    await loadProfile();
    await loadCars();
    await loadMaps();
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const response = await authService.register(username, password);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
    }));

    initializeSocket(token);
    await loadProfile();
    await loadCars();
    await loadMaps();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    closeSocket();
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
      
      setState(prev => ({
        ...prev,
        cars: allCarsResponse.data,
        ownedCars: ownedCarsResponse.data,
      }));
    } catch (error) {
      console.error('Failed to load cars:', error);
    }
  }, []);

  const loadMaps = useCallback(async () => {
    try {
      const publicMapsResponse = await mapsService.getPublicMaps();
      const userMapsResponse = await mapsService.getUserMaps();
      
      setState(prev => ({
        ...prev,
        maps: publicMapsResponse.data,
        userMaps: userMapsResponse.data,
      }));
    } catch (error) {
      console.error('Failed to load maps:', error);
    }
  }, []);

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
