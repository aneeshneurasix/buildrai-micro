/**
 * Authentication Routes
 * Handles Clerk webhook events and JWT token generation
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import {
  asyncHandler,
  logger,
  User,
  generateToken,
} from '@codstack/shared';

const router = Router();

/**
 * POST /webhooks/clerk
 * Handle Clerk webhook events (user.created, user.updated, user.deleted)
 */
router.post(
  '/webhooks/clerk',
  asyncHandler(async (req: Request, res: Response) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      logger.error('CLERK_WEBHOOK_SECRET is not set');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Get the headers
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      res.status(400).json({ error: 'Missing svix headers' });
      return;
    }

    // Get the body
    const payload = req.body;
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any;
    } catch (err) {
      logger.error('Webhook verification failed', err);
      res.status(400).json({ error: 'Webhook verification failed' });
      return;
    }

    // Handle the event
    const eventType = evt.type;
    logger.info(`Clerk webhook event: ${eventType}`);

    if (eventType === 'user.created') {
      const { id, email_addresses, username, first_name, last_name } = evt.data;

      // Create user in database
      const userData = {
        id,
        email: email_addresses[0]?.email_address || '',
        username: username || email_addresses[0]?.email_address?.split('@')[0] || `user_${id}`,
        profile: {
          firstName: first_name || '',
          lastName: last_name || '',
        },
        subscription: {
          plan: 'free' as const,
          status: 'active' as const,
        },
        usage: {
          projectsCreated: 0,
          aiRequests: 0,
          totalTokensUsed: 0,
          lastResetDate: new Date(),
        },
        limits: {
          projectsLimit: 3,
          aiRequestsPerMonth: 100,
          storageLimit: 100 * 1024 * 1024, // 100MB
        },
      };

      await User.create(userData);
      logger.info(`User created: ${id}`);
    }

    if (eventType === 'user.updated') {
      const { id, email_addresses, username, first_name, last_name } = evt.data;

      await User.findOneAndUpdate(
        { id },
        {
          $set: {
            email: email_addresses[0]?.email_address,
            username: username || email_addresses[0]?.email_address?.split('@')[0],
            'profile.firstName': first_name,
            'profile.lastName': last_name,
          },
        }
      );

      logger.info(`User updated: ${id}`);
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data;

      await User.findOneAndDelete({ id });
      logger.info(`User deleted: ${id}`);
    }

    res.status(200).json({ success: true });
  })
);

/**
 * POST /token
 * Generate JWT token for authenticated user (for service-to-service auth)
 */
router.post(
  '/token',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const user = await User.findOne({ id: userId });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      sub: user.id,
      email: user.email,
      role: 'user',
    }, '7d');

    res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: '7d',
      },
    });
  })
);

export default router;
