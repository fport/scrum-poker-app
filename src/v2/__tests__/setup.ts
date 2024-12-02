import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  if (process.env.TEST_SUITE === 'repository') {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  }
});

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
});

afterEach(async () => {
  if (mongoServer) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}); 