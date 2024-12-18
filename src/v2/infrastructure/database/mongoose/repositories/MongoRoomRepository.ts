import { Room } from '../../../../domain/entities/Room';
import { User } from '../../../../domain/entities/User';
import { IRoomRepository } from '../../../../domain/repositories/IRoomRepository';
import { Logger } from '../../../../shared/utils/logger';
import { RoomModel } from '../models/RoomModel';

export class MongoRoomRepository implements IRoomRepository {
  async save(room: Room): Promise<void> {
    try {
      const roomData = room.toJSON();
      const users = room.getUsers().map(user => ({
        id: user.id,
        name: user.name,
        isScrumMaster: user.isScrumMaster,
        vote: user.getVote()
      }));

      Logger.info('Saving room:', { roomId: roomData.id, users });
      await RoomModel.findOneAndUpdate(
        { id: roomData.id },
        {
          ...roomData,
          users
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      Logger.error('Error saving room:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Room | null> {
    try {
      Logger.info('Finding room by ID:', { roomId: id });
      const roomDoc = await RoomModel.findOne({ id });
      if (!roomDoc) {
        Logger.info('Room not found:', { roomId: id });
        return null;
      }

      const users = roomDoc.users.map(u => {
        const user = new User(
          u.id || '',
          u.name || '',
          u.isScrumMaster || false
        );
        if (u.vote) {
          user.submitVote(u.vote);
        }
        return user;
      });

      const room = new Room(
        roomDoc.id,
        roomDoc.teamName,
        users,
        roomDoc.showVotes,
        roomDoc.currentTask,
        roomDoc.lastActivity
      );

      Logger.info('Room found:', { roomId: id, userCount: users.length });
      return room;
    } catch (error) {
      Logger.error('Error finding room:', error);
      throw error;
    }
  }

  async findAll(): Promise<Room[]> {
    try {
      const roomDocs = await RoomModel.find();
      return roomDocs.map(doc => {
        const users = doc.users.map(u => 
          new User(
            u.id || '',
            u.name || '',
            u.isScrumMaster || false
          )
        );

        return new Room(
          doc.id,
          doc.teamName,
          users,
          doc.showVotes,
          doc.currentTask,
          doc.lastActivity
        );
      });
    } catch (error) {
      Logger.error('Error finding all rooms:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await RoomModel.deleteOne({ id });
    } catch (error) {
      Logger.error('Error deleting room:', error);
      throw error;
    }
  }

  async getActiveRoomsCount(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return await RoomModel.countDocuments({
        $or: [
          { 'users.0': { $exists: true } },
          { lastActivity: { $gte: oneHourAgo } }
        ]
      });
    } catch (error) {
      Logger.error('Error getting active rooms count:', error);
      throw error;
    }
  }

  async getTotalRoomsCreated(): Promise<number> {
    try {
      return await RoomModel.countDocuments();
    } catch (error) {
      Logger.error('Error getting total rooms count:', error);
      throw error;
    }
  }

  async getTotalUsersJoined(): Promise<number> {
    try {
      const rooms = await RoomModel.find();
      return rooms.reduce((total, room) => total + room.users.length, 0);
    } catch (error) {
      Logger.error('Error getting total users count:', error);
      throw error;
    }
  }
} 