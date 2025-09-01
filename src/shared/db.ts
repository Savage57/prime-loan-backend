/**
 * Database connection and session management utilities
 * Provides MongoDB connection with session support for atomic operations
 */
import mongoose from 'mongoose';
import { DB_URL, DB_OPTIONS } from '../config';

export class DatabaseService {
  static async startSession() {
    return mongoose.startSession();
  }

  static async withTransaction<T>(
    session: mongoose.ClientSession,
    operation: () => Promise<T>
  ): Promise<T> {
    return session.withTransaction(operation);
  }

  static async connect() {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(DB_URL as string, DB_OPTIONS);
    }
    return mongoose.connection;
  }
}