import { Server, Socket } from 'socket.io';

interface Room {
  id: string;
  teamName: string;
  users: User[];
  showVotes: boolean;
  currentTask?: string;
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
        currentTask: '',
        users: []
      });
      
      io.to(roomId).emit('roomUpdate', rooms.get(roomId));
    });

    // Member - Odaya Katılma
    socket.on('joinRoom', ({ roomId, userName, isScrumMaster }) => {
      console.log("osman3", roomId, userName, isScrumMaster);
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
      console.log(`Vote received for room ${roomId}: ${vote}`);
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user) {
          user.vote = vote;
          io.to(roomId).emit('roomUpdate', room);
          return { success: true };
        }
      }
      return { error: 'Failed to submit vote' };
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

    // Yeni task başlatma
    socket.on('startNewTask', ({ roomId, taskName }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user?.isScrumMaster) {
          // Oyları sıfırla ve yeni task'i ayarla
          room.users.forEach(u => u.vote = undefined);
          room.showVotes = false;
          room.currentTask = taskName;
          
          io.to(roomId).emit('roomUpdate', room);
          io.to(roomId).emit('newTaskStarted', { taskName });
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