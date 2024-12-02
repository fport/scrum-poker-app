import { Room } from '../entities/Room';
import { User } from '../entities/User';
import { IRoomRepository } from '../repositories/IRoomRepository';

export class RoomService {
  constructor(private roomRepository: IRoomRepository) {}

  public async createRoom(roomId: string, teamName: string, user: User): Promise<Room> {
    const existingRoom = await this.roomRepository.findById(roomId);
    if (existingRoom) {
      throw new Error('Room already exists');
    }

    const room = new Room(roomId, teamName);
    room.addUser(user);
    await this.roomRepository.save(room);
    return room;
  }

  public async joinRoom(roomId: string, user: User): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.addUser(user);
    await this.roomRepository.save(room);
    return room;
  }

  public async submitVote(roomId: string, userId: string, vote: string): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    const users = room.getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found in room');
    }

    user.submitVote(vote);
    await this.roomRepository.save(room);
    return room;
  }

  public async toggleVotes(roomId: string, userId: string): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.toggleVotes(userId);
    await this.roomRepository.save(room);
    return room;
  }

  public async startNewTask(roomId: string, userId: string, taskName: string): Promise<Room> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.startNewTask(userId, taskName);
    await this.roomRepository.save(room);
    return room;
  }

  public async handleUserDisconnect(userId: string): Promise<Room[]> {
    const rooms = await this.roomRepository.findAll();
    const updatedRooms: Room[] = [];

    for (const room of rooms) {
      const users = room.getUsers();
      if (users.some(u => u.id === userId)) {
        room.removeUser(userId);
        await this.roomRepository.save(room);
        updatedRooms.push(room);
      }
    }

    return updatedRooms;
  }

  public async getActiveRoomsCount(): Promise<number> {
    return this.roomRepository.getActiveRoomsCount();
  }

  public async getTotalRoomsCreated(): Promise<number> {
    return this.roomRepository.getTotalRoomsCreated();
  }

  public async getTotalUsersJoined(): Promise<number> {
    return this.roomRepository.getTotalUsersJoined();
  }

  public async getAllRooms(): Promise<Room[]> {
    return this.roomRepository.findAll();
  }
}
