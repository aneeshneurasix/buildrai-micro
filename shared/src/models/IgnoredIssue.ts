import mongoose, { Document, Model } from 'mongoose';

export interface IIgnoredIssue extends Document {
  userId: string;
  projectId?: string;
  issueHash: string; // Hash of the issue to identify unique issues
  issue: {
    severity: string;
    category: string;
    type: string;
    message: string;
    line: number | null;
    suggestion: string;
  };
  ignoredAt: Date;
  reason?: string;
}

const ignoredIssueSchema = new mongoose.Schema<IIgnoredIssue>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    issueHash: {
      type: String,
      required: true,
      index: true,
    },
    issue: {
      severity: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
      message: {
        type: String,
        required: true,
      },
      line: {
        type: Number,
        default: null,
      },
      suggestion: {
        type: String,
        required: true,
      },
    },
    ignoredAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient lookups
ignoredIssueSchema.index({ userId: 1, issueHash: 1 }, { unique: true });
ignoredIssueSchema.index({ userId: 1, projectId: 1 });

const IgnoredIssue: Model<IIgnoredIssue> =
  mongoose.models.IgnoredIssue || mongoose.model<IIgnoredIssue>('IgnoredIssue', ignoredIssueSchema);

export default IgnoredIssue;
