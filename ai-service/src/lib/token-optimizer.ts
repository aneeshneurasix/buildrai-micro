/**
 * Token Optimization Utilities
 * Strategies to reduce AI token usage and costs
 */

export interface TokenOptimizationConfig {
  maxConversationHistory?: number;
  maxFileContext?: number;
  enableCaching?: boolean;
  summarizeOldMessages?: boolean;
}

const DEFAULT_CONFIG: TokenOptimizationConfig = {
  maxConversationHistory: 5, // Keep only last 5 messages in history
  maxFileContext: 10, // Include max 10 files in context
  enableCaching: true,
  summarizeOldMessages: true,
};

/**
 * Optimize conversation history to reduce tokens
 */
export function optimizeConversationHistory(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  config: TokenOptimizationConfig = DEFAULT_CONFIG
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  const maxHistory = config.maxConversationHistory || 5;

  // Keep system messages
  const systemMessages = messages.filter((m) => m.role === 'system');

  // Get recent conversation (excluding system messages)
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  // Keep only recent messages
  const recentMessages = conversationMessages.slice(-maxHistory * 2); // *2 because each exchange = user + assistant

  return [...systemMessages, ...recentMessages];
}

/**
 * Summarize old messages to reduce token usage
 */
export function summarizeConversationHistory(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  keepRecentCount: number = 4
): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
  if (messages.length <= keepRecentCount) {
    return messages;
  }

  // Keep system messages separate
  const systemMessages = messages.filter((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  // Keep recent messages
  const recentMessages = nonSystemMessages.slice(-keepRecentCount);

  // Summarize older messages
  const olderMessages = nonSystemMessages.slice(0, -keepRecentCount);

  if (olderMessages.length === 0) {
    return [...systemMessages, ...recentMessages];
  }

  // Create a summary of older conversation
  const summary = {
    role: 'system' as const,
    content: `[Previous conversation summary: The user previously discussed ${olderMessages
      .filter((m) => m.role === 'user')
      .map((m) => truncateText(m.content, 50))
      .join(', ')}. ${olderMessages.length} messages in total.]`,
  };

  return [...systemMessages, summary, ...recentMessages];
}

/**
 * Optimize file context by limiting number and size of files
 */
export function optimizeFileContext(
  files: Array<{ path: string; content: string }>,
  config: TokenOptimizationConfig = DEFAULT_CONFIG
): Array<{ path: string; content: string }> {
  const maxFiles = config.maxFileContext || 10;

  if (files.length <= maxFiles) {
    return files;
  }

  // Prioritize files:
  // 1. Recently modified files
  // 2. Smaller files (easier to include)
  // 3. Important file types (config, main files)

  const prioritizedFiles = files
    .map((file) => ({
      ...file,
      score: calculateFileRelevanceScore(file),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(({ path, content }) => ({ path, content }));

  return prioritizedFiles;
}

/**
 * Calculate relevance score for file prioritization
 */
function calculateFileRelevanceScore(file: { path: string; content: string }): number {
  let score = 0;

  // Prioritize important file types
  const importantExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java'];
  const configFiles = ['package.json', 'tsconfig.json', '.env', 'Dockerfile'];

  const ext = file.path.substring(file.path.lastIndexOf('.'));
  if (importantExtensions.includes(ext)) score += 10;
  if (configFiles.some((cfg) => file.path.includes(cfg))) score += 20;

  // Prefer smaller files (less tokens)
  const sizeInKB = file.content.length / 1024;
  if (sizeInKB < 10) score += 15; // Small files
  else if (sizeInKB < 50) score += 10; // Medium files
  else if (sizeInKB < 100) score += 5; // Large files
  // else: very large files get 0 bonus

  return score;
}

/**
 * Truncate text to max length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Compress code by removing comments and extra whitespace (use carefully!)
 */
export function compressCode(code: string, language: string): string {
  // Only compress for context, not for generation
  // Remove single-line comments
  let compressed = code;

  if (['typescript', 'javascript', 'java', 'cpp'].includes(language)) {
    // Remove // comments
    compressed = compressed.replace(/\/\/.*$/gm, '');
    // Remove /* */ comments
    compressed = compressed.replace(/\/\*[\s\S]*?\*\//g, '');
  } else if (language === 'python') {
    // Remove # comments
    compressed = compressed.replace(/#.*$/gm, '');
  }

  // Remove excessive whitespace
  compressed = compressed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return compressed;
}

/**
 * Estimate tokens in text (approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if adding text would exceed token limit
 */
export function wouldExceedTokenLimit(
  existingContent: string,
  newContent: string,
  maxTokens: number
): boolean {
  const totalTokens = estimateTokens(existingContent + newContent);
  return totalTokens > maxTokens;
}

/**
 * Smart context window management
 * Returns optimized content that fits within token budget
 */
export function buildContextWindow(options: {
  systemPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  currentMessage: string;
  files?: Array<{ path: string; content: string }>;
  maxTokens?: number;
}): {
  systemPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  currentMessage: string;
  filesContext: string;
  totalEstimatedTokens: number;
} {
  const maxTokens = options.maxTokens || 150000; // Conservative limit
  const reserveTokensForResponse = 8000; // Reserve for AI response
  const availableTokens = maxTokens - reserveTokensForResponse;

  let systemPrompt = options.systemPrompt;
  let currentMessage = options.currentMessage;

  // Start with essentials
  let usedTokens = estimateTokens(systemPrompt) + estimateTokens(currentMessage);

  // Optimize conversation history
  let conversationHistory = optimizeConversationHistory(
    options.conversationHistory,
    DEFAULT_CONFIG
  );

  const historyTokens = conversationHistory.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0
  );
  usedTokens += historyTokens;

  // Add file context if space allows
  let filesContext = '';
  if (options.files && options.files.length > 0) {
    const optimizedFiles = optimizeFileContext(options.files, DEFAULT_CONFIG);

    const fileContextParts: string[] = [];
    for (const file of optimizedFiles) {
      const fileText = `File: ${file.path}\n${file.content}\n`;
      const fileTokens = estimateTokens(fileText);

      if (usedTokens + fileTokens > availableTokens) {
        // File doesn't fit, try with truncated content
        const truncatedContent = truncateText(file.content, 1000);
        const truncatedText = `File: ${file.path}\n${truncatedContent}\n`;
        const truncatedTokens = estimateTokens(truncatedText);

        if (usedTokens + truncatedTokens <= availableTokens) {
          fileContextParts.push(truncatedText);
          usedTokens += truncatedTokens;
        }
      } else {
        fileContextParts.push(fileText);
        usedTokens += fileTokens;
      }
    }

    filesContext = fileContextParts.join('\n---\n\n');
  }

  return {
    systemPrompt,
    conversationHistory,
    currentMessage,
    filesContext,
    totalEstimatedTokens: usedTokens,
  };
}

/**
 * Get optimization recommendations
 */
export function getOptimizationRecommendations(tokenUsage: {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}): string[] {
  const recommendations: string[] = [];

  if (tokenUsage.inputTokens > 100000) {
    recommendations.push(
      'High input token usage detected. Consider reducing conversation history or file context.'
    );
  }

  if (tokenUsage.outputTokens > 10000) {
    recommendations.push(
      'Large responses generated. Consider breaking down requests into smaller tasks.'
    );
  }

  if (tokenUsage.totalCost > 1.0) {
    recommendations.push(
      'High cost detected ($' +
        tokenUsage.totalCost.toFixed(2) +
        '). Consider using a cheaper model for simpler tasks.'
    );
  }

  return recommendations;
}
