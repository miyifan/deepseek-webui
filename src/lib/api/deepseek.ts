import { Settings } from '@/types';
import { API_CONFIG } from './config';
import { executeFunctionCall } from './function-handler';
import { processRequestBody } from '@/lib/utils/function-utils';
// import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// 验证消息序列是否合法
function validateMessages(messages: ChatCompletionMessageParam[], model: string) {
  // 移除验证限制，允许任何消息序列
  return messages;
}

export async function chatCompletion(
  messages: ChatCompletionMessageParam[],
  settings: Settings,
  apiKey: string,
  onStream?: (content: string) => void,
  onStreamReasoning?: (content: string) => void,
  abortController?: AbortController
) {
  // const openai = new OpenAI({
  //   baseURL: API_CONFIG.BASE_URL,
  //   apiKey: apiKey,
  //   dangerouslyAllowBrowser: true
  // });

  try {
    // 先检查settings对象是否完整
    if (!settings || typeof settings !== 'object') {
      console.error('设置对象无效:', settings);
      throw new Error('聊天设置无效，请刷新页面重试');
    }
    
    // 确保model字段存在并有效
    if (!settings.model || !['chat', 'coder', 'reasoner'].includes(settings.model)) {
      console.error('无效的模型类型:', settings.model);
      console.log('使用默认chat模型替代');
      settings.model = 'chat';
    }
    
    // 确保获取正确的模型名称
    const modelName = API_CONFIG.MODELS[settings.model as keyof typeof API_CONFIG.MODELS];
    console.log('API调用 - 使用模型:', settings.model, '→', modelName, 'settings对象:', settings); 
    
    // 验证消息序列
    validateMessages(messages, modelName);

    // 只在非 deepseek-reasoner 模型时启用函数调用
    const tools = modelName !== 'deepseek-reasoner' ? settings.functions?.map(func => ({
      type: 'function' as const,
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters,
      },
    })) : undefined;

    if (!apiKey || apiKey.length < 30) {
      throw new Error('请先在设置页面配置您的 DeepSeek API Key');
    }
    
    // 检查是否使用reasoner模型并记录日志
    const isReasonerModel = modelName === 'deepseek-reasoner';
    console.log('API调用 - 是否使用Reasoner模型:', isReasonerModel);

    const response = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: modelName, // 使用正确转换的模型名称
        messages: messages.map(({ role, content }) => ({ role, content })),
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

    // 处理响应流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    let fullReasoningContent = '';
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

              // 处理内容流
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullContent += content;
                onStream?.(content);
              }
              
              // 处理reasoning_content流（仅在reasoner模型中有）
              if (parsed.choices?.[0]?.delta?.reasoning_content) {
                const content = parsed.choices[0].delta.reasoning_content;
                console.log('接收到reasoning_content:', content); // 调试日志
                fullReasoningContent += content;
                onStreamReasoning?.(content);
              } else if (isReasonerModel && !parsed.choices?.[0]?.delta?.reasoning_content && 
                         parsed.choices?.[0]?.delta?.content) {
                // 如果是reasoner模型，但没有收到reasoning_content，记录一个警告
                console.warn('使用的是reasoner模型，但未收到reasoning_content数据', parsed);
              }

              // 记录完整的解析数据，用于调试
              if (parsed.model) {
                console.log('API返回的模型名称:', parsed.model);
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
                    // 处理函数参数，保持对象结构
                    const processedArgs = processRequestBody(functionArgs, functionDef.parameters);
                    const result = await executeFunctionCall(functionDef, processedArgs);

                    const secondResponse = await fetch(`${API_CONFIG.BASE_URL}/chat/completions`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'text/event-stream',
                      },
                      body: JSON.stringify({
                        model: modelName,
                        messages: [
                          ...messages,
                          {
                            role: 'assistant',
                            content: fullContent,
                            // reasoning_content: fullReasoningContent,
                            tool_calls: [{
                              id: currentToolCall.id!,
                              type: 'function',
                              function: {
                                name: currentToolCall.function!.name!,
                                arguments: JSON.stringify(processedArgs, null, 2)
                              }
                            }]
                          },
                          {
                            role: 'tool',
                            tool_call_id: currentToolCall.id,
                            content: JSON.stringify(result, null, 2),
                          },
                        ],
                        temperature: settings.temperature,
                        stream: true,
                      }),
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
                              if (secondParsed.choices?.[0]?.delta?.reasoning_content) {
                                const content = secondParsed.choices[0].delta.reasoning_content;
                                fullReasoningContent += content;
                                onStreamReasoning?.(content);
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

    return {
      content: fullContent,
      reasoningContent: fullReasoningContent,
    };
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