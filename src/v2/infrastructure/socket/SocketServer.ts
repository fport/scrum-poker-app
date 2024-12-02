import { Server, Socket } from 'socket.io';
import { User } from '../../domain/entities/User';
import { RoomEventType } from '../../domain/events/RoomEvents';
import { RoomService } from '../../domain/services/RoomService';
import { Logger } from '../../shared/utils/logger';

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
          Logger.info('Creating room:', { ...data, socketId: socket.id });
          const user = new User(socket.id, data.userName, data.isScrumMaster);
          const room = await this.roomService.createRoom(data.roomId, data.teamName, user);
          
          await socket.join(data.roomId);
          Logger.info('Room created successfully:', { roomId: data.roomId, userId: socket.id });
          this.io.to(data.roomId).emit(RoomEventType.ROOM_CREATED, room.toJSON());
        } catch (error: any) {
          Logger.error('Error creating room:', { error: error.message, data });
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('joinRoom', async (data: { 
        roomId: string; 
        userName: string; 
        isScrumMaster: boolean; 
      }) => {
        try {
          Logger.info('Joining room:', { ...data, socketId: socket.id });
          const user = new User(socket.id, data.userName, data.isScrumMaster);
          const room = await this.roomService.joinRoom(data.roomId, user);
          
          await socket.join(data.roomId);
          Logger.info('User joined room successfully:', { roomId: data.roomId, userId: socket.id });
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          Logger.error('Error joining room:', { error: error.message, data });
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('vote', async (data: { roomId: string; vote: string; }) => {
        try {
          Logger.info('Processing vote:', { ...data, socketId: socket.id });
          const room = await this.roomService.submitVote(data.roomId, socket.id, data.vote);
          Logger.info('Vote submitted successfully:', { roomId: data.roomId, userId: socket.id });
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          Logger.error('Error submitting vote:', { error: error.message, data });
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('toggleVotes', async (data: { roomId: string; }) => {
        try {
          Logger.info('Toggling votes:', { ...data, socketId: socket.id });
          const room = await this.roomService.toggleVotes(data.roomId, socket.id);
          Logger.info('Votes toggled successfully:', { roomId: data.roomId, userId: socket.id });
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
        } catch (error: any) {
          Logger.error('Error toggling votes:', { error: error.message, data });
          socket.emit(RoomEventType.ERROR, { message: error.message });
        }
      });

      socket.on('startNewTask', async (data: { roomId: string; taskName: string; }) => {
        try {
          Logger.info('Starting new task:', { ...data, socketId: socket.id });
          const room = await this.roomService.startNewTask(data.roomId, socket.id, data.taskName);
          Logger.info('New task started successfully:', { roomId: data.roomId, userId: socket.id });
          this.io.to(data.roomId).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
          this.io.to(data.roomId).emit(RoomEventType.NEW_TASK_STARTED, { taskName: data.taskName });
        } catch (error: any) {
          Logger.error('Error starting new task:', { error: error.message, data });
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
            Logger.info('Updating room after user disconnect:', { roomId: room.id });
            this.io.to(room.id).emit(RoomEventType.ROOM_UPDATED, room.toJSON());
          }
        } catch (error: any) {
          Logger.error('Error handling disconnect:', error);
        }
      });
    });
  }
}
