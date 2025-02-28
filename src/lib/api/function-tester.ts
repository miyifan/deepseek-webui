import { FunctionDefinition } from '@/types';
import { executeFunctionCall } from './function-handler';

export interface TestResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
  requestData?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  };
}

function validateObjectStructure(
  value: any,
  paramDef: any,
  path: string[] = []
): string | null {
  if (paramDef.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return `${path.join('.')} 必须是一个对象`;
    }

    if (paramDef.properties) {
      for (const [key, propDef] of Object.entries<any>(paramDef.properties)) {
        if (key in value) {
          const error = validateObjectStructure(value[key], propDef, [...path, key]);
          if (error) return error;
        } else if (paramDef.required?.includes(key)) {
          return `缺少必需的字段: ${[...path, key].join('.')}`;
        }
      }
    }
    return null;
  }

  // 验证基本类型
  switch (paramDef.type) {
    case 'string':
      if (typeof value !== 'string') return `${path.join('.')} 必须是字符串类型`;
      break;
    // case 'number':
    //   if (typeof value !== 'number') return `${path.join('.')} 必须是数字类型`;
    //   break;
    case 'boolean':
      if (typeof value !== 'boolean') return `${path.join('.')} 必须是布尔类型`;
      break;
    // 可以添加更多类型的验证
  }

  return null;
}

export async function testFunction(
  func: FunctionDefinition,
  args: Record<string, any>
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // 验证参数结构
    for (const [key, value] of Object.entries(args)) {
      const paramDef = func.parameters.properties[key];
      if (!paramDef) {
        throw new Error(`未知的参数: ${key}`);
      }

      const error = validateObjectStructure(value, paramDef, [key]);
      if (error) {
        throw new Error(error);
      }
    }

    // 验证必需参数
    for (const requiredParam of func.parameters.required || []) {
      if (!(requiredParam in args)) {
        throw new Error(`缺少必需的参数: ${requiredParam}`);
      }
    }

    const result = await executeFunctionCall(func, args);
    return {
      success: true,
      data: result,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      duration: Date.now() - startTime,
    };
  }
} 