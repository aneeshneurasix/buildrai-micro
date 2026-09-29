import mongoose, { Schema, Model, Document } from 'mongoose';

// Project File Interface
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
  createdBy: 'ai' | 'user';
  version: number;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project Document Interface
export interface ProjectDocument extends Document {
  id: string;
  userId: string;
  name: string;
  description?: string;
  slug: string;
  settings: {
    template: string;
    language: 'typescript' | 'javascript' | 'python';
    framework: string;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    styling: string;
  };
  requirements: {
    raw?: string;
    structured: {
      features: string[];
      techStack: string[];
      constraints: string[];
    };
    summary?: string;
  };
  files: ProjectFile[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
  };
  github: {
    connected: boolean;
    repoUrl?: string;
    repoName?: string;
    repoOwner?: string;
    branch: string;
    authMethod: 'ssh' | 'pat' | 'none';
    accessToken?: string;
    sshPublicKey?: string;
    sshPrivateKey?: string;
    lastSyncedAt?: Date;
    syncStatus: 'synced' | 'pending' | 'error' | 'never';
    lastCommitSha?: string;
    autoSync: boolean;
  };
  knowledge: {
    architecture: {
      summary?: string;
      pattern?: string;
      mainComponents: string[];
      dataFlow?: string;
      dependencies: string[];
    };
    improvements: Array<{
      id: string;
      suggestion: string;
      status: 'suggested' | 'approved' | 'implemented' | 'rejected';
      category: 'performance' | 'security' | 'ux' | 'code-quality' | 'feature' | 'bug-fix';
      priority: 'low' | 'medium' | 'high' | 'critical';
      sessionId?: string;
      suggestedAt: Date;
      implementedAt?: Date;
      filesAffected: string[];
      reasoning?: string;
    }>;
    insights: {
      codingStyle: string[];
      preferences: string[];
      commonPatterns: string[];
      techExpertise: string[];
    };
    milestones: Array<{
      title: string;
      description?: string;
      completedAt: Date;
      sessionId?: string;
      filesCreated: number;
      linesAdded: number;
    }>;
    lastAnalyzedAt?: Date;
    understandingVersion: number;
  };
  deployment: {
    cloud: 'aws' | 'azure' | 'gcp' | 'none';
    status: 'pending' | 'deploying' | 'deployed' | 'failed' | 'none';
    url?: string;
    lastDeployedAt?: Date;
    region?: string;
    error?: string;
    plan?: any; // Complex deployment plan object
  };
  updateStats(): void;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectFileSchema = new Schema<ProjectFile>({
  path: { type: String, required: true },
  content: { type: String, required: true },
  language: { type: String, required: true },
  size: { type: Number, required: true },
  createdBy: {
    type: String,
    enum: ['ai', 'user'],
    required: true,
  },
  version: { type: Number, default: 1 },
  hash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const ProjectSchema = new Schema<ProjectDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    settings: {
      template: { type: String, required: true },
      language: {
        type: String,
        enum: ['typescript', 'javascript', 'python'],
        default: 'typescript',
      },
      framework: { type: String, required: true },
      packageManager: {
        type: String,
        enum: ['npm', 'yarn', 'pnpm'],
        default: 'npm',
      },
      styling: { type: String, default: 'tailwind' },
    },
    requirements: {
      raw: { type: String },
      structured: {
        features: [{ type: String }],
        techStack: [{ type: String }],
        constraints: [{ type: String }],
      },
      summary: { type: String },
    },
    files: [ProjectFileSchema],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'deleted'],
      default: 'draft',
    },
    stats: {
      totalFiles: { type: Number, default: 0 },
      totalLines: { type: Number, default: 0 },
      totalSize: { type: Number, default: 0 },
    },
    github: {
      connected: { type: Boolean, default: false },
      repoUrl: { type: String },
      repoName: { type: String },
      repoOwner: { type: String },
      branch: { type: String, default: 'main' },
      authMethod: {
        type: String,
        enum: ['ssh', 'pat', 'none'],
        default: 'none',
      },
      accessToken: { type: String },
      sshPublicKey: { type: String },
      sshPrivateKey: { type: String },
      lastSyncedAt: { type: Date },
      syncStatus: {
        type: String,
        enum: ['synced', 'pending', 'error', 'never'],
        default: 'never',
      },
      lastCommitSha: { type: String },
      autoSync: { type: Boolean, default: false },
    },
    knowledge: {
      architecture: {
        summary: { type: String },
        pattern: { type: String },
        mainComponents: [{ type: String }],
        dataFlow: { type: String },
        dependencies: [{ type: String }],
      },
      improvements: [{
        id: { type: String },
        suggestion: { type: String },
        status: {
          type: String,
          enum: ['suggested', 'approved', 'implemented', 'rejected'],
          default: 'suggested',
        },
        category: {
          type: String,
          enum: ['performance', 'security', 'ux', 'code-quality', 'feature', 'bug-fix'],
        },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        sessionId: { type: String },
        suggestedAt: { type: Date, default: Date.now },
        implementedAt: { type: Date },
        filesAffected: [{ type: String }],
        reasoning: { type: String },
      }],
      insights: {
        codingStyle: [{ type: String }],
        preferences: [{ type: String }],
        commonPatterns: [{ type: String }],
        techExpertise: [{ type: String }],
      },
      milestones: [{
        title: { type: String },
        description: { type: String },
        completedAt: { type: Date },
        sessionId: { type: String },
        filesCreated: { type: Number },
        linesAdded: { type: Number },
      }],
      lastAnalyzedAt: { type: Date },
      understandingVersion: { type: Number, default: 1 },
    },
    deployment: {
      cloud: {
        type: String,
        enum: ['aws', 'azure', 'gcp', 'none'],
        default: 'none',
      },
      status: {
        type: String,
        enum: ['pending', 'deploying', 'deployed', 'failed', 'none'],
        default: 'none',
      },
      url: { type: String },
      lastDeployedAt: { type: Date },
      region: { type: String },
      error: { type: String },
      plan: { type: Schema.Types.Mixed },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ slug: 1, userId: 1 }, { unique: true });
ProjectSchema.index({ status: 1 });

// Methods
ProjectSchema.methods.updateStats = function () {
  this.stats.totalFiles = this.files.length;
  this.stats.totalLines = this.files.reduce((acc: number, file: any) => {
    return acc + (file.content.split('\n').length || 0);
  }, 0);
  this.stats.totalSize = this.files.reduce((acc: number, file: any) => {
    return acc + file.size;
  }, 0);
};

// Pre-save middleware
ProjectSchema.pre('save', function () {
  if (this.isModified('files')) {
    this.updateStats();
  }
});

const ProjectModel: Model<ProjectDocument> =
  mongoose.models.Project || mongoose.model<ProjectDocument>('Project', ProjectSchema);

export default ProjectModel;
