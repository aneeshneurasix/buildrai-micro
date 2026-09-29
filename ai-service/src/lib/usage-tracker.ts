/**
 * AI Usage Tracking Utility
 * Interacts with Auth Service to track user AI usage
 */

import axios from 'axios';
import { logger } from '@buildr/shared';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:4001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

export interface UsageCheck {
  allowed: boolean;
  error?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}

/**
 * Check if user can make an AI request
 */
export async function canUseAI(userId: string): Promise<UsageCheck> {
  try {
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/internal/users/${userId}/ai-usage/check`,
      {
        headers: {
          'x-internal-api-key': INTERNAL_API_KEY,
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error: any) {
    logger.error('Failed to check AI usage', {
      userId,
      error: error.message,
    });

    // Fail open: allow the request if usage check fails
    // In production, you might want to fail closed for better cost control
    return {
      allowed: true,
      error: 'Usage check unavailable',
    };
  }
}

/**
 * Track AI usage after successful request
 */
export async function trackAIUsage(
  userId: string,
  tokensUsed: number
): Promise<void> {
  try {
    await axios.post(
      `${AUTH_SERVICE_URL}/internal/users/${userId}/ai-usage/track`,
      {
        tokensUsed,
      },
      {
        headers: {
          'x-internal-api-key': INTERNAL_API_KEY,
        },
        timeout: 5000,
      }
    );

    logger.info('AI usage tracked', { userId, tokensUsed });
  } catch (error: any) {
    // Log error but don't fail the request
    // Usage tracking is important but shouldn't block user
    logger.error('Failed to track AI usage', {
      userId,
      tokensUsed,
      error: error.message,
    });
  }
}
