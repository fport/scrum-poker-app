import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomService } from './v2/domain/services/RoomService';
import { Database } from './v2/infrastructure/database/Database';
import { MongoRoomRepository } from './v2/infrastructure/database/mongoose/repositories/MongoRoomRepository';
import { SocketServer } from './v2/infrastructure/socket/SocketServer';
import { RoomController } from './v2/interfaces/http/controllers/RoomController';
import config from './v2/shared/config/config';
import { Logger } from './v2/shared/utils/logger';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const database = Database.getInstance();
database.connect(config.mongodb.uri)
  .catch(error => {
    Logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received. Shutting down gracefully...');
  await database.disconnect();
  process.exit(0);
});

// Dependencies
const roomRepository = new MongoRoomRepository();
const roomService = new RoomService(roomRepository);
const roomController = new RoomController(roomService);

// Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: config.nodeEnv === 'development' ? "*" : process.env.CORS_ORIGIN,
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  pingTimeout: 120000,
  pingInterval: 60000
});

// Initialize socket server
SocketServer.getInstance(io, roomService);

// HTTP routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/api/v2/rooms/status', roomController.getRoomStats);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
httpServer.listen(config.port, () => {
  Logger.info(`Server is running on port ${config.port} in ${config.nodeEnv} mode`);
});

// Global error handling
process.on('uncaughtException', (error) => {
  Logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  Logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

export default app; 