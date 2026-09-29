import mongoose, { Schema, Model } from 'mongoose';

/**
 * Preview Model
 *
 * Tracks ephemeral preview instances running in Docker containers.
 * Each preview is automatically cleaned up after expiration.
 */

export interface PreviewDocument {
  id: string;
  projectId: string;
  userId: string;

  // Container Details
  containerId?: string; // Docker container ID
  imageName?: string; // Docker image name
  containerPort: number; // Port inside container (e.g., 3000)
  hostPort: number; // Port on host machine
  url: string; // Access URL (e.g., http://localhost:8080)

  // Status
  status: 'building' | 'running' | 'failed' | 'stopped' | 'expired';
  buildLogs: string[];
  runtimeLogs: string[];
  errorMessage?: string;

  // Lifecycle
  startedAt?: Date;
  stoppedAt?: Date;
  expiresAt: Date;
  autoCleanup: boolean;

  // Build Configuration
  buildConfig: {
    framework?: string; // nextjs, react, vue, etc.
    buildCommand?: string;
    startCommand?: string;
    envVars: { key: string; value: string }[];
  };

  // Database Configuration
  databaseConfig?: {
    mode: 'ephemeral' | 'mock' | 'disabled';
    provider?: string;
    seedData?: string;
  };

  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  addBuildLog(message: string): Promise<void>;
  addRuntimeLog(message: string): Promise<void>;
  markAsRunning(containerId: string): Promise<void>;
  markAsFailed(error: string): Promise<void>;
  markAsStopped(): Promise<void>;
  isExpired(): boolean;
}

const PreviewSchema = new Schema<PreviewDocument>(
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

    // Container Details
    containerId: {
      type: String,
      index: true,
    },
    imageName: {
      type: String,
    },
    containerPort: {
      type: Number,
      default: 3000,
    },
    hostPort: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      default: '',
    },

    // Status
    status: {
      type: String,
      enum: ['building', 'running', 'failed', 'stopped', 'expired'],
      default: 'building',
      index: true,
    },
    buildLogs: [{ type: String }],
    runtimeLogs: [{ type: String }],
    errorMessage: {
      type: String,
    },

    // Lifecycle
    startedAt: {
      type: Date,
    },
    stoppedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    autoCleanup: {
      type: Boolean,
      default: true,
    },

    // Build Configuration
    buildConfig: {
      framework: { type: String },
      buildCommand: { type: String },
      startCommand: { type: String },
      envVars: [
        {
          key: { type: String },
          value: { type: String },
        },
      ],
    },

    // Database Configuration
    databaseConfig: {
      mode: {
        type: String,
        enum: ['ephemeral', 'mock', 'disabled'],
      },
      provider: { type: String },
      seedData: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PreviewSchema.index({ projectId: 1, status: 1 });
PreviewSchema.index({ userId: 1, createdAt: -1 });
PreviewSchema.index({ status: 1, expiresAt: 1 }); // For cleanup job

// Methods - Use atomic operations to avoid parallel save conflicts
PreviewSchema.methods.addBuildLog = async function (message: string) {
  const logEntry = `[${new Date().toISOString()}] ${message}`;
  // Use atomic $push to avoid parallel save conflicts
  const mongoose = require('mongoose');
  await mongoose.model('Preview').updateOne(
    { _id: this._id },
    { $push: { buildLogs: logEntry } }
  );
  // Update local array for consistency (don't save)
  this.buildLogs.push(logEntry);
};

PreviewSchema.methods.addRuntimeLog = async function (message: string) {
  const logEntry = `[${new Date().toISOString()}] ${message}`;
  // Use atomic $push to avoid parallel save conflicts
  const mongoose = require('mongoose');
  await mongoose.model('Preview').updateOne(
    { _id: this._id },
    { $push: { runtimeLogs: logEntry } }
  );
  // Update local array for consistency (don't save)
  this.runtimeLogs.push(logEntry);
};

PreviewSchema.methods.markAsRunning = async function (containerId: string, url?: string, hostPort?: number, imageName?: string) {
  // Use atomic update to avoid conflicts
  const mongoose = require('mongoose');
  const updateFields: any = {
    status: 'running',
    containerId: containerId,
    startedAt: new Date()
  };

  // Add optional fields if provided
  if (url) updateFields.url = url;
  if (hostPort) updateFields.hostPort = hostPort;
  if (imageName) updateFields.imageName = imageName;

  await mongoose.model('Preview').updateOne(
    { _id: this._id },
    { $set: updateFields }
  );

  // Update local properties
  this.status = 'running';
  this.containerId = containerId;
  this.startedAt = new Date();
  if (url) this.url = url;
  if (hostPort) this.hostPort = hostPort;
  if (imageName) this.imageName = imageName;
};

PreviewSchema.methods.markAsFailed = function (error: string) {
  this.status = 'failed';
  this.errorMessage = error;
  this.stoppedAt = new Date();
  return this.save();
};

PreviewSchema.methods.markAsStopped = function () {
  this.status = 'stopped';
  this.stoppedAt = new Date();
  return this.save();
};

PreviewSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Static methods
PreviewSchema.statics.getActivePreview = async function (projectId: string) {
  return this.findOne({
    projectId,
    status: { $in: ['building', 'running'] },
  }).exec();
};

PreviewSchema.statics.getExpiredPreviews = async function () {
  return this.find({
    status: { $in: ['running', 'building'] },
    expiresAt: { $lt: new Date() },
    autoCleanup: true,
  }).exec();
};

PreviewSchema.statics.getUserPreviews = async function (
  userId: string,
  limit: number = 10
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// Model interface with static methods
interface PreviewModel extends Model<PreviewDocument> {
  getActivePreview(projectId: string): Promise<PreviewDocument | null>;
  getExpiredPreviews(): Promise<PreviewDocument[]>;
  getUserPreviews(userId: string, limit?: number): Promise<PreviewDocument[]>;
}

const PreviewModel = (mongoose.models.Preview ||
  mongoose.model<PreviewDocument>('Preview', PreviewSchema)) as PreviewModel;

export default PreviewModel;
