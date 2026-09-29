import mongoose, { Schema, Model } from 'mongoose';

/**
 * API Request History Model
 * Stores history of executed API requests
 */

export interface APIHistoryDocument extends mongoose.Document {
  projectId: string;
  userId: string;
  request: {
    method: string;
    url: string;
    headers: { key: string; value: string }[];
    queryParams: { key: string; value: string }[];
    body?: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
    duration: number; // milliseconds
    size: number; // bytes
  };
  error?: string;
  timestamp: Date;
  collectionId?: string;
  requestId?: string;
}

const APIHistorySchema = new Schema<APIHistoryDocument>(
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
    request: {
      method: { type: String, required: true },
      url: { type: String, required: true },
      headers: [{
        key: { type: String },
        value: { type: String },
      }],
      queryParams: [{
        key: { type: String },
        value: { type: String },
      }],
      body: { type: Schema.Types.Mixed },
    },
    response: {
      status: { type: Number },
      statusText: { type: String },
      headers: { type: Map, of: String },
      data: { type: Schema.Types.Mixed },
      duration: { type: Number },
      size: { type: Number },
    },
    error: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    collectionId: { type: String },
    requestId: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
APIHistorySchema.index({ projectId: 1, userId: 1, timestamp: -1 });
APIHistorySchema.index({ timestamp: -1 });

// TTL index - automatically delete history older than 30 days
APIHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const APIHistoryModel: Model<APIHistoryDocument> =
  mongoose.models.APIHistory || mongoose.model<APIHistoryDocument>('APIHistory', APIHistorySchema);

export default APIHistoryModel;
