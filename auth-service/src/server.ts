/**
 * Auth Service - Main Server
 * Handles authentication, user management, and usage tracking
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {
  connectDatabase,
  connectRedis,
  logger,
  loggers,
  errorHandler,
  notFoundHandler,
} from '@codstack/shared';
import routes from './routes';

const app: Application = express();
const PORT = process.env.PORT || 4001;
const SERVICE_NAME = 'auth-service';

// Set service name for logging
process.env.SERVICE_NAME = SERVICE_NAME;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS

// Special handling for webhooks - need raw body for signature verification
app.use('/api/auth/webhooks', express.raw({ type: 'application/json' }));

// Parse JSON bodies for other routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    loggers.request(req.method, req.path, req.user?.id, duration);
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('MongoDB connected');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

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
