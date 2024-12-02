import { Room } from '../entities/Room';

export interface IRoomRepository {
  save(room: Room): Promise<void>;
  findById(id: string): Promise<Room | null>;
  findAll(): Promise<Room[]>;
  delete(id: string): Promise<void>;
  getActiveRoomsCount(): Promise<number>;
  getTotalRoomsCreated(): Promise<number>;
  getTotalUsersJoined(): Promise<number>;
} 