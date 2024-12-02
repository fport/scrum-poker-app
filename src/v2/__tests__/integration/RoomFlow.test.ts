import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import { AddressInfo } from 'net';
import { MongoRoomRepository } from '../../infrastructure/database/mongoose/repositories/MongoRoomRepository';
import { RoomService } from '../../domain/services/RoomService';
import { SocketServer } from '../../infrastructure/socket/SocketServer';
import { RoomEventType } from '../../domain/events/RoomEvents';

process.env.TEST_SUITE = 'integration';

describe('Room Flow Integration', () => {
  let io: Server;
  let httpServer: any;
  let clientSocket1: any;
  let clientSocket2: any;
  let repository: MongoRoomRepository;
  let roomService: RoomService;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    
    repository = new MongoRoomRepository();
    roomService = new RoomService(repository);
    SocketServer.getInstance(io, roomService);

    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      const url = `http://localhost:${port}`;
      clientSocket1 = Client(url);
      clientSocket2 = Client(url);
      done();
    });
  });

  afterAll(() => {
    io.close();
    clientSocket1.close();
    clientSocket2.close();
    httpServer.close();
  });

  it('should handle complete planning poker flow', (done) => {
    const roomId = 'test-room-flow';
    const teamName = 'Test Team';

    // Scrum Master creates room
    clientSocket1.emit('createRoom', {
      roomId,
      userName: 'Scrum Master',
      teamName,
      isScrumMaster: true
    });

    clientSocket1.on(RoomEventType.ROOM_CREATED, (data: any) => {
      expect(data.id).toBe(roomId);
      expect(data.teamName).toBe(teamName);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].isScrumMaster).toBe(true);

      // Team member joins room
      clientSocket2.emit('joinRoom', {
        roomId,
        userName: 'Team Member',
        isScrumMaster: false
      });
    });

    clientSocket2.on(RoomEventType.ROOM_UPDATED, async (data: any) => {
      if (data.users.length === 2) {
        // Scrum master starts new task
        clientSocket1.emit('startNewTask', {
          roomId,
          taskName: 'Test Task'
        });
      }
    });

    let votesSubmitted = 0;
    const checkVotingComplete = (data: any) => {
      votesSubmitted++;
      if (votesSubmitted === 2) {
        // Scrum master reveals votes
        clientSocket1.emit('toggleVotes', { roomId });
      }
    };

    clientSocket1.on(RoomEventType.NEW_TASK_STARTED, () => {
      // Both users submit votes
      clientSocket1.emit('vote', { roomId, vote: '5' });
      clientSocket2.emit('vote', { roomId, vote: '8' });
    });

    clientSocket1.on(RoomEventType.ROOM_UPDATED, checkVotingComplete);
    clientSocket2.on(RoomEventType.ROOM_UPDATED, checkVotingComplete);

    clientSocket1.on(RoomEventType.ROOM_UPDATED, (data: any) => {
      if (data.showVotes) {
        expect(data.users).toHaveLength(2);
        expect(data.users.some((u: any) => u.vote === '5')).toBe(true);
        expect(data.users.some((u: any) => u.vote === '8')).toBe(true);
        done();
      }
    });
  });
}); 