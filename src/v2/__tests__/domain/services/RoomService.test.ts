import { RoomService } from '../../../domain/services/RoomService';
import { Room } from '../../../domain/entities/Room';
import { User } from '../../../domain/entities/User';
import { IRoomRepository } from '../../../domain/repositories/IRoomRepository';

class MockRoomRepository implements IRoomRepository {
  private rooms: Map<string, Room> = new Map();

  async save(room: Room): Promise<void> {
    this.rooms.set(room.id, room);
  }

  async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) || null;
  }

  async findAll(): Promise<Room[]> {
    return Array.from(this.rooms.values());
  }

  async delete(id: string): Promise<void> {
    this.rooms.delete(id);
  }

  async getActiveRoomsCount(): Promise<number> {
    return this.rooms.size;
  }

  async getTotalRoomsCreated(): Promise<number> {
    return this.rooms.size;
  }

  async getTotalUsersJoined(): Promise<number> {
    return Array.from(this.rooms.values()).reduce(
      (total, room) => total + room.getUserCount(),
      0
    );
  }
}

describe('RoomService', () => {
  let roomService: RoomService;
  let mockRepository: MockRoomRepository;

  beforeEach(() => {
    mockRepository = new MockRoomRepository();
    roomService = new RoomService(mockRepository);
  });

  describe('createRoom', () => {
    it('should create a new room with scrum master', async () => {
      const user = new User('user1', 'Scrum Master', true);
      const room = await roomService.createRoom('room1', 'Team A', user);

      expect(room.id).toBe('room1');
      expect(room.getUserCount()).toBe(1);
      expect(room.getUsers()[0].isScrumMaster).toBe(true);
    });

    it('should throw error when creating duplicate room', async () => {
      const user = new User('user1', 'Scrum Master', true);
      await roomService.createRoom('room1', 'Team A', user);

      await expect(
        roomService.createRoom('room1', 'Team B', user)
      ).rejects.toThrow('Room already exists');
    });
  });

  describe('joinRoom', () => {
    it('should allow user to join existing room', async () => {
      const scrumMaster = new User('user1', 'Scrum Master', true);
      await roomService.createRoom('room1', 'Team A', scrumMaster);

      const newUser = new User('user2', 'Regular User', false);
      const updatedRoom = await roomService.joinRoom('room1', newUser);

      expect(updatedRoom.getUserCount()).toBe(2);
    });

    it('should throw error when joining non-existent room', async () => {
      const user = new User('user1', 'User', false);
      await expect(
        roomService.joinRoom('non-existent', user)
      ).rejects.toThrow('Room not found');
    });
  });
}); 