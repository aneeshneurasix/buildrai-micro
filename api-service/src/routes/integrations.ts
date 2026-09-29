/**
 * Integration Routes
 * Handles third-party integrations (GitHub, Bitbucket, Azure Repos)
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  NotFoundError,
  logger,
  Integration,
  encrypt,
  decrypt,
} from '@buildr/shared';

const router = Router();

/**
 * GET /integrations
 * Get all user integrations
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const integrations = await Integration.find({ userId }).select('-credentials');

    res.status(200).json({
      success: true,
      data: { integrations },
    });
  })
);

/**
 * GET /integrations/:provider
 * Get specific integration
 */
router.get(
  '/:provider',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const userId = req.user!.id;

    const integration = await Integration.findOne({ userId, provider }).select('-credentials');

    if (!integration) {
      throw new NotFoundError('Integration');
    }

    res.status(200).json({
      success: true,
      data: { integration },
    });
  })
);

/**
 * POST /integrations/:provider
 * Create or update integration
 */
router.post(
  '/:provider',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const userId = req.user!.id;
    const { accessToken, refreshToken, metadata } = req.body;

    if (!accessToken) {
      throw new ValidationError('Missing required field: accessToken');
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

    const integration = await Integration.findOneAndUpdate(
      { userId, provider },
      {
        $set: {
          userId,
          provider,
          connected: true,
          credentials: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
          },
          metadata,
          connectedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    ).select('-credentials');

    logger.info(`Integration ${provider} connected`, { userId });

    res.status(200).json({
      success: true,
      message: `${provider} integration connected successfully`,
      data: { integration },
    });
  })
);

/**
 * DELETE /integrations/:provider
 * Disconnect integration
 */
router.delete(
  '/:provider',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const userId = req.user!.id;

    const integration = await Integration.findOneAndUpdate(
      { userId, provider },
      {
        $set: {
          connected: false,
          credentials: null,
          disconnectedAt: new Date(),
        },
      },
      { new: true }
    ).select('-credentials');

    if (!integration) {
      throw new NotFoundError('Integration');
    }

    logger.info(`Integration ${provider} disconnected`, { userId });

    res.status(200).json({
      success: true,
      message: `${provider} integration disconnected successfully`,
      data: { integration },
    });
  })
);

export default router;
