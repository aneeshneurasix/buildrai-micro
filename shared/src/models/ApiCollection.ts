import mongoose, { Schema, Model } from 'mongoose';

/**
 * API Collection Model
 * Stores organized groups of API requests (like Postman collections)
 */

export interface APIRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: { key: string; value: string; enabled: boolean }[];
  queryParams: { key: string; value: string; enabled: boolean }[];
  body?: {
    type: 'none' | 'json' | 'form-data' | 'urlencoded' | 'raw' | 'binary';
    data: any;
  };
  auth?: {
    type: 'none' | 'bearer' | 'basic' | 'oauth2' | 'api-key';
    credentials: any;
  };
  preRequestScript?: string; // JavaScript code to run before request
  tests?: string; // JavaScript code to validate response
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIEnvironment {
  id: string;
  name: string;
  variables: { key: string; value: string; enabled: boolean }[];
  isActive: boolean;
}

export interface APICollectionDocument extends mongoose.Document {
  projectId: string;
  userId: string;
  name: string;
  description?: string;
  requests: APIRequest[];
  environments: APIEnvironment[];
  folder?: string; // For organizing collections
  settings?: {
    followRedirects: boolean;
    validateSSL: boolean;
    timeout: number; // milliseconds
  };
  aiSuggestions?: {
    discoveredEndpoints: string[];
    suggestedTests: string[];
    lastScannedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const APIRequestSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    default: 'GET',
  },
  url: { type: String, required: true },
  headers: [{
    key: { type: String },
    value: { type: String },
    enabled: { type: Boolean, default: true },
  }],
  queryParams: [{
    key: { type: String },
    value: { type: String },
    enabled: { type: Boolean, default: true },
  }],
  body: {
    type: {
      type: String,
      enum: ['none', 'json', 'form-data', 'urlencoded', 'raw', 'binary'],
      default: 'none',
    },
    data: { type: Schema.Types.Mixed },
  },
  auth: {
    type: {
      type: String,
      enum: ['none', 'bearer', 'basic', 'oauth2', 'api-key'],
      default: 'none',
    },
    credentials: { type: Schema.Types.Mixed },
  },
  preRequestScript: { type: String },
  tests: { type: String },
  description: { type: String },
}, { timestamps: true });

const APIEnvironmentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  variables: [{
    key: { type: String },
    value: { type: String },
    enabled: { type: Boolean, default: true },
  }],
  isActive: { type: Boolean, default: false },
});

const APICollectionSchema = new Schema<APICollectionDocument>(
  {
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
    name: {
      type: String,
      required: true,
    },
    description: { type: String },
    requests: [APIRequestSchema],
    environments: [APIEnvironmentSchema],
    folder: { type: String },
    settings: {
      followRedirects: { type: Boolean, default: true },
      validateSSL: { type: Boolean, default: true },
      timeout: { type: Number, default: 30000 }, // 30 seconds
    },
    aiSuggestions: {
      discoveredEndpoints: [{ type: String }],
      suggestedTests: [{ type: String }],
      lastScannedAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
APICollectionSchema.index({ projectId: 1, userId: 1 });
APICollectionSchema.index({ createdAt: -1 });
APICollectionSchema.index({ 'requests.id': 1 });

// Methods
APICollectionSchema.methods.addRequest = function (request: Partial<APIRequest>) {
  const newRequest: APIRequest = {
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: request.name || 'New Request',
    method: request.method || 'GET',
    url: request.url || '',
    headers: request.headers || [],
    queryParams: request.queryParams || [],
    body: request.body,
    auth: request.auth,
    preRequestScript: request.preRequestScript,
    tests: request.tests,
    description: request.description,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  this.requests.push(newRequest);
  return this.save();
};

APICollectionSchema.methods.updateRequest = function (requestId: string, updates: Partial<APIRequest>) {
  const request = this.requests.find((r: APIRequest) => r.id === requestId);
  if (!request) {
    throw new Error('Request not found');
  }

  Object.assign(request, { ...updates, updatedAt: new Date() });
  return this.save();
};

APICollectionSchema.methods.deleteRequest = function (requestId: string) {
  this.requests = this.requests.filter((r: APIRequest) => r.id !== requestId);
  return this.save();
};

APICollectionSchema.methods.addEnvironment = function (environment: Partial<APIEnvironment>) {
  const newEnv: APIEnvironment = {
    id: `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: environment.name || 'New Environment',
    variables: environment.variables || [],
    isActive: environment.isActive || false,
  };

  // Deactivate all other environments if this one is active
  if (newEnv.isActive) {
    this.environments.forEach((env: APIEnvironment) => {
      env.isActive = false;
    });
  }

  this.environments.push(newEnv);
  return this.save();
};

const APICollectionModel: Model<APICollectionDocument> =
  mongoose.models.APICollection || mongoose.model<APICollectionDocument>('APICollection', APICollectionSchema);

export default APICollectionModel;
