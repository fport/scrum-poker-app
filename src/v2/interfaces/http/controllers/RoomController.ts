import { Request, Response } from 'express';
import { RoomService } from '../../../domain/services/RoomService';
import { Logger } from '../../../../v1/utils/logger';

export class RoomController {
  constructor(private roomService: RoomService) {}

  getRoomStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const [activeRooms, totalRooms, totalUsers] = await Promise.all([
        this.roomService.getActiveRoomsCount(),
        this.roomService.getTotalRoomsCreated(),
        this.roomService.getTotalUsersJoined()
      ]);

      const rooms = await this.roomService.getAllRooms();
      const roomsStatus = rooms.map(room => ({
        roomId: room.id,
        teamName: room.teamName,
        userCount: room.getUserCount(),
        users: room.getUsers().map(user => ({
          name: user.name,
          isScrumMaster: user.isScrumMaster,
          hasVoted: !!user.getVote()
        })),
        currentTask: room.toJSON().currentTask,
        showVotes: room.toJSON().showVotes,
        lastActivity: room.toJSON().lastActivity
      }));

      res.json({
        summary: {
          activeRooms,
          totalRooms,
          totalUsers
        },
        rooms: roomsStatus
      });
    } catch (error) {
      Logger.error('Error getting room stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
} 