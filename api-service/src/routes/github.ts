/**
 * GitHub Integration Routes
 * Handles GitHub connection and repository operations
 */

import { Router, Request, Response } from 'express';
import { Octokit } from '@octokit/rest';
import simpleGit from 'simple-git';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  NotFoundError,
  logger,
  Project,
  Integration,
  encrypt,
  decrypt,
} from '@buildr/shared';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const router = Router();

/**
 * POST /projects/:projectId/github/connect
 * Connect project to GitHub repository
 */
router.post(
  '/:projectId/github/connect',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { repoUrl, accessToken } = req.body;

    if (!repoUrl || !accessToken) {
      throw new ValidationError('Missing required fields: repoUrl, accessToken');
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Validate GitHub access
    const octokit = new Octokit({ auth: accessToken });

    try {
      const { data: user } = await octokit.users.getAuthenticated();

      // Update project
      project.github = {
        connected: true,
        repoUrl,
        branch: 'main',
        lastSync: new Date(),
      };

      await project.save();

      // Store encrypted access token in Integration model
      const encryptedToken = encrypt(accessToken);

      await Integration.findOneAndUpdate(
        { userId, provider: 'github' },
        {
          $set: {
            userId,
            provider: 'github',
            connected: true,
            credentials: {
              accessToken: encryptedToken,
            },
            metadata: {
              username: user.login,
              email: user.email,
            },
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`GitHub connected for project ${projectId}`, { userId, repoUrl });

      res.status(200).json({
        success: true,
        message: 'GitHub repository connected successfully',
        data: {
          github: project.github,
        },
      });
    } catch (error: any) {
      throw new ValidationError(`Failed to authenticate with GitHub: ${error.message}`);
    }
  })
);

/**
 * POST /projects/:projectId/github/push
 * Push project files to GitHub
 */
router.post(
  '/:projectId/github/push',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;
    const { commitMessage } = req.body;

    if (!commitMessage) {
      throw new ValidationError('Missing required field: commitMessage');
    }

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    if (!project.github?.connected) {
      throw new ValidationError('GitHub not connected for this project');
    }

    // Get GitHub credentials
    const integration = await Integration.findOne({ userId, provider: 'github' });

    if (!integration || !integration.credentials?.accessToken) {
      throw new ValidationError('GitHub integration not found');
    }

    const accessToken = decrypt(integration.credentials.accessToken);

    // Create temporary directory
    const tmpDir = path.join(os.tmpdir(), `project-${projectId}-${Date.now()}`);
    await fs.mkdir(tmpDir, { recursive: true });

    try {
      // Write files to temporary directory
      for (const file of project.files) {
        const filePath = path.join(tmpDir, file.path);
        const fileDir = path.dirname(filePath);
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf8');
      }

      // Initialize git and push
      const git = simpleGit(tmpDir);

      // Configure git with token
      const repoUrl = project.github.repoUrl!;
      const urlWithToken = repoUrl.replace('https://', `https://${accessToken}@`);

      await git.init();
      await git.addConfig('user.name', integration.metadata?.username || 'Codstack');
      await git.addConfig('user.email', integration.metadata?.email || 'noreply@codstack.com');
      await git.add('.');
      await git.commit(commitMessage);
      await git.addRemote('origin', urlWithToken);
      await git.push('origin', project.github.branch || 'main', ['--force']);

      // Update last sync
      project.github.lastSync = new Date();
      await project.save();

      logger.info(`Pushed to GitHub: ${projectId}`, { userId, commitMessage });

      res.status(200).json({
        success: true,
        message: 'Successfully pushed to GitHub',
        data: {
          commitMessage,
          branch: project.github.branch,
          lastSync: project.github.lastSync,
        },
      });
    } finally {
      // Cleanup temporary directory
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  })
);

/**
 * DELETE /projects/:projectId/github/disconnect
 * Disconnect GitHub from project
 */
router.delete(
  '/:projectId/github/disconnect',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId } = req.params;
    const userId = req.user!.id;

    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new NotFoundError('Project');
    }

    project.github = {
      connected: false,
      repoUrl: null,
      branch: null,
      lastSync: null,
    };

    await project.save();

    logger.info(`GitHub disconnected for project ${projectId}`, { userId });

    res.status(200).json({
      success: true,
      message: 'GitHub disconnected successfully',
    });
  })
);

export default router;
