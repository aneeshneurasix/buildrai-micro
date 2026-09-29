/**
 * Shared TypeScript types for Codstack microservices
 */

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  username: string;
  profile: {
    name?: string;
    avatar?: string;
    bio?: string;
    company?: string;
  };
  subscription: {
    plan: 'free' | 'pro' | 'business' | 'enterprise';
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
    periodEnd?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  usage: {
    projectsCreated: number;
    tokensUsed: number;
    aiRequests: number;
    deploymentsCreated: number;
    lastReset: Date;
  };
  limits: {
    maxProjects: number;
    maxTokensPerMonth: number;
    maxAIRequests: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

// Project Types
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  slug: string;
  settings: {
    template: string;
    language: string;
    framework?: string;
    packageManager: 'npm' | 'yarn' | 'pnpm';
    styling?: string;
  };
  files: ProjectFile[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  stats: {
    totalFiles: number;
    totalLines: number;
    totalSize: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  size: number;
  hash: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// AI & Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    tokens?: number;
    cost?: number;
    model?: string;
    timestamp: Date;
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  type: 'requirements' | 'code_generation' | 'debugging' | 'general';
  messages: ChatMessage[];
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface AIGenerationRequest {
  prompt: string;
  context?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface AIGenerationResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
  model: string;
}

// Task Queue Types
export interface TaskQueue {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  type: 'feature' | 'bug_fix' | 'refactor' | 'optimization' | 'testing';
  progress: {
    percentage: number;
    currentStep?: string;
    estimatedTimeRemaining?: number;
  };
  result?: {
    filesCreated: number;
    filesModified: number;
    linesAdded: number;
    summary?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Security Types
export interface SecurityScan {
  id: string;
  projectId: string;
  userId: string;
  scanResults: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    vulnerabilities: Vulnerability[];
    secrets: SecretDetection[];
  };
  scannedAt: Date;
  status: 'completed' | 'failed';
}

export interface Vulnerability {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  file: string;
  line: number;
  code?: string;
  recommendation?: string;
}

export interface SecretDetection {
  type: string;
  file: string;
  line: number;
  severity: 'high' | 'critical';
}

// Integration Types
export interface Integration {
  id: string;
  userId: string;
  provider: 'github' | 'bitbucket' | 'azure';
  providerUserId: string;
  providerUsername: string;
  accessToken: string; // encrypted
  refreshToken?: string; // encrypted
  scopes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    version: string;
  };
}

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Service Communication Types
export interface ServiceRequest {
  service: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  userId?: string;
}

export interface ServiceResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

// Event Types
export interface ServiceEvent {
  eventType: string;
  service: string;
  timestamp: Date;
  data: any;
  userId?: string;
  projectId?: string;
}

// Monitoring Types
export interface Metrics {
  service: string;
  timestamp: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
}

// Error Types
export class ServiceError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ServiceError {
  constructor(message: string = 'Authentication required') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ServiceError {
  constructor(message: string = 'Permission denied') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ServiceError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT_ERROR', message, 429);
    this.name = 'RateLimitError';
  }
}
