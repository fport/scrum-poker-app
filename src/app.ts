import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { socketHandler } from './socket/socketHandler';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Static dosyalar için public klasörü
app.use(express.static(path.join(__dirname, '../public')));

// Socket.io bağlantı yönetimi
socketHandler(io);

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 