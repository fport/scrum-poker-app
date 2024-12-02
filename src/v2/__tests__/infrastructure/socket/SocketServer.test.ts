import { Server } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import { AddressInfo } from 'net';
import { SocketServer } from '../../../infrastructure/socket/SocketServer';
import { RoomService } from '../../../domain/services/RoomService';
import { Room } from '../../../domain/entities/Room';
import { User } from '../../../domain/entities/User';
import { RoomEventType } from '../../../domain/events/RoomEvents';

describe('SocketServer', () => {
  let io: Server;
  let serverSocket: any;
  let clientSocket: any;
  let httpServer: any;
  let roomService: RoomService;
  let socketServer: SocketServer;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      clientSocket = Client(`http://localhost:${port}`);
      
      roomService = {
        createRoom: jest.fn(),
        joinRoom: jest.fn(),
        submitVote: jest.fn(),
        toggleVotes: jest.fn(),
        startNewTask: jest.fn(),
        handleUserDisconnect: jest.fn(),
      } as unknown as RoomService;

      socketServer = SocketServer.getInstance(io, roomService);
      
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(async () => {
    await io.close();
    await clientSocket.close();
    await httpServer.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a room successfully', (done) => {
      const mockRoom = new Room('test-room', 'Test Team');
      const mockUser = new User('user1', 'Test User', true);
      mockRoom.addUser(mockUser);

      (roomService.createRoom as jest.Mock).mockResolvedValueOnce(mockRoom);

      clientSocket.emit('createRoom', {
        roomId: 'test-room',
        userName: 'Test User',
        teamName: 'Test Team',
        isScrumMaster: true
      });

      clientSocket.on(RoomEventType.ROOM_CREATED, (data: any) => {
        expect(data.id).toBe('test-room');
        expect(data.teamName).toBe('Test Team');
        expect(data.users).toHaveLength(1);
        expect(data.users[0].name).toBe('Test User');
        done();
      });
    });

    it('should handle room creation error', (done) => {
      (roomService.createRoom as jest.Mock).mockRejectedValueOnce(
        new Error('Room already exists')
      );

      clientSocket.emit('createRoom', {
        roomId: 'test-room',
        userName: 'Test User',
        teamName: 'Test Team',
        isScrumMaster: true
      });

      clientSocket.on(RoomEventType.ERROR, (data: any) => {
        expect(data.message).toBe('Room already exists');
        done();
      });
    });
  });

  describe('joinRoom', () => {
    it('should allow user to join room', (done) => {
      const mockRoom = new Room('test-room', 'Test Team');
      const mockUser = new User('user1', 'Test User', false);
      mockRoom.addUser(mockUser);

      (roomService.joinRoom as jest.Mock).mockResolvedValueOnce(mockRoom);

      clientSocket.emit('joinRoom', {
        roomId: 'test-room',
        userName: 'Test User',
        isScrumMaster: false
      });

      clientSocket.on(RoomEventType.ROOM_UPDATED, (data: any) => {
        expect(data.id).toBe('test-room');
        expect(data.users).toHaveLength(1);
        expect(data.users[0].name).toBe('Test User');
        done();
      });
    });
  });

  describe('vote', () => {
    it('should handle vote submission', (done) => {
      const mockRoom = new Room('test-room', 'Test Team');
      const mockUser = new User('user1', 'Test User', false);
      mockUser.submitVote('5');
      mockRoom.addUser(mockUser);

      (roomService.submitVote as jest.Mock).mockResolvedValueOnce(mockRoom);

      clientSocket.emit('vote', {
        roomId: 'test-room',
        vote: '5'
      });

      clientSocket.on(RoomEventType.ROOM_UPDATED, (data: any) => {
        expect(data.users[0].vote).toBe('5');
        done();
      });
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      // Ensure clean state before each test
      if (!clientSocket.connected) {
        await new Promise<void>((resolve) => {
          clientSocket.connect();
          clientSocket.on('connect', resolve);
        });
      }
    });

    afterEach(async () => {
      // Clean up after each test
      if (clientSocket.connected) {
        await new Promise<void>((resolve) => {
          clientSocket.disconnect();
          resolve();
        });
      }
    });

    it('should update room when user disconnects', async () => {
      const mockRoom = new Room('test-room', 'Test Team');
      const mockUser = new User(clientSocket.id, 'Test User', false);
      mockRoom.addUser(mockUser);

      (roomService.handleUserDisconnect as jest.Mock).mockResolvedValueOnce([mockRoom]);
      (roomService.joinRoom as jest.Mock).mockResolvedValueOnce(mockRoom);

      // First, wait for the join room event
      const joinPromise = waitForEvent(clientSocket, RoomEventType.ROOM_UPDATED);
      
      clientSocket.emit('joinRoom', {
        roomId: 'test-room',
        userName: 'Test User',
        isScrumMaster: false
      });

      await joinPromise;

      // Then handle disconnect
      const disconnectPromise = new Promise<void>((resolve, reject) => {
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          clearTimeout(timeoutId);
          serverSocket.removeAllListeners('disconnect');
        };

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Disconnect event timeout'));
        }, 5000);

        serverSocket.once('disconnect', async () => {
          try {
            await new Promise(r => setTimeout(r, 200));
            expect(roomService.handleUserDisconnect).toHaveBeenCalledWith(clientSocket.id);
            cleanup();
            resolve();
          } catch (error) {
            cleanup();
            reject(error);
          }
        });

        // Trigger disconnect
        clientSocket.disconnect();
      });

      await disconnectPromise;
    }, 10000);
  });

  // Yardımcı fonksiyonlar
  const waitForEvent = (socket: any, event: string, timeout = 5000): Promise<any> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Event ${event} timeout after ${timeout}ms`));
      }, timeout);

      socket.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  };

  const waitForSocketOperation = async (operation: () => void, delay = 100): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, delay));
    operation();
    await new Promise(resolve => setTimeout(resolve, delay));
  };
}); 