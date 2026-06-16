import { io } from 'socket.io-client';

// Connect to backend server on port 3001
const socket = io('http://localhost:3001');

export default socket;
