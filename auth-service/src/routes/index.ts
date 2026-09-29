/**
 * API Routes Index
 * Aggregates all route handlers
 */

import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';

const router = Router();

// Mount route handlers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Also mount users routes at root for backward compatibility
router.use('/', userRoutes);

export default router;
