/**
 * Authentication Middleware
 * JWT token validation and user context
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'No authorization token provided',
        },
      });
      return;
    }

    // Check format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must be in format: Bearer <token>',
        },
      });
      return;
    }

    const token = parts[1];

    // Verify JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable is not set');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Server configuration error',
        },
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Add user to request
    req.user = {
      id: decoded.sub || decoded.userId || decoded.id,
      email: decoded.email,
      role: decoded.role,
      ...decoded,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
        },
      });
      return;
    }

    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error occurred',
      },
    });
  }
}

/**
 * Optional Authentication Middleware
 * Validates token if provided, but doesn't require it
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token provided, continue without user context
    next();
    return;
  }

  // If token is provided, validate it
  return authMiddleware(req, res, next);
}

/**
 * Service-to-Service Authentication Middleware
 * Validates internal API key for service communication
 */
export function serviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-internal-api-key'];
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    logger.error('INTERNAL_API_KEY environment variable is not set');
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Server configuration error',
      },
    });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    logger.warn('Invalid internal API key attempt', {
      ip: req.ip,
      path: req.path,
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid service credentials',
      },
    });
    return;
  }

  next();
}

/**
 * Generate JWT token
 * @param payload Token payload
 * @param expiresIn Expiration time (default: 7 days)
 * @returns JWT token
 */
export function generateToken(
  payload: Record<string, any>,
  expiresIn: string = '7d'
): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.sign(payload, jwtSecret, { expiresIn });
}

/**
 * Verify and decode JWT token
 * @param token JWT token
 * @returns Decoded token payload
 */
export function verifyToken(token: string): any {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  return jwt.verify(token, jwtSecret);
}
