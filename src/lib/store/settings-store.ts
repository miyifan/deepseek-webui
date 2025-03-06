import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatSettings, FunctionDefinition } from '@/types';

interface SettingsState {
  settings: ChatSettings;
  apiKey: string;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  setApiKey: (apiKey: string) => void;
  addFunction: (func: Omit<FunctionDefinition, 'id'>) => void;
  updateFunction: (id: string, func: Partial<FunctionDefinition>) => void;
  deleteFunction: (id: string) => void;
  resetFunctions: () => void;
}

// 添加公共变量
const WEATHER_API_KEY = '70d187e64b9049c7a0012321252702';
const SERP_API_KEY = '32c19cbba534abb7f5e9b30da83e4dcdadd78bc0807f6b8771e71864eaa38f95';
export const defaultFunctions: FunctionDefinition[] = [
  {
    id: 'weather',
    name: 'get_weather',
    description: '获取指定城市的天气信息，城市中文需要转换成拼音',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: '城市名称、邮编或坐标，例如：北京、Shanghai、London、Paris',
        },
        aqi: {
          type: 'string',
          description: '是否包含空气质量数据',
          enum: ['yes', 'no'],
        },
        lang: {
          type: 'string',
          description: '返回数据的语言',
          enum: ['zh', 'en'],
        }
      },
      required: ['location'],
    },
    url: `https://api.weatherapi.com/v1/current.json?q={location}&key=${WEATHER_API_KEY}`,
    method: 'GET',
    headers: {
      "key": WEATHER_API_KEY  // 使用公共变量
    },
  },
  {
    id: 'search',
    name: 'search_web',
    description: '搜索网页内容,找到相关信息',
    parameters: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: '搜索关键词',
        }
      },
      required: ['q'],
    },
    url: `/api/proxy?url=${encodeURIComponent(`https://serpapi.com/search.json?api_key=${SERP_API_KEY}`)}&q={q}`,
    method: 'GET',
    headers: {}
  },
  {
    id: 'translate',
    name: 'translate_text',
    description: '翻译文本内容',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: '要翻译的文本',
        },
        source_lang: {
          type: 'string',
          description: '源语言',
          enum: ['auto', 'en', 'zh', 'ja', 'ko', 'fr', 'de'],
        },
        target_lang: {
          type: 'string',
          description: '目标语言',
          enum: ['en', 'zh', 'ja', 'ko', 'fr', 'de'],
        },
      },
      required: ['text', 'target_lang'],
    },
    url: 'https://api.deepl.com/v2/translate',
    method: 'POST',
    headers: {
      'Authorization': 'DeepL-Auth-Key {DEEPL_API_KEY}',
    },
  },
  {
    id: 'image_generation',
    name: 'generate_image',
    description: '根据文本描述生成图片',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '图片描述文本',
        },
        size: {
          type: 'string',
          description: '图片尺寸',
          enum: ['256x256', '512x512', '1024x1024'],
        },
        style: {
          type: 'string',
          description: '图片风格',
          enum: ['realistic', 'artistic', 'anime'],
        },
      },
      required: ['prompt'],
    },
    url: 'https://api.stability.ai/v1/generation',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer {STABILITY_API_KEY}',
      'Content-Type': 'application/json',
    },
  },
];

const defaultSettings: ChatSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 50,
  maxLength: 10000,
  systemPrompt: '',
  model: 'reasoner',
  functions: defaultFunctions,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      apiKey: 'sk-8d6ae9e94d2e4870abf891bca5801313',
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setApiKey: (apiKey) => set({ apiKey }),
      addFunction: (func) =>
        set((state) => ({
          settings: {
            ...state.settings,
            functions: [
              ...(state.settings.functions || []),
              { ...func, id: `func_${Date.now()}` },
            ],
          },
        })),
      updateFunction: (id, func) =>
        set((state) => ({
          settings: {
            ...state.settings,
            functions: (state.settings.functions || []).map((f) =>
              f.id === id ? { ...f, ...func } : f
            ),
          },
        })),
      deleteFunction: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            functions: (state.settings.functions || []).filter((f) => f.id !== id),
          },
        })),
      resetFunctions: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            functions: defaultFunctions,
          },
        })),
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({ settings: state.settings, apiKey: state.apiKey }),
      onRehydrateStorage: () => (state) => {
        if (!state?.settings.functions?.length) {
          state?.resetFunctions();
        }
      },
    }
  )
); 