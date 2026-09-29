/**
 * Project Routes
 * Handles project CRUD operations
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  NotFoundError,
  ConflictError,
  logger,
  Project,
  User,
} from '@buildr/shared';

const router = Router();

/**
 * GET /projects
 * List user's projects
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = '1', limit = '20', status, search, sort = '-createdAt' } = req.query;

    // Build query
    const query: any = { userId };

    // Exclude deleted projects by default
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'deleted' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .sort(sort as string)
        .skip(skip)
        .limit(Number(limit))
        .select('-files') // Exclude files for list view
        .lean(),
      Project.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        projects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  })
);

/**
 * POST /projects
 * Create a new project
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { name, description, settings } = req.body;

    // Validate required fields
    if (!name || !settings?.template || !settings?.framework) {
      throw new ValidationError('Missing required fields: name, settings.template, settings.framework');
    }

    // Check user limits
    const user = await User.findOne({ id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    // Reset monthly usage if needed
    await user.resetMonthlyUsage();

    // Check if user can create project
    if (!user.canCreateProject()) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PROJECT_LIMIT_REACHED',
          message: `You've reached your monthly project limit. Upgrade to create more projects.`,
          usage: {
            used: user.usage.projectsCreated,
            limit: user.limits.projectsLimit,
          },
        },
      });
      return;
    }

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for duplicate slug
    const existingProject = await Project.findOne({ userId, slug });

    if (existingProject) {
      throw new ConflictError('A project with this name already exists');
    }

    // Create project
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const project = await Project.create({
      id: projectId,
      userId,
      name,
      description: description || '',
      slug,
      settings: {
        template: settings.template,
        language: settings.language || 'typescript',
        framework: settings.framework,
        packageManager: settings.packageManager || 'npm',
        styling: settings.styling || 'tailwind',
      },
      files: [],
      status: 'draft',
      stats: {
        totalFiles: 0,
        totalLines: 0,
        totalSize: 0,
      },
    });

    // Update user usage
    user.usage.projectsCreated += 1;
    await user.save();

    logger.info(`Project created: ${projectId}`, { userId, projectName: name });

    res.status(201).json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        slug: project.slug,
        status: project.status,
        createdAt: project.createdAt,
      },
    });
  })
);

/**
 * GET /projects/:projectId
 * Get project details
 */
router.get(
  '/:projectId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    res.status(200).json({
      success: true,
      data: { project },
    });
  })
);

/**
 * PATCH /projects/:projectId
 * Update project
 */
router.patch(
  '/:projectId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { name, description, status } = req.body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const project = await Project.findOneAndUpdate(
      { id: projectId, userId },
      { $set: updateData },
      { new: true }
    );

    if (!project) {
      throw new NotFoundError('Project');
    }

    res.status(200).json({
      success: true,
      data: { project },
    });
  })
);

/**
 * DELETE /projects/:projectId
 * Delete project (soft delete)
 */
router.delete(
  '/:projectId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOneAndUpdate(
      { id: projectId, userId },
      { $set: { status: 'deleted', deletedAt: new Date() } },
      { new: true }
    );

    if (!project) {
      throw new NotFoundError('Project');
    }

    logger.info(`Project deleted: ${projectId}`, { userId });

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);

export default router;
