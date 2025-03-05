export interface ChatResponse {
  content: string;
  reasoningContent?: string;
  usedFunctions?: string[];
} 