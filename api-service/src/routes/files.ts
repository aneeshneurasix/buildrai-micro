/**
 * File Management Routes
 * Handles project file operations
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  NotFoundError,
  logger,
  Project,
} from '@codstack/shared';
import crypto from 'crypto';

const router = Router();

/**
 * GET /projects/:projectId/files
 * Get all files in a project
 */
router.get(
  '/:projectId/files',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ id: projectId, userId }).select('files');

    if (!project) {
      throw new NotFoundError('Project');
    }

    res.status(200).json({
      success: true,
      data: {
        files: project.files,
        total: project.files.length,
      },
    });
  })
);

/**
 * GET /projects/:projectId/files/:filePath
 * Get a specific file
 */
router.get(
  '/:projectId/files/:filePath(*)',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId, filePath } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ id: projectId, userId }).select('files');

    if (!project) {
      throw new NotFoundError('Project');
    }

    const file = project.files.find((f: any) => f.path === filePath);

    if (!file) {
      throw new NotFoundError('File');
    }

    res.status(200).json({
      success: true,
      data: { file },
    });
  })
);

/**
 * POST /projects/:projectId/files
 * Create or update a file
 */
router.post(
  '/:projectId/files',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { path, content, language } = req.body;

    if (!path || !content) {
      throw new ValidationError('Missing required fields: path, content');
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    const timestamp = new Date();
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    // Check if file exists
    const existingFileIndex = project.files.findIndex((f: any) => f.path === path);

    const fileData = {
      path,
      content,
      language: language || 'plaintext',
      size: Buffer.byteLength(content, 'utf8'),
      createdBy: 'user' as const,
      hash,
      version: existingFileIndex >= 0 ? (project.files[existingFileIndex].version || 0) + 1 : 1,
      createdAt: existingFileIndex >= 0 ? project.files[existingFileIndex].createdAt : timestamp,
      updatedAt: timestamp,
    };

    if (existingFileIndex >= 0) {
      // Update existing file
      project.files[existingFileIndex] = fileData;
    } else {
      // Add new file
      project.files.push(fileData);
    }

    // Update project stats
    project.stats = {
      totalFiles: project.files.length,
      totalLines: project.files.reduce((sum: number, file: any) => {
        return sum + (file.content?.split('\n').length || 0);
      }, 0),
      totalSize: project.files.reduce((sum: number, file: any) => {
        return sum + (file.size || 0);
      }, 0),
    };

    project.updatedAt = timestamp;
    await project.save();

    logger.info(`File ${existingFileIndex >= 0 ? 'updated' : 'created'}: ${path}`, {
      projectId,
      userId,
    });

    res.status(existingFileIndex >= 0 ? 200 : 201).json({
      success: true,
      data: {
        file: fileData,
        stats: project.stats,
      },
    });
  })
);

/**
 * DELETE /projects/:projectId/files/:filePath
 * Delete a file
 */
router.delete(
  '/:projectId/files/:filePath(*)',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId, filePath } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    const fileIndex = project.files.findIndex((f: any) => f.path === filePath);

    if (fileIndex === -1) {
      throw new NotFoundError('File');
    }

    // Remove file
    project.files.splice(fileIndex, 1);

    // Update project stats
    project.stats = {
      totalFiles: project.files.length,
      totalLines: project.files.reduce((sum: number, file: any) => {
        return sum + (file.content?.split('\n').length || 0);
      }, 0),
      totalSize: project.files.reduce((sum: number, file: any) => {
        return sum + (file.size || 0);
      }, 0),
    };

    project.updatedAt = new Date();
    await project.save();

    logger.info(`File deleted: ${filePath}`, { projectId, userId });

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      data: {
        stats: project.stats,
      },
    });
  })
);

export default router;
