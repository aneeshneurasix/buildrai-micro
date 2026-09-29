/**
 * API Routes Index
 * Aggregates all route handlers
 */

import { Router } from 'express';
import projectRoutes from './projects';
import fileRoutes from './files';
import githubRoutes from './github';
import integrationRoutes from './integrations';

const router = Router();

// Mount route handlers
router.use('/projects', projectRoutes);
router.use('/projects', fileRoutes); // File routes are nested under projects
router.use('/projects', githubRoutes); // GitHub routes are nested under projects
router.use('/integrations', integrationRoutes);

export default router;
