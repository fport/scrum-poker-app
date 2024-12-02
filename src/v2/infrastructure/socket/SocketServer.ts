import { Server, Socket } from 'socket.io';
import { Logger } from '../../../v1/utils/logger';
import { RoomService } from '../../domain/services/RoomService';
import { User } from '../../domain/entities/User';
import { RoomEventType } from '../../domain/events/RoomEvents';

export class SocketServer {
  private static instance: SocketServer;
  private io: Server;
  private roomService: RoomService;

  private constructor(io: Server, roomService: RoomService) {
    this.io = io;
    this.roomService = roomService;
    this.setupSocketHandlers();
  }

  public static getInstance(io: Server, roomService: RoomService): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer(io, roomService);
    }
    return SocketServer.instance;
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      Logger.info('New socket connection:', { socketId: socket.id });

      socket.on('createRoom', async (data: { 
        roomId: string; 
        userName: string; 
        teamName: string; 
        isScrumMaster: boolean; 
      }) => {
        try {
          const user = new User(socket.id, data.userName, data.isScrumMaster);
          const room = await this.roomService.createRoom(data.roomId, data.teamName, user);
          
          await socket.join(data.roomId);
          this.io.to(data.roomId).emit(RoomEventType.ROOM_CREATED, room.toJSON());
        } catch (error: any) {
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('joinRoom', async (data: { 
        roomId: string; 
        userName: string; 
        isScrumMaster: boolean; 
      }) => {
        try {
          const user = new User(socket.id, data.userName, data.isScrumMaster);
          const room = await this.roomService.joinRoom(data.roomId, user);
          
          await socket.join(data.roomId);
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('vote', async (data: { roomId: string; vote: string; }) => {
        try {
          const room = await this.roomService.submitVote(data.roomId, socket.id, data.vote);
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('toggleVotes', async (data: { roomId: string; }) => {
        try {
          const room = await this.roomService.toggleVotes(data.roomId, socket.id);
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('startNewTask', async (data: { roomId: string; taskName: string; }) => {
        try {
          const room = await this.roomService.startNewTask(data.roomId, socket.id, data.taskName);
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
          this.io.to(data.roomId).emit(RoomEventType.NEW_TASK_STARTED, { taskName: data.taskName });
        } catch (error: any) {
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('disconnect', async () => {
        try {
          Logger.info('User disconnected:', { socketId: socket.id });
          
          const rooms = await this.roomService.handleUserDisconnect(socket.id);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          
          for (const room of rooms) {
            await new Promise(resolve => setTimeout(resolve, 50));
            this.io.to(room.id).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
          }
        } catch (error: any) {
          Logger.error('Error handling disconnect:', error);
        }
      });
    });
  }
}
