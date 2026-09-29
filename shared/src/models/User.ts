import mongoose, { Schema, Model, Document } from 'mongoose';

// User Document Interface
export interface UserDocument extends Document {
  id: string;
  email: string;
  username: string;
  profile: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    bio?: string;
    company?: string;
    website?: string;
  };
  subscription: {
    plan: 'free' | 'pro' | 'business' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  };
  usage: {
    projectsCreated: number;
    projectsThisMonth: number;
    tokensUsed: number;
    deploymentsUsed: number;
    aiRequests: number;
    totalTokensUsed: number;
    lastResetDate: Date;
  };
  limits: {
    projectsLimit: number;
    aiRequestsPerMonth: number;
    tokensPerMonth: number;
    deploymentsPerMonth: number;
  };
  preferences: {
    defaultAIModel: string;
    theme: 'light' | 'dark' | 'system';
    editorTheme: string;
  };
  notifications: {
    emails: Array<{
      email: string;
      verified: boolean;
      verificationToken?: string;
      verificationTokenExpiry?: Date;
      isPrimary: boolean;
      addedAt: Date;
    }>;
    preferences: {
      planExpiry: { enabled: boolean; daysBeforeExpiry: number };
      lowTokens: { enabled: boolean; thresholdPercentage: number };
      tokenExhausted: { enabled: boolean };
      tokenRecharge: { enabled: boolean };
      planRenewal: { enabled: boolean };
      planActivation: { enabled: boolean };
      monthlySummary: { enabled: boolean; dayOfMonth: number };
    };
    lastSentNotifications: {
      planExpiry?: Date;
      lowTokens?: Date;
      tokenExhausted?: Date;
      monthlySummary?: Date;
    };
  };
  cloudAuth: {
    aws: {
      method: 'oauth' | 'cross-account-role' | 'none';
      roleArn?: string;
      externalId?: string;
      region?: string;
      oauthToken?: string;
      tokenExpiry?: Date;
      oauthState?: string;
      oauthStateExpiry?: Date;
      oauthProjectId?: string;
    };
    azure: {
      method: 'oauth' | 'service-principal' | 'none';
      applicationId?: string;
      tenantId?: string;
      subscriptionId?: string;
      oauthToken?: string;
      tokenExpiry?: Date;
      oauthState?: string;
      oauthStateExpiry?: Date;
      oauthProjectId?: string;
    };
    gcp: {
      method: 'oauth' | 'service-account' | 'none';
      serviceAccountEmail?: string;
      projectId?: string;
      workloadIdentityPool?: string;
      oauthToken?: string;
      tokenExpiry?: Date;
      oauthState?: string;
      oauthStateExpiry?: Date;
      oauthProjectId?: string;
    };
  };
  canCreateProject(): boolean;
  resetMonthlyUsage(): Promise<UserDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    profile: {
      firstName: { type: String, required: false },
      lastName: { type: String, required: false },
      avatar: { type: String },
      bio: { type: String },
      company: { type: String },
      website: { type: String },
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'pro', 'business', 'enterprise'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'cancelled', 'past_due'],
        default: 'active',
      },
      currentPeriodStart: { type: Date },
      currentPeriodEnd: { type: Date },
    },
    usage: {
      projectsCreated: { type: Number, default: 0 },
      projectsThisMonth: { type: Number, default: 0 },
      tokensUsed: { type: Number, default: 0 },
      deploymentsUsed: { type: Number, default: 0 },
      aiRequests: { type: Number, default: 0 },
      totalTokensUsed: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    limits: {
      projectsLimit: { type: Number, default: 1 },
      aiRequestsPerMonth: { type: Number, default: 50 },
      tokensPerMonth: { type: Number, default: 50000 },
      deploymentsPerMonth: { type: Number, default: 10 },
    },
    preferences: {
      defaultAIModel: {
        type: String,
        default: 'claude-sonnet-4-5-20250929',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      editorTheme: {
        type: String,
        default: 'vs-dark',
      },
    },
    notifications: {
      emails: [
        {
          email: { type: String, required: true, lowercase: true, trim: true },
          verified: { type: Boolean, default: false },
          verificationToken: { type: String },
          verificationTokenExpiry: { type: Date },
          isPrimary: { type: Boolean, default: false },
          addedAt: { type: Date, default: Date.now },
        },
      ],
      preferences: {
        planExpiry: {
          enabled: { type: Boolean, default: true },
          daysBeforeExpiry: { type: Number, default: 7 },
        },
        lowTokens: {
          enabled: { type: Boolean, default: true },
          thresholdPercentage: { type: Number, default: 20 },
        },
        tokenExhausted: {
          enabled: { type: Boolean, default: true },
        },
        tokenRecharge: {
          enabled: { type: Boolean, default: true },
        },
        planRenewal: {
          enabled: { type: Boolean, default: true },
        },
        planActivation: {
          enabled: { type: Boolean, default: true },
        },
        monthlySummary: {
          enabled: { type: Boolean, default: true },
          dayOfMonth: { type: Number, default: 1 },
        },
      },
      lastSentNotifications: {
        planExpiry: { type: Date },
        lowTokens: { type: Date },
        tokenExhausted: { type: Date },
        monthlySummary: { type: Date },
      },
    },
    cloudAuth: {
      aws: {
        method: { type: String, enum: ['oauth', 'cross-account-role', 'none'], default: 'none' },
        roleArn: { type: String },
        externalId: { type: String },
        region: { type: String },
        oauthToken: { type: String },
        tokenExpiry: { type: Date },
        oauthState: { type: String },
        oauthStateExpiry: { type: Date },
        oauthProjectId: { type: String },
      },
      azure: {
        method: { type: String, enum: ['oauth', 'service-principal', 'none'], default: 'none' },
        applicationId: { type: String },
        tenantId: { type: String },
        subscriptionId: { type: String },
        oauthToken: { type: String },
        tokenExpiry: { type: Date },
        oauthState: { type: String },
        oauthStateExpiry: { type: Date },
        oauthProjectId: { type: String },
      },
      gcp: {
        method: { type: String, enum: ['oauth', 'service-account', 'none'], default: 'none' },
        serviceAccountEmail: { type: String },
        projectId: { type: String },
        workloadIdentityPool: { type: String },
        oauthToken: { type: String },
        tokenExpiry: { type: Date },
        oauthState: { type: String },
        oauthStateExpiry: { type: Date },
        oauthProjectId: { type: String },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
UserSchema.index({ 'subscription.plan': 1 });
UserSchema.index({ createdAt: -1 });

// Methods
UserSchema.methods.canCreateProject = function () {
  const limits: Record<string, number> = {
    free: 1,
    pro: 5,
    business: Infinity,
    enterprise: Infinity,
  };

  return this.usage.projectsThisMonth < limits[this.subscription.plan];
};

UserSchema.methods.resetMonthlyUsage = function () {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);

  if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
    this.usage.projectsThisMonth = 0;
    this.usage.deploymentsUsed = 0;
    this.usage.lastResetDate = now;
    return this.save();
  }

  return Promise.resolve(this);
};

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);

export default UserModel;
