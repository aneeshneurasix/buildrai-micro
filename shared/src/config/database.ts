/**
 * MongoDB Database Configuration
 * Connection pooling and error handling
 */

import mongoose from 'mongoose';
import { logger } from '../utils/logger';

let isConnected = false;

/**
 * Connect to MongoDB
 * Handles connection pooling and reconnection
 */
export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('Using existing database connection');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const options = {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50'),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5'),
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '10000'),
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 10000,
      // Buffering: false for production to fail fast
      bufferCommands: process.env.NODE_ENV !== 'production',
    };

    mongoose.set('strictQuery', true);

    await mongoose.connect(mongoUri, options);

    isConnected = true;
    logger.info('MongoDB connected successfully', {
      poolSize: options.maxPoolSize,
      environment: process.env.NODE_ENV,
    });

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Get database connection stats
 */
export function getDatabaseStats() {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}
