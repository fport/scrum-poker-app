import { Server, Socket } from 'socket.io';

interface Room {
  id: string;
  teamName: string;
  users: User[];
  showVotes: boolean;
}

interface User {
  id: string;
  name: string;
  vote?: string;
  isScrumMaster: boolean;
}

const rooms = new Map<string, Room>();

export const socketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Scrum Master - Oda Oluşturma
    socket.on('createRoom', ({ roomId, userName, teamName, isScrumMaster }) => {
      socket.join(roomId);
      
      rooms.set(roomId, {
        id: roomId,
        teamName,
        showVotes: false,
        users: [{
          id: socket.id,
          name: userName,
          isScrumMaster
        }]
      });
      
      io.to(roomId).emit('roomUpdate', rooms.get(roomId));
    });

    // Member - Odaya Katılma
    socket.on('joinRoom', ({ roomId, userName, isScrumMaster }) => {
      socket.join(roomId);
      
      const room = rooms.get(roomId);
      if (room) {
        room.users.push({
          id: socket.id,
          name: userName,
          isScrumMaster
        });
        
        io.to(roomId).emit('roomUpdate', room);
      }
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

    // Oyları Göster/Gizle
    socket.on('toggleVotes', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user?.isScrumMaster) {
          room.showVotes = !room.showVotes;
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