/**
 * AI Models Configuration
 * Centralized list of all supported AI models
 */

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  displayName: string;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
  capabilities: string[];
  maxTokens: number;
}

export const AI_MODELS: AIModel[] = [
  // Anthropic Models
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'claude-sonnet-4-5',
    provider: 'anthropic',
    displayName: 'Claude Sonnet 4.5',
    description: 'Most capable model with best reasoning and coding',
    speed: 'medium',
    cost: 'high',
    capabilities: ['Advanced reasoning', 'Complex coding', 'Long context'],
    maxTokens: 200000,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet',
    provider: 'anthropic',
    displayName: 'Claude 3.5 Sonnet',
    description: 'Balanced performance and cost',
    speed: 'medium',
    cost: 'medium',
    capabilities: ['Good reasoning', 'Coding', 'Analysis'],
    maxTokens: 200000,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'claude-haiku',
    provider: 'anthropic',
    displayName: 'Claude Haiku',
    description: 'Fastest and most affordable Claude model',
    speed: 'fast',
    cost: 'low',
    capabilities: ['Quick responses', 'Simple tasks', 'Cost-effective'],
    maxTokens: 200000,
  },

  // OpenAI Models
  {
    id: 'gpt-4-turbo',
    name: 'gpt-4-turbo',
    provider: 'openai',
    displayName: 'GPT-4 Turbo',
    description: 'Most capable OpenAI model',
    speed: 'medium',
    cost: 'high',
    capabilities: ['Advanced reasoning', 'Coding', 'Vision'],
    maxTokens: 128000,
  },
  {
    id: 'gpt-4',
    name: 'gpt-4',
    provider: 'openai',
    displayName: 'GPT-4',
    description: 'Powerful and reliable',
    speed: 'slow',
    cost: 'high',
    capabilities: ['Strong reasoning', 'Complex tasks'],
    maxTokens: 8192,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'gpt-3.5-turbo',
    provider: 'openai',
    displayName: 'GPT-3.5 Turbo',
    description: 'Fast and affordable',
    speed: 'fast',
    cost: 'low',
    capabilities: ['Quick responses', 'General tasks'],
    maxTokens: 16384,
  },
];

/**
 * Get all valid model IDs
 */
export const VALID_MODEL_IDS = AI_MODELS.map((model) => model.id);

/**
 * Default AI model ID
 */
export const DEFAULT_MODEL_ID = 'claude-sonnet-4-5-20250929';

/**
 * Get model by ID
 */
export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find((model) => model.id === modelId);
}

/**
 * Check if model ID is valid
 */
export function isValidModelId(modelId: string): boolean {
  return VALID_MODEL_IDS.includes(modelId);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: 'anthropic' | 'openai'): AIModel[] {
  return AI_MODELS.filter((model) => model.provider === provider);
}
