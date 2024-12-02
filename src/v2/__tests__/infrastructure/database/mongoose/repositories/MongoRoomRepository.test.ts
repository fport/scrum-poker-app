import { MongoRoomRepository } from '../../../../../infrastructure/database/mongoose/repositories/MongoRoomRepository';
import { Room } from '../../../../../domain/entities/Room';
import { User } from '../../../../../domain/entities/User';
import { RoomModel } from '../../../../../infrastructure/database/mongoose/models/RoomModel';

// Repository testleri için MongoDB'yi kullan
process.env.TEST_SUITE = 'repository';

describe('MongoRoomRepository', () => {
  let repository: MongoRoomRepository;

  beforeEach(() => {
    repository = new MongoRoomRepository();
  });

  describe('save', () => {
    it('should save room to database', async () => {
      const user = new User('user1', 'Test User', true);
      const room = new Room('room1', 'Test Team');
      room.addUser(user);

      await repository.save(room);

      const savedRoom = await RoomModel.findOne({ id: 'room1' });
      expect(savedRoom).toBeTruthy();
      expect(savedRoom?.teamName).toBe('Test Team');
      expect(savedRoom?.users).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find room by id', async () => {
      const user = new User('user1', 'Test User', true);
      const room = new Room('room1', 'Test Team');
      room.addUser(user);
      await repository.save(room);

      const foundRoom = await repository.findById('room1');
      expect(foundRoom).toBeTruthy();
      expect(foundRoom?.id).toBe('room1');
      expect(foundRoom?.getUsers()).toHaveLength(1);
    });

    it('should return null for non-existent room', async () => {
      const room = await repository.findById('non-existent');
      expect(room).toBeNull();
    });
  });
}); 