/**
 * Test Setup Configuration
 * Global test configuration and utilities
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Mock external services
jest.mock('../shared/providers/vfd.provider');
jest.mock('../shared/providers/clubConnect.provider');
jest.mock('../modules/notifications/notification.service');

export const createMockUser = () => ({
  _id: 'mock-user-id',
  email: 'test@example.com',
  role: 'user',
  status: 'active',
  user_metadata: {
    first_name: 'Test',
    surname: 'User',
    phone: '08012345678',
    accountNo: '1234567890',
    wallet: '0',
    creditScore: 1.0,
    ladderIndex: 0
  }
});

export const createMockAdmin = () => ({
  _id: 'mock-admin-id',
  email: 'admin@example.com',
  role: 'admin',
  status: 'active',
  is_super_admin: false,
  permissions: ['view_users', 'manage_loans'],
  user_metadata: {
    first_name: 'Admin',
    surname: 'User'
  }
});