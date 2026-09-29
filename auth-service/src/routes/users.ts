/**
 * User Management Routes
 * Handles user data, usage tracking, and subscription management
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  serviceAuthMiddleware,
  asyncHandler,
  ValidationError,
  NotFoundError,
  logger,
  User,
} from '@codstack/shared';

const router = Router();

/**
 * GET /users/me
 * Get current user's profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findOne({ id: userId }).select('-__v');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PATCH /users/me
 * Update current user's profile
 */
router.patch(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { profile, preferences } = req.body;

    const updateData: any = {};

    if (profile) {
      if (profile.firstName) updateData['profile.firstName'] = profile.firstName;
      if (profile.lastName) updateData['profile.lastName'] = profile.lastName;
      if (profile.bio) updateData['profile.bio'] = profile.bio;
      if (profile.company) updateData['profile.company'] = profile.company;
      if (profile.website) updateData['profile.website'] = profile.website;
    }

    if (preferences) {
      if (preferences.theme) updateData['preferences.theme'] = preferences.theme;
      if (preferences.editor) updateData['preferences.editor'] = preferences.editor;
    }

    const user = await User.findOneAndUpdate(
      { id: userId },
      { $set: updateData },
      { new: true }
    ).select('-__v');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * GET /users/me/usage
 * Get current user's usage statistics
 */
router.get(
  '/me/usage',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const user = await User.findOne({ id: userId }).select('usage limits subscription');

    if (!user) {
      throw new NotFoundError('User');
    }

    const aiRequestsUsed = user.usage?.aiRequests || 0;
    const aiRequestsLimit = user.limits?.aiRequestsPerMonth || 100;

    res.status(200).json({
      success: true,
      data: {
        usage: user.usage,
        limits: user.limits,
        subscription: user.subscription,
        percentage: Math.round((aiRequestsUsed / aiRequestsLimit) * 100),
        remaining: Math.max(0, aiRequestsLimit - aiRequestsUsed),
      },
    });
  })
);

/**
 * Internal Routes (Service-to-Service)
 */

/**
 * GET /internal/users/:userId
 * Get user by ID (internal only)
 */
router.get(
  '/internal/users/:userId',
  serviceAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId }).select('-__v');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  })
);

/**
 * GET /internal/users/:userId/ai-usage/check
 * Check if user can make AI request (internal only)
 */
router.get(
  '/internal/users/:userId/ai-usage/check',
  serviceAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await User.findOne({ id: userId }).select('usage limits');

    if (!user) {
      res.status(200).json({
        allowed: false,
        error: 'User not found',
      });
      return;
    }

    const aiRequestsUsed = user.usage?.aiRequests || 0;
    const aiRequestsLimit = user.limits?.aiRequestsPerMonth || 100;
    const remaining = Math.max(0, aiRequestsLimit - aiRequestsUsed);
    const percentage = Math.round((aiRequestsUsed / aiRequestsLimit) * 100);

    if (aiRequestsUsed >= aiRequestsLimit) {
      res.status(200).json({
        allowed: false,
        error: `AI request limit exceeded. You have used ${aiRequestsUsed} of ${aiRequestsLimit} AI requests this month.`,
        usage: {
          used: aiRequestsUsed,
          limit: aiRequestsLimit,
          remaining: 0,
          percentage: 100,
        },
      });
      return;
    }

    res.status(200).json({
      allowed: true,
      usage: {
        used: aiRequestsUsed,
        limit: aiRequestsLimit,
        remaining,
        percentage,
      },
    });
  })
);

/**
 * POST /internal/users/:userId/ai-usage/track
 * Track AI usage (internal only)
 */
router.post(
  '/internal/users/:userId/ai-usage/track',
  serviceAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { tokensUsed } = req.body;

    if (!tokensUsed || typeof tokensUsed !== 'number') {
      throw new ValidationError('tokensUsed must be a number');
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      throw new NotFoundError('User');
    }

    // Update usage atomically
    const updated = await User.findOneAndUpdate(
      { id: userId },
      {
        $inc: {
          'usage.aiRequests': 1,
          'usage.totalTokensUsed': tokensUsed,
        },
        $set: {
          'usage.lastResetDate': user.usage?.lastResetDate || new Date(),
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new NotFoundError('User');
    }

    logger.info(`AI usage tracked for user ${userId}: +1 request, +${tokensUsed} tokens`);

    res.status(200).json({
      success: true,
      data: {
        usage: updated.usage,
      },
    });
  })
);

/**
 * POST /internal/users/:userId/reset-usage
 * Reset monthly usage (internal only - for cron jobs)
 */
router.post(
  '/internal/users/:userId/reset-usage',
  serviceAuthMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await User.findOneAndUpdate(
      { id: userId },
      {
        $set: {
          'usage.aiRequests': 0,
          'usage.lastResetDate': new Date(),
        },
      },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    logger.info(`Usage reset for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        usage: user.usage,
      },
    });
  })
);

export default router;
