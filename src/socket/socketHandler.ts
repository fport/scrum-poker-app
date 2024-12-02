import { Server, Socket } from 'socket.io';
import { Logger } from '../v2/shared/utils/logger';

interface Room {
  id: string;
  teamName: string;
  users: User[];
  showVotes: boolean;
  currentTask?: string;
  lastActivity: number;
}

interface User {
  id: string;
  name: string;
  vote?: string;
  isScrumMaster: boolean;
}

export const rooms = new Map<string, Room>();
export const roomStats = new Map<string, RoomStats>();

interface RoomStats {
  totalConnections: number;
  totalVotes: number;
  averageResponseTime: number;
}

export const socketHandler = (io: Server) => {
  io.engine.opts.pingTimeout = 20000;
  io.engine.opts.pingInterval = 10000;

  const ROOM_CLEANUP_INTERVAL = 1000 * 60 * 30; // 30 minutes
  const ROOM_INACTIVE_THRESHOLD = 1000 * 60 * 60; // 1 hour

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      if (room.users.length === 0 && (now - room.lastActivity) > ROOM_INACTIVE_THRESHOLD) {
        console.log(`Cleaning up inactive room: ${roomId}`);
        rooms.delete(roomId);
      }
    });
  }, ROOM_CLEANUP_INTERVAL);

  setInterval(() => {
    Logger.info('Current Room Statistics:', {
      totalRooms: rooms.size,
      roomStats: Object.fromEntries(roomStats)
    });
  }, 60000);

  setInterval(() => {
    Logger.info('Active Connections and Rooms:', {
      activeConnections: io.engine.clientsCount,
      connectedSockets: Array.from(io.sockets.sockets.keys()),
      rooms: Array.from(rooms.entries()).map(([roomId, room]) => ({
        roomId,
        userCount: room.users.length,
        users: room.users.map(u => ({
          id: u.id,
          name: u.name,
          isConnected: io.sockets.sockets.has(u.id)
        }))
      }))
    });
  }, 5000);

  io.on('connection', (socket: Socket) => {
    Logger.info('New socket connection:', { 
      socketId: socket.id,
      totalConnections: io.engine.clientsCount,
      activeRooms: rooms.size
    });

    const connectionStartTime = Date.now();
    Logger.info('User connected', { socketId: socket.id, timestamp: connectionStartTime });

    let messageCount = 0;
    let lastActivity = Date.now();

    socket.onAny((eventName, ...args) => {
      messageCount++;
      lastActivity = Date.now();
      Logger.debug(`Socket Event Received: ${eventName}`, { socketId: socket.id, args });
    });

    socket.on('createRoom', ({ roomId, userName, teamName, isScrumMaster }) => {
      Logger.debug('Creating room:', { 
        socketId: socket.id,
        roomId, 
        userName, 
        teamName, 
        isScrumMaster,
        existingRooms: Array.from(rooms.keys())
      });
      Logger.debug('createRoom event received', { roomId, userName, teamName, isScrumMaster });
      try {
        if (!roomId || !userName || !teamName) {
          throw new Error('Missing required fields');
        }

        socket.join(roomId);
        
        const newRoom = {
          id: roomId,
          teamName,
          showVotes: false,
          currentTask: '',
          users: [{
            id: socket.id,
            name: userName,
            isScrumMaster
          }],
          lastActivity: Date.now()
        };
        
        rooms.set(roomId, newRoom);

        roomStats.set(roomId, {
          totalConnections: 1,
          totalVotes: 0,
          averageResponseTime: 0
        });
        
        Logger.info('Room created successfully', { 
          roomId, 
          userName, 
          teamName,
          roomData: newRoom 
        });
        
        io.to(roomId).emit('roomUpdate', newRoom);
      } catch (error: any) {
        Logger.error('Error creating room', {
          error,
          payload: { roomId, userName, teamName, isScrumMaster }
        });
        socket.emit('error', { message: 'Failed to create room', details: error.message });
      }
    });

    const updateRoomActivity = (roomId: string) => {
      const room = rooms.get(roomId);
      if (room) {
        room.lastActivity = Date.now();
      }
    };

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
        
        updateRoomActivity(roomId);
        io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('vote', ({ roomId, vote }) => {
      try {
        const room = rooms.get(roomId);
        if (room) {
          const user = room.users.find(u => u.id === socket.id);
          if (user) {
            user.vote = vote;
            updateRoomActivity(roomId);
            
            const stats = roomStats.get(roomId);
            if (stats) {
              stats.totalVotes++;
            }
            
            Logger.info('Vote submitted', { roomId, userId: socket.id, vote });
            io.to(roomId).emit('roomUpdate', room);
            return { success: true };
          }
        }
        return { error: 'Failed to submit vote' };
      } catch (error) {
        Logger.error('Error processing vote', error);
        return { error: 'Internal server error' };
      }
    });

    socket.on('toggleVotes', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user?.isScrumMaster) {
          room.showVotes = !room.showVotes;
          updateRoomActivity(roomId);
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    });

    socket.on('startNewTask', ({ roomId, taskName }) => {
      const room = rooms.get(roomId);
      if (room) {
        const user = room.users.find(u => u.id === socket.id);
        if (user?.isScrumMaster) {
          room.users.forEach(u => u.vote = undefined);
          room.showVotes = false;
          room.currentTask = taskName;
          
          updateRoomActivity(roomId);
          io.to(roomId).emit('roomUpdate', room);
          io.to(roomId).emit('newTaskStarted', { taskName });
        }
      }
    });

    socket.on('disconnect', () => {
      const connectionDuration = Date.now() - connectionStartTime;
      Logger.info('User disconnected', {
        socketId: socket.id,
        connectionDuration,
        messageCount,
        lastActivity
      });

      rooms.forEach((room, roomId) => {
        const userIndex = room.users.findIndex(u => u.id === socket.id);
        if (userIndex !== -1) {
          setTimeout(() => {
            const room = rooms.get(roomId);
            if (room) {
              room.users = room.users.filter(u => u.id !== socket.id);
              if (room.users.length === 0) {
                rooms.delete(roomId);
              } else {
                io.to(roomId).emit('roomUpdate', room);
              }
            }
          }, 5000);
        }
      });
    });

    socket.on('error', (error) => {
      Logger.error('Socket error', error);
    });
  });
}; 