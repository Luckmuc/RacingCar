import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }),

  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  getProfile: () => api.get('/auth/profile'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  changeUsername: (newUsername: string, password: string) =>
    api.put('/auth/change-username', { newUsername, password }),
};

export const leaderboardService = {
  getLeaderboard: (mapId: string, limit?: number) =>
    api.get(`/leaderboard/${mapId}`, { params: { limit } }),

  getUserPosition: (mapId: string, userId: string) =>
    api.get(`/leaderboard/${mapId}/user/${userId}`),

  getGlobalLeaderboard: (limit?: number) =>
    api.get('/leaderboard/global/top', { params: { limit } }),

  saveRace: (data: any) =>
    api.post('/leaderboard/race/save', data),
};

export const carsService = {
  getAllCars: () => api.get('/cars'),

  getOwnedCars: () => api.get('/cars/owned'),

  buyCar: (carId: number) => api.post(`/cars/buy/${carId}`),

  repairCar: (carId: number) => api.post(`/cars/repair/${carId}`),
};

export const mapsService = {
  getPublicMaps: () => api.get('/maps'),

  getUserMaps: () => api.get('/maps/user/maps'),

  getMap: (mapId: string) => api.get(`/maps/${mapId}`),

  createMap: (data: any) => api.post('/maps', data),

  updateMap: (mapId: string, data: any) => api.put(`/maps/${mapId}`, data),

  deleteMap: (mapId: string) => api.delete(`/maps/${mapId}`),

  clearAllMaps: () => api.delete('/maps/admin/clear-all'),

  uploadAsset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/maps/upload-asset', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
