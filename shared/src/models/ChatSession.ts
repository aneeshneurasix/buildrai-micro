import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    tokenCount?: number;
    model?: string;
    responseTime?: number;
    cost?: number;
  };
  createdAt: Date;
}

export interface ChatSessionDocument extends Document {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  type: 'requirements' | 'code_generation' | 'debugging' | 'general';
  messages: ChatMessage[];
  summary: {
    mainTopics: string[];
    keyDecisions: string[];
    filesModified: string[];
    changesApplied: string[];
    pendingTasks: string[];
    userGoal?: string;
    outcome?: string;
    nextSteps: string[];
    generatedAt?: Date;
  };
  status: 'active' | 'archived';
  messageCount: number;
  totalTokens: number;
  totalCost: number;
  addMessage(role: 'user' | 'assistant' | 'system', content: string, metadata?: ChatMessage['metadata']): Promise<ChatSessionDocument>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<ChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  metadata: {
    tokenCount: { type: Number },
    model: { type: String },
    responseTime: { type: Number },
    cost: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ChatSessionSchema = new Schema<ChatSessionDocument>(
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
    projectId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['requirements', 'code_generation', 'debugging', 'general'],
      default: 'general',
    },
    messages: [ChatMessageSchema],
    summary: {
      mainTopics: [{ type: String }],
      keyDecisions: [{ type: String }],
      filesModified: [{ type: String }],
      changesApplied: [{ type: String }],
      pendingTasks: [{ type: String }],
      userGoal: { type: String },
      outcome: { type: String },
      nextSteps: [{ type: String }],
      generatedAt: { type: Date },
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ChatSessionSchema.index({ userId: 1, updatedAt: -1 });
ChatSessionSchema.index({ projectId: 1 });
ChatSessionSchema.index({ status: 1 });

// Virtuals
ChatSessionSchema.virtual('messageCount').get(function () {
  return this.messages.length;
});

ChatSessionSchema.virtual('totalTokens').get(function () {
  return this.messages.reduce((acc, msg) => acc + (msg.metadata?.tokenCount || 0), 0);
});

ChatSessionSchema.virtual('totalCost').get(function () {
  return this.messages.reduce((acc, msg) => acc + (msg.metadata?.cost || 0), 0);
});

// Methods
ChatSessionSchema.methods.addMessage = function (
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: ChatMessage['metadata']
) {
  this.messages.push({
    role,
    content,
    metadata,
    createdAt: new Date(),
  });

  if (this.messages.length === 1 && role === 'user') {
    this.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
  }

  return this.save();
};

const ChatSessionModel: Model<ChatSessionDocument> =
  mongoose.models.ChatSession ||
  mongoose.model<ChatSessionDocument>('ChatSession', ChatSessionSchema);

export default ChatSessionModel;
