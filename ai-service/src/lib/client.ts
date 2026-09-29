/**
 * Unified AI Client
 * Uses Amazon Bedrock for all AI model access (Anthropic Claude, Meta Llama, etc.)
 * Provides cost savings and better AWS integration vs direct API calls
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { getModelById } from './models';
import { logger } from '@buildr/shared';

// Cached Bedrock client
let bedrockClient: BedrockRuntimeClient | null = null;

/**
 * Get or create Bedrock Runtime client
 * Uses IAM role credentials from ECS task - no API keys needed!
 */
function getBedrockClient(): BedrockRuntimeClient {
  if (bedrockClient) {
    return bedrockClient;
  }

  const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';

  bedrockClient = new BedrockRuntimeClient({
    region: AWS_REGION,
    // Credentials automatically loaded from ECS task IAM role
  });

  logger.info(`Bedrock client initialized in region ${AWS_REGION}`);
  return bedrockClient;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    inputTokens?: number;
    outputTokens?: number;
  };
}

/**
 * Create a chat completion using Amazon Bedrock
 * Bedrock provides access to: Anthropic Claude, Meta Llama, Cohere, etc.
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const model = getModelById(options.model);

  if (!model) {
    throw new Error(`Invalid model ID: ${options.model}`);
  }

  logger.info(`Creating chat completion with Bedrock: ${model.name}`);

  if (model.provider === 'anthropic') {
    return createBedrockAnthropicCompletion(messages, options);
  } else if (model.provider === 'meta') {
    return createBedrockLlamaCompletion(messages, options);
  } else {
    throw new Error(`Unsupported provider: ${model.provider}`);
  }
}

/**
 * Create completion using Anthropic Claude via Bedrock
 * Model IDs: anthropic.claude-3-5-sonnet-20241022-v2:0, etc.
 */
async function createBedrockAnthropicCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const client = getBedrockClient();

  // Map our model ID to Bedrock model ID
  const bedrockModelId = mapToBedrockModelId(options.model);

  // Convert messages format (Anthropic doesn't support system role in messages)
  const anthropicMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Extract system message if present
  const systemMessage =
    options.system || messages.find((m) => m.role === 'system')?.content;

  // Bedrock Anthropic request format
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    messages: anthropicMessages,
    ...(systemMessage && { system: systemMessage }),
  };

  const command = new InvokeModelCommand({
    modelId: bedrockModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  const textContent = responseBody.content?.find((block: any) => block.type === 'text');
  const content = textContent?.text || '';

  return {
    content,
    usage: {
      input_tokens: responseBody.usage?.input_tokens || 0,
      output_tokens: responseBody.usage?.output_tokens || 0,
      inputTokens: responseBody.usage?.input_tokens || 0,
      outputTokens: responseBody.usage?.output_tokens || 0,
    },
  };
}

/**
 * Create completion using Meta Llama via Bedrock (alternative to Claude)
 * Model IDs: meta.llama3-1-70b-instruct-v1:0, etc.
 */
async function createBedrockLlamaCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions
): Promise<ChatCompletionResponse> {
  const client = getBedrockClient();
  const bedrockModelId = mapToBedrockModelId(options.model);

  // Convert to Llama chat format
  const prompt = messages
    .map((m) => {
      if (m.role === 'system') return `<s>[INST] <<SYS>>\n${m.content}\n<</SYS>>`;
      if (m.role === 'user') return `[INST] ${m.content} [/INST]`;
      return m.content;
    })
    .join('\n');

  const requestBody = {
    prompt,
    max_gen_len: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    top_p: 0.9,
  };

  const command = new InvokeModelCommand({
    modelId: bedrockModelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return {
    content: responseBody.generation || '',
    usage: {
      input_tokens: responseBody.prompt_token_count || 0,
      output_tokens: responseBody.generation_token_count || 0,
      inputTokens: responseBody.prompt_token_count || 0,
      outputTokens: responseBody.generation_token_count || 0,
    },
  };
}

/**
 * Map our model IDs to Bedrock model IDs
 */
function mapToBedrockModelId(modelId: string): string {
  const mapping: Record<string, string> = {
    // Anthropic Claude models
    'claude-sonnet-4-5-20250929': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'claude-3-5-sonnet-20241022': 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    'claude-3-haiku-20240307': 'anthropic.claude-3-haiku-20240307-v1:0',
    'claude-3-opus-20240229': 'anthropic.claude-3-opus-20240229-v1:0',

    // Meta Llama models (alternative)
    'llama-3.1-70b': 'meta.llama3-1-70b-instruct-v1:0',
    'llama-3.1-8b': 'meta.llama3-1-8b-instruct-v1:0',
  };

  return mapping[modelId] || mapping['claude-3-5-sonnet-20241022'];
}

/**
 * Estimate tokens (approximate)
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost based on model and token usage
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // Anthropic Claude pricing (per million tokens)
    'claude-sonnet-4-5-20250929': {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
    },
    'claude-3-5-sonnet-20241022': {
      input: 3.0 / 1_000_000,
      output: 15.0 / 1_000_000,
    },
    'claude-3-haiku-20240307': {
      input: 0.25 / 1_000_000,
      output: 1.25 / 1_000_000,
    },

    // OpenAI pricing (per million tokens)
    'gpt-4-turbo': {
      input: 10.0 / 1_000_000,
      output: 30.0 / 1_000_000,
    },
    'gpt-4': {
      input: 30.0 / 1_000_000,
      output: 60.0 / 1_000_000,
    },
    'gpt-3.5-turbo': {
      input: 0.5 / 1_000_000,
      output: 1.5 / 1_000_000,
    },
  };

  const modelPricing = pricing[modelId] || pricing['claude-sonnet-4-5-20250929'];

  return inputTokens * modelPricing.input + outputTokens * modelPricing.output;
}
