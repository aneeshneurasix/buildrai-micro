/**
 * Express Request type extensions
 * Adds custom properties to Express Request type
 */

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role?: string;
      [key: string]: any;
    };
  }
}
