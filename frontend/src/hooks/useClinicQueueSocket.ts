import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DoctorQueueData {
  id: number;
  name: string;
  room: string;
  queue: any[];
  currentPatient: any | null;
  etaPerPatient: number;
  baselineETA: number;
  isPaused: boolean;
}

export interface QueueData {
  doctors: DoctorQueueData[];
}

const DEFAULT_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const useClinicQueueSocket = (serverUrl: string = DEFAULT_URL) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [queueData, setQueueData] = useState<QueueData>({
    doctors: []
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const passcode = localStorage.getItem('clinic-auth-passcode') || '';
    
    const socketInstance = io(serverUrl, {
      auth: {
        passcode
      },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // Fetch absolute source of truth on reconnect to catch missed events
      socketInstance.emit('request_sync');
    });

    socketInstance.on('queue_updated', (newData: QueueData) => {
      setQueueData(newData);
    });

    socketInstance.on('connect_error', () => {
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...'); 
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...'); 
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [serverUrl]);

  return { socket, isConnected, queueData, error };
};
