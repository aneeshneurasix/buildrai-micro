/**
 * Code Generation Routes
 * Handles AI-powered code generation requests
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  logger,
  loggers,
  Project,
} from '@buildr/shared';
import { generateCode } from '../lib/code-generator';
import { VALID_MODEL_IDS, DEFAULT_MODEL_ID } from '../lib/models';
import { canUseAI, trackAIUsage } from '../lib/usage-tracker';
import crypto from 'crypto';

const router = Router();

/**
 * POST /generate/code
 * Generate code files based on requirements
 */
router.post(
  '/code',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { projectId, requirements, model, context } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!projectId || !requirements) {
      throw new ValidationError('Missing required fields: projectId and requirements');
    }

    // Validate model if provided
    const selectedModel = model && VALID_MODEL_IDS.includes(model) ? model : DEFAULT_MODEL_ID;

    // Get project from database
    const project = await Project.findOne({ id: projectId, userId });

    if (!project) {
      throw new ValidationError('Project not found or access denied');
    }

    // Check AI usage limits before proceeding
    const usageCheck = await canUseAI(userId);
    if (!usageCheck.allowed) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: usageCheck.error || 'AI request limit exceeded',
          usage: usageCheck.usage,
        },
      });
      return;
    }

    // Log AI request
    loggers.aiRequest(selectedModel, 0, 0, userId);

    // Generate code using AI
    const result = await generateCode(
      requirements,
      project.settings,
      {
        existingFiles: project.files || [],
        conversationHistory: context?.conversationHistory,
      },
      selectedModel
    );

    // Save generated files to project
    const timestamp = new Date();

    // Add or update files in project
    result.files.forEach((file) => {
      const existingFileIndex = project.files.findIndex(
        (f: any) => f.path === file.path
      );

      // Generate hash for file content
      const hash = crypto
        .createHash('sha256')
        .update(file.content)
        .digest('hex');

      const fileData = {
        path: file.path,
        content: file.content,
        language: file.language,
        size: Buffer.byteLength(file.content, 'utf8'),
        createdBy: 'ai' as const,
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
    });

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

    // Track actual token usage from AI API response
    if (result.tokensUsed) {
      await trackAIUsage(userId, result.tokensUsed);
    }

    // Log request completion
    const duration = Date.now() - startTime;
    loggers.request('POST', '/generate/code', userId, duration);

    res.status(200).json({
      success: true,
      data: {
        files: result.files.map((f) => ({
          path: f.path,
          language: f.language,
          size: Buffer.byteLength(f.content, 'utf8'),
        })),
        explanation: result.explanation,
        suggestions: result.suggestions,
        stats: project.stats,
        tokensUsed: result.tokensUsed,
      },
      message: `Successfully generated ${result.files.length} file(s)`,
    });
  })
);

export default router;
