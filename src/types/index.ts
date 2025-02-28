
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  reasoning_content?: string;
  content: string;
  timestamp: number;
  tool_call_id?: string;
}

export interface FunctionParameter {
  type: string;
  description?: string;
  enum?: string[];
  default?: string;
}

export interface FunctionDefinition {
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required: string[];
  };
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
}
export interface SearchFunctionDefinition {
  api_key: string;
  id: string;
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, FunctionParameter>;
    required: string[];
  };
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
}
export interface Settings {
  model: string;
  temperature: number;
  systemPrompt: string;
  functions: FunctionDefinition[];
}

export interface ChatSettings {
  temperature: number;
  topP: number;
  topK: number;
  maxLength: number;
  systemPrompt: string;
  model: 'reasoner' | 'chat' | 'coder';
  functions: FunctionDefinition[];
} 