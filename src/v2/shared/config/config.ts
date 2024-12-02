import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

// Load environment variables
dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  mongodb: {
    uri: string;
  };
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/planning-poker'
  }
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  Logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

export default config; 