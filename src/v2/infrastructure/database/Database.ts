import mongoose from 'mongoose';
import { Logger } from '../../shared/utils/logger';

export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(uri: string): Promise<void> {
    try {
      await mongoose.connect(uri);
      Logger.info('Connected to MongoDB');
    } catch (error) {
      Logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await mongoose.disconnect();
      Logger.info('Disconnected from MongoDB');
    } catch (error) {
      Logger.error('MongoDB disconnection error:', error);
      throw error;
    }
  }
} 