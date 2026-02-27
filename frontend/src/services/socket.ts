import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: 3,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('authenticated', (data) => {
    if (data.success) {
      console.log('Socket authenticated');
    }
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection error (non-critical):', error.message);
  });

  return socket;
};

export const getSocket = (): Socket => {
  if (!socket) {
    throw new Error('Socket not initialized');
  }
  return socket;
};

export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
