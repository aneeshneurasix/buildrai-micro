import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityScan extends Document {
  id: string;
  userId: string;
  projectId?: string;
  scanType: 'npm-audit' | 'trivy' | 'eslint' | 'sonarqube' | 'snyk' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  triggeredBy: 'manual' | 'auto' | 'ci-cd';
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in seconds

  // Results summary
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };

  // Detailed findings
  findings: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    category: string; // 'vulnerability', 'code-smell', 'bug', 'security-hotspot'
    tool: string; // 'npm-audit', 'trivy', 'eslint', etc.
    file?: string;
    line?: number;
    cve?: string;
    cvss?: number;
    remediation?: string;
    references?: string[];
  }>;

  // Raw results (stored as JSON)
  rawResults?: {
    npmAudit?: any;
    trivy?: any;
    eslint?: any;
    sonarqube?: any;
    snyk?: any;
  };

  // Metadata
  metadata: {
    branch?: string;
    commit?: string;
    cicdPlatform?: string; // 'github', 'gitlab', 'azure', 'bitbucket', 'manual'
    buildUrl?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const SecurityScanSchema = new Schema<ISecurityScan>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      default: () => `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      index: true,
    },
    scanType: {
      type: String,
      required: true,
      enum: ['npm-audit', 'trivy', 'eslint', 'sonarqube', 'snyk', 'full'],
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    triggeredBy: {
      type: String,
      required: true,
      enum: ['manual', 'auto', 'ci-cd'],
      default: 'manual',
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
    },
    summary: {
      total: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    findings: [
      {
        id: String,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low', 'info'],
        },
        title: String,
        description: String,
        category: String,
        tool: String,
        file: String,
        line: Number,
        cve: String,
        cvss: Number,
        remediation: String,
        references: [String],
      },
    ],
    rawResults: {
      type: Schema.Types.Mixed,
    },
    metadata: {
      branch: String,
      commit: String,
      cicdPlatform: String,
      buildUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
SecurityScanSchema.index({ userId: 1, createdAt: -1 });
SecurityScanSchema.index({ projectId: 1, createdAt: -1 });
SecurityScanSchema.index({ status: 1 });
SecurityScanSchema.index({ 'summary.critical': 1 });
SecurityScanSchema.index({ 'summary.high': 1 });

const SecurityScanModel =
  mongoose.models.SecurityScan ||
  mongoose.model<ISecurityScan>('SecurityScan', SecurityScanSchema);

export default SecurityScanModel;
