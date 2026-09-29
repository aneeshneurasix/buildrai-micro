/**
 * Validation utilities using Zod
 * Common validation schemas and helpers
 */

import { z } from 'zod';

// Common validation schemas
export const schemas = {
  // MongoDB ObjectId-like string
  id: z.string().min(1).max(100),

  // Email
  email: z.string().email(),

  // Username
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),

  // Password
  password: z.string().min(8).max(100),

  // URL
  url: z.string().url(),

  // Pagination
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
  }),

  // Project settings
  projectSettings: z.object({
    template: z.string(),
    language: z.enum(['typescript', 'javascript', 'python']),
    framework: z.string(),
    packageManager: z.enum(['npm', 'yarn', 'pnpm']),
    styling: z.string().optional(),
  }),

  // AI request
  aiRequest: z.object({
    prompt: z.string().min(1).max(10000),
    model: z.string().optional(),
    maxTokens: z.number().int().positive().max(100000).optional(),
    temperature: z.number().min(0).max(2).optional(),
    stream: z.boolean().optional(),
  }),
};

/**
 * Validate data against a Zod schema
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation that returns result object instead of throwing
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Result with success flag and data or error
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error };
}

/**
 * Format Zod errors for API responses
 * @param error Zod error
 * @returns Formatted error object
 */
export function formatZodError(error: z.ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  return {
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Sanitize string input (remove dangerous characters)
 * @param input Input string
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate and sanitize file path
 * @param path File path
 * @returns Sanitized path
 * @throws Error if path is invalid
 */
export function validateFilePath(path: string): string {
  // Remove ../ and ./ to prevent directory traversal
  const sanitized = path.replace(/\.\.\/|\.\/|\\/g, '');

  // Check for invalid characters
  if (/[<>:"|?*]/.test(sanitized)) {
    throw new Error('Invalid characters in file path');
  }

  return sanitized;
}

/**
 * Validate environment variable exists
 * @param name Environment variable name
 * @returns Environment variable value
 * @throws Error if not set
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Check if string is valid JSON
 * @param str String to check
 * @returns True if valid JSON
 */
export function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
