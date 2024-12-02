import { Room } from '../../../../domain/entities/Room';
import { User } from '../../../../domain/entities/User';
import { IRoomRepository } from '../../../../domain/repositories/IRoomRepository';
import { RoomModel } from '../models/RoomModel';
import { Logger } from '../../../../../v1/utils/logger';

export class MongoRoomRepository implements IRoomRepository {
  async save(room: Room): Promise<void> {
    try {
      const roomData = room.toJSON();
      await RoomModel.findOneAndUpdate(
        { id: roomData.id },
        roomData,
        { upsert: true, new: true }
      );
    } catch (error) {
      Logger.error('Error saving room:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Room | null> {
    try {
      const roomDoc = await RoomModel.findOne({ id });
      if (!roomDoc) return null;

      const users = roomDoc.users.map(u => 
        new User(
          u.id || '',
          u.name || '',
          u.isScrumMaster || false
        )
      );

      const room = new Room(
        roomDoc.id,
        roomDoc.teamName,
        users,
        roomDoc.showVotes,
        roomDoc.currentTask,
        roomDoc.lastActivity
      );

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