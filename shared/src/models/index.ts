/**
 * Shared Database Models
 * Export all Mongoose models for use across microservices
 */

export { default as UserModel } from './User';
export type { UserDocument } from './User';

export { default as ProjectModel } from './Project';
export type { ProjectDocument, ProjectFile } from './Project';

export { default as ChatSessionModel } from './ChatSession';
export type { ChatSessionDocument, ChatMessage } from './ChatSession';

export { default as TaskQueueModel } from './TaskQueue';
export type { TaskQueueDocument } from './TaskQueue';

export { default as IntegrationModel } from './Integration';
export { default as SecurityScanModel } from './SecurityScan';
export { default as PreviewModel } from './Preview';
export { default as IgnoredIssueModel } from './IgnoredIssue';
export { default as ApiCollectionModel } from './ApiCollection';
export { default as ApiHistoryModel } from './ApiHistory';
