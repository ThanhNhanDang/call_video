import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupSocketHandlers } from './socket.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration - cho phép frontend kết nối
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'WebRTC Signaling Server is running' });
});

// Socket.IO setup với CORS
const io = new Server(httpServer, {
    cors: {
        origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Setup socket event handlers
setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Socket.IO signaling server ready`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});
