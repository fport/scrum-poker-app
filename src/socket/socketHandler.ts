import { Server, Socket } from 'socket.io';

interface Room {
  id: string;
  users: User[];
}

interface User {
  id: string;
  name: string;
  vote?: string;
}

const rooms = new Map<string, Room>();

export const socketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Odaya katılma
    socket.on('joinRoom', ({ roomId, userName }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { id: roomId, users: [] });
      }

      const room = rooms.get(roomId)!;
      room.users.push({ id: socket.id, name: userName });
      
      io.to(roomId).emit('roomUpdate', room);
    });

    // Oy verme
    socket.on('vote', ({ roomId, vote }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user) {
          user.vote = vote;
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        room.users = room.users.filter(u => u.id !== socket.id);
        if (room.users.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('roomUpdate', room);
        }
      });
    });
  });
}; 