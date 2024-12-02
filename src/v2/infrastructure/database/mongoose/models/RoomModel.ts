import mongoose, { Document } from 'mongoose';

interface IUser {
  id: string;
  name: string;
  isScrumMaster: boolean;
  vote?: string;
}

interface IRoom extends Document {
  id: string;
  teamName: string;
  users: IUser[];
  showVotes: boolean;
  currentTask?: string;
  lastActivity: Date;
  createdAt: Date;
}

const RoomSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  users: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    isScrumMaster: { type: Boolean, required: true },
    vote: String
  }],
  showVotes: { type: Boolean, default: false },
  currentTask: String,
  lastActivity: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

export const RoomModel = mongoose.model<IRoom>('Room', RoomSchema); 