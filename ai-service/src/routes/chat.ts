/**
 * Chat Routes
 * Handles AI chat conversations
 */

import { Router, Request, Response } from 'express';
import {
  authMiddleware,
  asyncHandler,
  ValidationError,
  logger,
  ChatSession,
  Project,
} from '@codstack/shared';
import { createChatCompletion } from '../lib/client';
import { DEFAULT_MODEL_ID } from '../lib/models';
import { buildContextWindow } from '../lib/token-optimizer';
import { canUseAI, trackAIUsage } from '../lib/usage-tracker';
import crypto from 'crypto';

const router = Router();

/**
 * Detect user intent from message
 */
function detectIntent(message: string): 'code_generation' | 'question' | 'guidance' {
  const lowerMessage = message.toLowerCase();

  const codeKeywords = [
    'create', 'build', 'generate', 'add', 'implement', 'make',
    'write code', 'develop', 'setup', 'configure', 'design',
  ];

  const questionKeywords = [
    'what', 'how', 'why', 'when', 'where', 'which',
    'explain', 'tell me', 'can you', 'should i',
  ];

  const hasCodeIntent = codeKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasQuestionIntent = questionKeywords.some(keyword => lowerMessage.includes(keyword));

  if (hasCodeIntent && hasQuestionIntent) {
    const technicalTerms = ['component', 'function', 'api', 'endpoint', 'database'];
    return technicalTerms.some(term => lowerMessage.includes(term)) ? 'code_generation' : 'question';
  }

  if (hasCodeIntent) return 'code_generation';
  if (hasQuestionIntent) return 'question';
  return 'guidance';
}

/**
 * POST /chat
 * Main chat endpoint
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { projectId, message, model, context, sessionId } = req.body;
    const userId = req.user!.id;

    if (!message) {
      throw new ValidationError('Message is required');
    }

    // Check AI usage limits
    const usageCheck = await canUseAI(userId);
    if (!usageCheck.allowed) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: usageCheck.error || 'AI usage limit exceeded',
          usage: usageCheck.usage,
        },
      });
      return;
    }

    // Get or create session
    let session = null;
    if (sessionId) {
      session = await ChatSession.findOne({ id: sessionId, userId });
    }

    if (!session) {
      const sessionData = {
        id: `session_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`,
        userId,
        projectId: projectId || null,
        title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        type: 'code_generation' as const,
        status: 'active' as const,
        messages: [],
      };
      session = await ChatSession.create(sessionData);
    }

    // Get project if provided
    let project = null;
    if (projectId) {
      project = await Project.findOne({ id: projectId, userId });
    }

    // Detect intent
    const intent = detectIntent(message);

    // Build system prompt
    let systemPrompt = `You are Buildr, an expert AI coding assistant built into Codstack platform. You help developers with:
- Answering technical questions about their code
- Explaining how specific files and functions work
- Providing guidance and best practices
- Suggesting improvements to existing code
- Helping with debugging and problem-solving

Your personality:
- Friendly, professional, and enthusiastic
- Identify yourself as "Buildr" from Codstack when asked
- Be encouraging and supportive while maintaining technical accuracy

${project ? `Project Context:
- Framework: ${project.settings?.framework || 'Unknown'}
- Language: ${project.settings?.language || 'Unknown'}
- Type: ${project.settings?.template || 'Unknown'}` : ''}

Provide helpful, concise, and actionable responses.`;

    // Build conversation context
    const conversationHistory = context?.conversationHistory || [];
    const contextWindow = buildContextWindow({
      systemPrompt,
      conversationHistory,
      currentMessage: message,
      files: project?.files || [],
      maxTokens: 150000,
    });

    // Create chat completion
    const messages = [
      ...contextWindow.conversationHistory,
      { role: 'user' as const, content: message },
    ];

    const response = await createChatCompletion(messages, {
      model: model || DEFAULT_MODEL_ID,
      maxTokens: 1200,
      temperature: 0.7,
      system: contextWindow.systemPrompt,
    });

    // Calculate tokens used
    const inputTokens = response.usage?.input_tokens || response.usage?.inputTokens || 0;
    const outputTokens = response.usage?.output_tokens || response.usage?.outputTokens || 0;
    const tokensUsed = inputTokens + outputTokens;

    // Track AI usage
    if (tokensUsed > 0) {
      await trackAIUsage(userId, tokensUsed);
    }

    // Save messages to session
    session.messages.push({
      role: 'user',
      content: message,
      createdAt: new Date(),
    });
    session.messages.push({
      role: 'assistant',
      content: response.content,
      createdAt: new Date(),
    });
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        intent,
        content: response.content,
        sessionId: session.id,
        tokensUsed,
      },
    });
  })
);

/**
 * GET /chat/sessions
 * Get user's chat sessions
 */
router.get(
  '/sessions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { projectId, limit = 20, skip = 0 } = req.query;

    const query: any = { userId };
    if (projectId) {
      query.projectId = projectId;
    }

    const sessions = await ChatSession.find(query)
      .sort({ updatedAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .select('id title type status messages createdAt updatedAt');

    res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          id: s.id,
          title: s.title,
          type: s.type,
          status: s.status,
          messageCount: s.messages.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
        total: sessions.length,
      },
    });
  })
);

/**
 * GET /chat/sessions/:sessionId
 * Get specific chat session with messages
 */
router.get(
  '/sessions/:sessionId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = await ChatSession.findOne({ id: sessionId, userId });

    if (!session) {
      throw new ValidationError('Session not found');
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
          type: session.type,
          status: session.status,
          messages: session.messages,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
      },
    });
  })
);

export default router;
