/**
 * Worker Service - Main Server
 * Handles background tasks: autonomous agent, email sending
 */

import express, { Application, Request, Response } from 'express';
import {
  connectDatabase,
  connectRedis,
  logger,
} from '@buildr/shared';
import { autonomousAgent } from './workers/autonomous-agent';
import { emailWorker } from './workers/email-worker';

const app: Application = express();
const PORT = process.env.PORT || 4002;
const SERVICE_NAME = 'worker-service';

// Set service name for logging
process.env.SERVICE_NAME = SERVICE_NAME;

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    workers: {
      autonomousAgent: autonomousAgent ? 'running' : 'stopped',
      emailWorker: emailWorker ? 'running' : 'stopped',
    },
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('MongoDB connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Start autonomous agent
    await autonomousAgent.start();
    logger.info('Autonomous agent started');

    // Email worker starts automatically when imported
    logger.info('Email worker started');

    // Start HTTP server for health checks
    app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  // Stop autonomous agent
  autonomousAgent.stop();

  // Close email worker
  await emailWorker.close();

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

export default app;
