import { Settings } from '@/types';
import { API_CONFIG } from './config';
import { executeFunctionCall } from './function-handler';
// import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// 验证消息序列是否合法
function validateMessages(messages: ChatCompletionMessageParam[], model: string) {
  if (model === 'deepseek-reasoner') {
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role) {
        throw new Error('使用 deepseek-reasoner 模型时，消息序列中的用户和助手消息必须交替出现');
      }
    }
  }
}

export async function chatCompletion(
  messages: ChatCompletionMessageParam[],
  settings: Settings,
  apiKey: string,
  onStream?: (content: string) => void,
  abortController?: AbortController
) {
  // const openai = new OpenAI({
  //   baseURL: API_CONFIG.BASE_URL,
  //   apiKey: apiKey,
  //   dangerouslyAllowBrowser: true
  // });

  try {
    const modelName = API_CONFIG.MODELS[settings.model as keyof typeof API_CONFIG.MODELS];
    // 验证消息序列
    validateMessages(messages, modelName);

    // 启用函数调用
    const tools = settings.functions?.map(func => ({
      type: 'function' as const,
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters,
      },
    }));

    if (!apiKey || apiKey.length < 30) {
      throw new Error('请先在设置页面配置您的 DeepSeek API Key');
    }

    const response = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: API_CONFIG.MODELS[settings.model as keyof typeof API_CONFIG.MODELS],
        messages: messages.map(msg => ({ 
          role: msg.role, 
          content: msg.content 
        })),
        temperature: settings.temperature,
        ...(tools && tools.length > 0 ? { tools } : {}),
        stream: true,
      }),
      signal: abortController?.signal
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => null);
      const errorMessage = errorBody?.toLowerCase() || response.statusText.toLowerCase();

      if (errorMessage.includes('authentication') ||
        errorMessage.includes('apikey') ||
        errorMessage.includes('api key') ||
        errorMessage.includes('access token') ||
        errorMessage.includes('unauthorized')) {
        throw new Error('API Key 无效，请检查您的 API Key 设置');
      }

      throw new Error(
        `API 请求失败 (${response.status}): ${response.statusText}\n${errorBody ? `详细信息: ${errorBody}` : ''}`
      );
    }

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let currentToolCall: {
      id?: string;
      function?: {
        name?: string;
        arguments?: string;
      };
    } = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullContent += content;
                onStream?.(content);
              }

              if (parsed.choices?.[0]?.delta?.tool_calls?.[0]) {
                const toolCallDelta = parsed.choices[0].delta.tool_calls[0];

                if (toolCallDelta.id) {
                  currentToolCall.id = toolCallDelta.id;
                }
                if (toolCallDelta.function?.name) {
                  if (!currentToolCall.function) currentToolCall.function = {};
                  currentToolCall.function.name = toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  if (!currentToolCall.function) currentToolCall.function = {};
                  currentToolCall.function.arguments = (currentToolCall.function.arguments || '') +
                    toolCallDelta.function.arguments;
                }

                if (currentToolCall.id &&
                  currentToolCall.function?.name &&
                  typeof currentToolCall.function.arguments === 'string') {

                  const functionDef = settings.functions?.find(
                    f => f.name === currentToolCall.function?.name
                  );

                  if (!functionDef) {
                    throw new Error(`未找到函数定义: ${currentToolCall.function?.name}`);
                  }

                  try {
                    const functionArgs = JSON.parse(currentToolCall.function.arguments);
                    const result = await executeFunctionCall(functionDef, functionArgs);

                    const secondResponse = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                      },
                      body: JSON.stringify({
                        model: API_CONFIG.MODELS[settings.model as keyof typeof API_CONFIG.MODELS],
                        messages: [
                          ...messages.map(msg => ({ 
                            role: msg.role, 
                            content: msg.content 
                          })),
                          {
                            role: 'assistant',
                            content: fullContent,
                            tool_calls: [{
                              id: currentToolCall.id!,
                              type: 'function',
                              function: {
                                name: currentToolCall.function!.name!,
                                arguments: currentToolCall.function!.arguments!
                              }
                            }]
                          },
                          {
                            role: 'tool',
                            tool_call_id: currentToolCall.id,
                            content: JSON.stringify(result)
                          }
                        ],
                        temperature: settings.temperature,
                        stream: true,
                      }),
                      signal: abortController?.signal
                    });

                    if (!secondResponse.ok) {
                      throw new Error(`API 请求失败: ${secondResponse.statusText}`);
                    }

                    currentToolCall = {};

                    const secondReader = secondResponse.body?.getReader();
                    if (secondReader) {
                      let secondBuffer = '';
                      while (true) {
                        const { done, value } = await secondReader.read();
                        if (done) break;

                        const secondChunk = decoder.decode(value, { stream: true });
                        secondBuffer += secondChunk;

                        const secondLines = secondBuffer.split('\n');
                        secondBuffer = secondLines.pop() || '';

                        for (const secondLine of secondLines) {
                          if (!secondLine.trim() || secondLine.startsWith(':')) continue;

                          if (secondLine.startsWith('data: ')) {
                            const secondData = secondLine.slice(6).trim();
                            if (secondData === '[DONE]') continue;

                            try {
                              const secondParsed = JSON.parse(secondData);
                              if (secondParsed.choices?.[0]?.delta?.content) {
                                const content = secondParsed.choices[0].delta.content;
                                fullContent += content;
                                onStream?.(content);
                              }
                            } catch (e) {
                              console.error('解析第二次响应数据失败:', e);
                            }
                          }
                        }
                      }
                      secondReader.releaseLock();
                    }
                  } catch (e) {
                    console.error('执行函数调用失败:', e);
                  }
                }
              }
            } catch (e) {
              console.error('解析响应数据失败:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  } catch (error) {
    console.error('API 调用错误:', error);
    throw error;
  }
}



export interface BalanceInfo {
  currency: 'CNY' | 'USD';
  total_balance: string;
  granted_balance: string;
  topped_up_balance: string;
}

export interface BalanceResponse {
  is_available: boolean;
  balance_infos: BalanceInfo[];
}

export async function getBalance(apiKey: string): Promise<BalanceResponse> {
  if (!apiKey) {
    throw new Error('请先设置 API Key');
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}/user/balance`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取余额失败');
  }

  return response.json();
}

interface UploadFileResponse {
  code: number;
  msg: string;
  data: {
    biz_code: number;
    biz_msg: string;
    biz_data: {
      id: string;
      status: string;
      file_name: string;
      file_size: number;
      token_usage: number;
      error_code: null | string;
      inserted_at: number;
      updated_at: number;
    };
  };
}

interface CreateSessionResponse {
  code: number;
  msg: string;
  data: {
    biz_code: number;
    biz_msg: string;
    biz_data: {
      id: string;
      seq_id: number;
      agent: string;
      character: null | string;
      title: null | string;
      title_type: null | string;
      version: number;
      current_message_id: null | string;
      inserted_at: number;
      updated_at: number;
    };
  };
}

interface CompletionOptions {
  chat_session_id: string;
  parent_message_id: string | null;
  prompt: string;
  ref_file_ids: string[];
  search_enabled?: boolean;
  thinking_enabled?: boolean;
  onStream?: (content: string) => void;
  apiKey: string;
}


export class DeepSeekApiError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'DeepSeekApiError';
  }
}

/**
 * 上传文件到 DeepSeek
 * @param file 要上传的文件
 * @returns 上传成功后的文件信息
 */
export async function openUploadFile(file: File, apiKey: string): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_CONFIG.BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });



  if (!response.ok) {
    throw new DeepSeekApiError(`文件上传失败: ${response.statusText}`, response.status);
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new DeepSeekApiError(result.msg || '文件上传失败', result.code);
  }

  return result;
}

/**
 * 创建新的聊天会话
 * @param character_id 可选的角色ID
 * @returns 创建的会话信息
 */
export async function openCreateSession(character_id: string | null = null, apiKey: string): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_CONFIG.BASE_URL_V0}/chat_session/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ character_id }),
  });

  if (!response.ok) {
    throw new DeepSeekApiError(`创建会话失败: ${response.statusText}`, response.status);
  }

  const result = await response.json();
  if (result.code !== 0) {
    throw new DeepSeekApiError(result.msg || '创建会话失败', result.code);
  }

  return result;
}

/**
 * 发送消息并获取流式响应
 * @param options 消息选项
 */
export async function openChatCompletion({
  chat_session_id,
  parent_message_id,
  prompt,
  ref_file_ids,
  search_enabled = false,
  thinking_enabled = false,
  onStream,
  apiKey,

}: CompletionOptions): Promise<void> {
  const response = await fetch(`${API_CONFIG.BASE_URL_V0}/chat/completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      chat_session_id,
      parent_message_id,
      prompt,
      ref_file_ids,
      search_enabled,
      thinking_enabled,
    }),
  });

  if (!response.ok) {
    throw new DeepSeekApiError(`发送消息失败: ${response.statusText}`, response.status);
  }

  if (!response.body) {
    throw new DeepSeekApiError('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      onStream?.(chunk);
    }
  } finally {
    reader.releaseLock();
  }
} 