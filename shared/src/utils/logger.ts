/**
 * Centralized Logger using Winston
 * Supports CloudWatch integration for production
 */

import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';
const serviceName = process.env.SERVICE_NAME || 'unknown-service';

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service || serviceName}] ${level}: ${message} ${metaStr}`;
  })
);

//Create transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction ? customFormat : consoleFormat,
  }),
];

// Add CloudWatch transport for production
if (isProduction && process.env.ENABLE_CLOUDWATCH === 'true') {
  // CloudWatch transport can be added here
  // Requires aws-sdk and winston-cloudwatch package
  // Example:
  // const CloudWatchTransport = require('winston-cloudwatch');
  // transports.push(new CloudWatchTransport({ ... }));
}

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  format: customFormat,
  defaultMeta: { service: serviceName },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Helper methods for common log patterns
export const loggers = {
  request: (method: string, path: string, userId?: string, duration?: number) => {
    logger.info('HTTP Request', {
      method,
      path,
      userId,
      duration,
      type: 'request',
    });
  },

  error: (error: Error, context?: Record<string, any>) => {
    logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      ...context,
    });
  },

  aiRequest: (model: string, tokens: number, cost: number, userId: string) => {
    logger.info('AI Request', {
      model,
      tokens,
      cost,
      userId,
      type: 'ai_request',
    });
  },

  deployment: (action: string, projectId: string, status: string, details?: any) => {
    logger.info('Deployment Action', {
      action,
      projectId,
      status,
      details,
      type: 'deployment',
    });
  },

  security: (event: string, userId: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
    logger.warn('Security Event', {
      event,
      userId,
      severity,
      details,
      type: 'security',
    });
  },
};

export default logger;
