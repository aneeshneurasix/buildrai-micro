/**
 * Integration Model for OAuth Connections
 *
 * Stores encrypted OAuth tokens and integration metadata for each user.
 */

import mongoose from 'mongoose';

export interface IIntegration extends mongoose.Document {
  userId: string; // Clerk user ID
  provider: 'github' | 'bitbucket' | 'azure';
  providerUserId: string; // User ID from the provider (e.g., GitHub user ID)
  providerUsername: string; // Username from the provider
  providerEmail?: string; // Email from the provider

  // Encrypted tokens
  accessToken: string; // Encrypted OAuth access token
  refreshToken?: string; // Encrypted OAuth refresh token (if available)
  tokenType: string; // Usually 'Bearer'

  // Token metadata
  expiresAt?: Date; // When the access token expires
  scopes: string[]; // OAuth scopes granted

  // Metadata
  isActive: boolean; // Whether the integration is currently active
  lastUsedAt?: Date; // Last time the integration was used
  createdAt: Date;
  updatedAt: Date;
}

const integrationSchema = new mongoose.Schema<IIntegration>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ['github', 'bitbucket', 'azure'],
    },
    providerUserId: {
      type: String,
      required: true,
    },
    providerUsername: {
      type: String,
      required: true,
    },
    providerEmail: {
      type: String,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    tokenType: {
      type: String,
      default: 'Bearer',
    },
    expiresAt: {
      type: Date,
    },
    scopes: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one integration per user per provider
integrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

// Index for cleanup of inactive integrations
integrationSchema.index({ isActive: 1, updatedAt: 1 });

export const Integration =
  (mongoose.models.Integration as mongoose.Model<IIntegration>) ||
  mongoose.model<IIntegration>('Integration', integrationSchema);
