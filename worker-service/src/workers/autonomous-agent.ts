/**
 * Autonomous AI Agent Worker
 * Processes development tasks autonomously in the background
 */

import axios from 'axios';
import {
  logger,
  TaskQueue,
  Project,
} from '@codstack/shared';
import crypto from 'crypto';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:4000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

interface AgentConfig {
  maxConcurrentTasks?: number;
  taskCheckInterval?: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: AgentConfig = {
  maxConcurrentTasks: 3,
  taskCheckInterval: 10000, // 10 seconds
  maxRetries: 3,
};

/**
 * Autonomous Agent
 */
export class AutonomousAgent {
  private config: AgentConfig;
  private isRunning: boolean = false;
  private processingTasks: Set<string> = new Set();
  private intervalId?: NodeJS.Timeout;
  private agentId: string;

  constructor(config?: Partial<AgentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentId = `agent_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Start the agent
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Autonomous agent already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Autonomous agent started`, { agentId: this.agentId });

    // Start task processing loop
    this.intervalId = setInterval(async () => {
      await this.processNextTask();
    }, this.config.taskCheckInterval);

    // Process immediately on start
    await this.processNextTask();
  }

  /**
   * Stop the agent
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('Autonomous agent not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    logger.info(`Autonomous agent stopped`, { agentId: this.agentId });
  }

  /**
   * Process next pending task
   */
  private async processNextTask() {
    try {
      // Check if we can process more tasks
      if (this.processingTasks.size >= this.config.maxConcurrentTasks!) {
        return;
      }

      // Get next pending task
      const task = await TaskQueue.findOne({
        status: 'pending',
        scheduledFor: { $lte: new Date() },
      }).sort({ priority: -1, createdAt: 1 });

      if (!task) {
        return; // No pending tasks
      }

      // Mark as processing
      this.processingTasks.add(task.id);

      try {
        await this.executeTask(task);
      } finally {
        this.processingTasks.delete(task.id);
      }
    } catch (error) {
      logger.error('Error in task processing loop', error);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: any) {
    const startTime = Date.now();

    try {
      logger.info(`Executing task ${task.id}`, {
        type: task.type,
        projectId: task.projectId,
      });

      // Update task status
      task.status = 'processing';
      task.startedAt = new Date();
      await task.save();

      // Get project
      const project = await Project.findOne({ id: task.projectId });

      if (!project) {
        throw new Error('Project not found');
      }

      // Execute based on task type
      let result: any;

      switch (task.type) {
        case 'code_generation':
          result = await this.executeCodeGeneration(task, project);
          break;
        case 'code_review':
          result = await this.executeCodeReview(task, project);
          break;
        case 'refactoring':
          result = await this.executeRefactoring(task, project);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      // Update task as completed
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      await task.save();

      const duration = Date.now() - startTime;
      logger.info(`Task ${task.id} completed`, { duration });
    } catch (error: any) {
      logger.error(`Task ${task.id} failed`, error);

      // Update task with error
      task.status = 'failed';
      task.error = error.message;
      task.retries = (task.retries || 0) + 1;

      // Retry if under max retries
      if (task.retries < this.config.maxRetries!) {
        task.status = 'pending';
        task.scheduledFor = new Date(Date.now() + 60000 * task.retries); // Exponential backoff
        logger.info(`Task ${task.id} will retry (attempt ${task.retries + 1})`);
      }

      await task.save();
    }
  }

  /**
   * Execute code generation task
   */
  private async executeCodeGeneration(task: any, project: any) {
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/generate/code`,
      {
        projectId: project.id,
        requirements: task.input.requirements,
        model: task.input.model,
        context: task.input.context,
      },
      {
        headers: {
          'x-internal-api-key': INTERNAL_API_KEY,
          'Authorization': `Bearer ${task.metadata?.token}`,
        },
      }
    );

    return response.data.data;
  }

  /**
   * Execute code review task
   */
  private async executeCodeReview(task: any, project: any) {
    // Call AI service for code review
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/chat`,
      {
        projectId: project.id,
        message: `Please review the following code:\n\n${task.input.code}`,
        model: task.input.model,
      },
      {
        headers: {
          'x-internal-api-key': INTERNAL_API_KEY,
          'Authorization': `Bearer ${task.metadata?.token}`,
        },
      }
    );

    return response.data.data;
  }

  /**
   * Execute refactoring task
   */
  private async executeRefactoring(task: any, project: any) {
    // Call AI service for refactoring
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/generate/code`,
      {
        projectId: project.id,
        requirements: `Refactor the following code:\n\n${task.input.code}\n\nRefactoring goals: ${task.input.goals}`,
        model: task.input.model,
      },
      {
        headers: {
          'x-internal-api-key': INTERNAL_API_KEY,
          'Authorization': `Bearer ${task.metadata?.token}`,
        },
      }
    );

    return response.data.data;
  }
}

// Export singleton instance
export const autonomousAgent = new AutonomousAgent();
