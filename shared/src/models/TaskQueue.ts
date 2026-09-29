import mongoose, { Schema, Model } from 'mongoose';

/**
 * Task Queue Model
 *
 * Manages autonomous development tasks for auto-pilot mode.
 * When users input features and logout, tasks are queued here
 * and processed by the autonomous AI agent.
 */

export interface TaskQueueDocument {
  id: string;
  projectId: string;
  userId: string;
  sessionId?: string;

  // Task Details
  title: string;
  description: string;
  requirements: {
    raw: string;
    structured?: {
      features: string[];
      files: string[];
      dependencies: string[];
      acceptance: string[];
    };
  };

  // Task Management
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled';
  type: 'feature' | 'bug_fix' | 'refactor' | 'optimization' | 'testing' | 'documentation' | 'endpoint_discovery';

  // Progress Tracking
  progress: {
    percentage: number;
    currentStep: string;
    totalSteps: number;
    completedSteps: number;
    estimatedTimeMinutes?: number;
    actualTimeMinutes?: number;
  };

  // Execution Details
  execution: {
    startedAt?: Date;
    completedAt?: Date;
    pausedAt?: Date;
    lastActivityAt?: Date;
    agentId?: string;
    retryCount: number;
    maxRetries: number;
  };

  // Results
  results: {
    filesCreated: string[];
    filesModified: string[];
    filesDeleted: string[];
    linesAdded: number;
    linesRemoved: number;
    testsAdded: number;
    commits?: string[]; // Git commit SHAs if applicable
  };

  // Logs and Errors
  logs: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'debug';
    message: string;
    metadata?: any;
  }>;

  errors: Array<{
    timestamp: Date;
    error: string;
    stack?: string;
    recoverable: boolean;
    resolution?: string;
  }>;

  // Dependencies
  dependencies: {
    blockedBy: string[]; // Task IDs that must complete first
    blocks: string[]; // Task IDs waiting on this
  };

  // User Interaction
  requiresApproval: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  userFeedback?: {
    rating?: number;
    comments?: string;
    requestedChanges?: string[];
  };

  // Auto-pilot Configuration
  autopilot: {
    enabled: boolean;
    pauseOnError: boolean;
    notifyOnCompletion: boolean;
    maxDurationMinutes: number;
  };

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateProgress(completedSteps: number, currentStep: string): void;
  addLog(level: 'info' | 'warning' | 'error' | 'debug', message: string, metadata?: any): void;
  addError(error: string, stack?: string, recoverable?: boolean, resolution?: string): void;
  markAsProcessing(agentId?: string): void;
  markAsCompleted(): void;
  markAsFailed(reason?: string): void;
  pause(reason?: string): void;
  resume(): void;
  cancel(reason?: string): void;
}

const TaskQueueSchema = new Schema<TaskQueueDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },

    // Task Details
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      raw: { type: String, required: true },
      structured: {
        features: [{ type: String }],
        files: [{ type: String }],
        dependencies: [{ type: String }],
        acceptance: [{ type: String }],
      },
    },

    // Task Management
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed', 'paused', 'cancelled'],
      default: 'queued',
      index: true,
    },
    type: {
      type: String,
      enum: ['feature', 'bug_fix', 'refactor', 'optimization', 'testing', 'documentation', 'endpoint_discovery'],
      default: 'feature',
      index: true,
    },

    // Progress Tracking
    progress: {
      percentage: { type: Number, default: 0, min: 0, max: 100 },
      currentStep: { type: String, default: 'Initializing' },
      totalSteps: { type: Number, default: 0 },
      completedSteps: { type: Number, default: 0 },
      estimatedTimeMinutes: { type: Number },
      actualTimeMinutes: { type: Number },
    },

    // Execution Details
    execution: {
      startedAt: { type: Date },
      completedAt: { type: Date },
      pausedAt: { type: Date },
      lastActivityAt: { type: Date, default: Date.now, index: true },
      agentId: { type: String },
      retryCount: { type: Number, default: 0 },
      maxRetries: { type: Number, default: 3 },
    },

    // Results
    results: {
      filesCreated: [{ type: String }],
      filesModified: [{ type: String }],
      filesDeleted: [{ type: String }],
      linesAdded: { type: Number, default: 0 },
      linesRemoved: { type: Number, default: 0 },
      testsAdded: { type: Number, default: 0 },
      commits: [{ type: String }],
    },

    // Logs and Errors
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        level: {
          type: String,
          enum: ['info', 'warning', 'error', 'debug'],
          default: 'info',
        },
        message: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed },
      },
    ],

    errors: [
      {
        timestamp: { type: Date, default: Date.now },
        error: { type: String, required: true },
        stack: { type: String },
        recoverable: { type: Boolean, default: true },
        resolution: { type: String },
      },
    ],

    // Dependencies
    dependencies: {
      blockedBy: [{ type: String }],
      blocks: [{ type: String }],
    },

    // User Interaction
    requiresApproval: { type: Boolean, default: false },
    approvedAt: { type: Date },
    approvedBy: { type: String },
    userFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comments: { type: String },
      requestedChanges: [{ type: String }],
    },

    // Auto-pilot Configuration
    autopilot: {
      enabled: { type: Boolean, default: true },
      pauseOnError: { type: Boolean, default: true },
      notifyOnCompletion: { type: Boolean, default: true },
      maxDurationMinutes: { type: Number, default: 120 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
TaskQueueSchema.index({ projectId: 1, status: 1, priority: -1 });
TaskQueueSchema.index({ userId: 1, status: 1, createdAt: -1 });
TaskQueueSchema.index({ status: 1, 'execution.lastActivityAt': -1 });
TaskQueueSchema.index({ status: 1, priority: -1, createdAt: 1 }); // For queue processing

// Methods
TaskQueueSchema.methods.updateProgress = function (
  percentage: number,
  currentStep: string,
  completedSteps?: number
) {
  this.progress.percentage = Math.min(100, Math.max(0, percentage));
  this.progress.currentStep = currentStep;
  if (completedSteps !== undefined) {
    this.progress.completedSteps = completedSteps;
  }
  this.execution.lastActivityAt = new Date();
  return this.save();
};

TaskQueueSchema.methods.addLog = function (
  level: 'info' | 'warning' | 'error' | 'debug',
  message: string,
  metadata?: any
) {
  this.logs.push({
    timestamp: new Date(),
    level,
    message,
    metadata,
  });
  this.execution.lastActivityAt = new Date();
  return this.save();
};

TaskQueueSchema.methods.addError = function (
  error: string,
  stack?: string,
  recoverable: boolean = true,
  resolution?: string
) {
  this.errors.push({
    timestamp: new Date(),
    error,
    stack,
    recoverable,
    resolution,
  });
  this.execution.lastActivityAt = new Date();
  return this.save();
};

TaskQueueSchema.methods.markAsProcessing = function (agentId?: string) {
  this.status = 'processing';
  this.execution.startedAt = new Date();
  this.execution.lastActivityAt = new Date();
  if (agentId) {
    this.execution.agentId = agentId;
  }
  return this.save();
};

TaskQueueSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  this.progress.percentage = 100;
  this.execution.completedAt = new Date();
  this.execution.lastActivityAt = new Date();

  // Calculate actual time
  if (this.execution.startedAt) {
    const durationMs = this.execution.completedAt.getTime() - this.execution.startedAt.getTime();
    this.execution.actualTimeMinutes = Math.round(durationMs / 60000);
  }

  return this.save();
};

TaskQueueSchema.methods.markAsFailed = function (reason?: string) {
  this.status = 'failed';
  this.execution.lastActivityAt = new Date();

  if (reason) {
    this.addError(reason, undefined, false);
  }

  return this.save();
};

TaskQueueSchema.methods.pause = function (reason?: string) {
  this.status = 'paused';
  this.execution.pausedAt = new Date();
  this.execution.lastActivityAt = new Date();

  if (reason) {
    this.addLog('info', `Task paused: ${reason}`);
  }

  return this.save();
};

TaskQueueSchema.methods.resume = function () {
  this.status = 'processing';
  this.execution.pausedAt = undefined;
  this.execution.lastActivityAt = new Date();
  this.addLog('info', 'Task resumed');
  return this.save();
};

TaskQueueSchema.methods.cancel = function (reason?: string) {
  this.status = 'cancelled';
  this.execution.lastActivityAt = new Date();

  if (reason) {
    this.addLog('info', `Task cancelled: ${reason}`);
  }

  return this.save();
};

// Static methods for queue management
TaskQueueSchema.statics.getNextTask = async function (agentId?: string) {
  // Find the highest priority queued task with no blockers
  const task = await this.findOne({
    status: 'queued',
    'autopilot.enabled': true,
    'dependencies.blockedBy': { $size: 0 },
  })
    .sort({ priority: -1, createdAt: 1 })
    .exec();

  if (task) {
    await task.markAsProcessing(agentId);
  }

  return task;
};

TaskQueueSchema.statics.getTasksByProject = async function (
  projectId: string,
  status?: string
) {
  const query: any = { projectId };
  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ priority: -1, createdAt: -1 }).exec();
};

TaskQueueSchema.statics.getTasksByUser = async function (
  userId: string,
  status?: string
) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }

  return this.find(query).sort({ createdAt: -1 }).exec();
};

TaskQueueSchema.statics.getProjectProgress = async function (projectId: string) {
  const tasks = await this.find({ projectId }).exec();

  const total = tasks.length;
  const completed = tasks.filter((t: any) => t.status === 'completed').length;
  const processing = tasks.filter((t: any) => t.status === 'processing').length;
  const failed = tasks.filter((t: any) => t.status === 'failed').length;
  const queued = tasks.filter((t: any) => t.status === 'queued').length;

  const averageProgress =
    tasks.reduce((acc: number, t: any) => acc + t.progress.percentage, 0) / (total || 1);

  return {
    total,
    completed,
    processing,
    failed,
    queued,
    averageProgress: Math.round(averageProgress),
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

// Model interface with static methods
interface TaskQueueModel extends Model<TaskQueueDocument> {
  getNextTask(agentId?: string): Promise<TaskQueueDocument | null>;
  getTasksByProject(projectId: string, status?: string): Promise<TaskQueueDocument[]>;
  getTasksByUser(userId: string, status?: string): Promise<TaskQueueDocument[]>;
  getProjectProgress(projectId: string): Promise<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    queued: number;
    averageProgress: number;
    completionRate: number;
  }>;
}

const TaskQueueModel = (mongoose.models.TaskQueue ||
  mongoose.model<TaskQueueDocument>('TaskQueue', TaskQueueSchema)) as TaskQueueModel;

export default TaskQueueModel;
