/**
 * API Routes Index
 * Aggregates all route handlers
 */

import { Router } from 'express';
import generateRoutes from './generate';
import chatRoutes from './chat';

const router = Router();

// Mount route handlers
router.use('/generate', generateRoutes);
router.use('/chat', chatRoutes);

export default router;
