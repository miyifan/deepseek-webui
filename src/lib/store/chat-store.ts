import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, ChatSettings } from '@/types';

interface ChatWindow {
  id: string;
  title: string;
  messages: Message[];
  settings: ChatSettings;
  createdAt: number;
  updatedAt: number;
  lastActiveAt: number;
}

interface ChatState {
  windows: ChatWindow[];
  currentWindowId: string | null;
  isLoading: boolean;
  isSending: boolean;
  currentStreamingMessage: string | null;
  currentStreamingReasoningMessage: string | null;
  
  // 窗口管理
  addWindow: (title?: string) => void;
  deleteWindow: (id: string) => void;
  setCurrentWindow: (id: string) => void;
  updateWindowTitle: (id: string, title: string) => void;
  moveWindowToTop: (id: string) => void;
  
  // 消息管理
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  setLoading: (loading: boolean) => void;
  setIsSending: (sending: boolean) => void;
  appendToLastMessage: (content: string) => void;
  setCurrentStreamingMessage: (content: string | null) => void;
  setCurrentStreamingReasoningMessage: (content: string | null) => void;
  deleteLastMessage: () => void;
  validateAndFixMessageSequence: () => void;
}

const MAX_WINDOWS = 20;

const defaultSettings: ChatSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 50,
  maxLength: 2000,
  systemPrompt: '',
  model: 'chat',
  functions: []
};

const createNewWindow = (title?: string): ChatWindow => {
  const now = Date.now();
  return {
    id: now.toString(),
    title: title || '新对话',
    messages: [],
    settings: defaultSettings,
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now
  };
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      windows: [createNewWindow()],
      currentWindowId: null,
      isLoading: false,
      isSending: false,
      currentStreamingMessage: null,
      currentStreamingReasoningMessage: null,

      // 窗口管理
      addWindow: (title) => {
        const newWindow = createNewWindow(title);
        set((state) => {
          // 直接将新窗口放在最前面
          let newWindows = [newWindow, ...state.windows];
          
          if (newWindows.length > MAX_WINDOWS) {
            // 按照最后活跃时间排序，保留最新的MAX_WINDOWS个窗口
            newWindows = newWindows
              .sort((a, b) => b.lastActiveAt - a.lastActiveAt)
              .slice(0, MAX_WINDOWS);
          }
          
          return {
            windows: newWindows,
            currentWindowId: newWindow.id
          };
        });
      },

      deleteWindow: (id) => {
        set((state) => {
          const newWindows = state.windows.filter(w => w.id !== id);
          // 如果删除后没有窗口，则将currentWindowId设为null
          const newCurrentId = state.currentWindowId === id 
            ? (newWindows[0]?.id || null)
            : state.currentWindowId;
          return {
            windows: newWindows,
            currentWindowId: newCurrentId,
            // 重置相关状态
            currentStreamingMessage: null,
            currentStreamingReasoningMessage: null,
            isLoading: false,
            isSending: false
          };
        });
      },

      setCurrentWindow: (id) => {
        set((state) => {
          // 只切换当前窗口ID，不更新lastActiveAt
          return {
            currentWindowId: id
          };
        });
      },
      
      moveWindowToTop: (id) => {
        set((state) => {
          const windowIndex = state.windows.findIndex(w => w.id === id);
          if (windowIndex === -1) return state;
          
          const windowToMove = { 
            ...state.windows[windowIndex], 
            lastActiveAt: Date.now() 
          };
          const otherWindows = state.windows.filter(w => w.id !== id);
          
          return {
            windows: [windowToMove, ...otherWindows]
          };
        });
      },

      updateWindowTitle: (id, title) => {
        set((state) => ({
          windows: state.windows.map(w => 
            w.id === id ? { ...w, title, updatedAt: Date.now() } : w
          )
        }));
      },

      // 消息管理
      addMessage: (message) => {
        set((state) => {
          const currentWindow = state.windows.find(w => w.id === state.currentWindowId);
          if (!currentWindow) return state;

          const updatedWindow = {
            ...currentWindow,
            messages: [...currentWindow.messages, message],
            updatedAt: Date.now(),
            lastActiveAt: Date.now()
          };
          
          // 根据最新消息活动时间对窗口排序
          const updatedWindows = state.windows
            .filter(w => w.id !== state.currentWindowId)
            .map(w => ({ ...w }));
            
          // 将当前窗口移到顶部
          return {
            windows: [updatedWindow, ...updatedWindows],
            currentStreamingMessage: null,
            currentStreamingReasoningMessage: null
          };
        });
      },

      clearMessages: () => {
        set((state) => {
          const currentWindow = state.windows.find(w => w.id === state.currentWindowId);
          if (!currentWindow) return state;

          const updatedWindow = {
            ...currentWindow,
            messages: [],
            updatedAt: Date.now(),
            lastActiveAt: Date.now()
          };
          
          // 根据最新操作对窗口排序（将当前窗口置顶）
          const updatedWindows = state.windows
            .filter(w => w.id !== state.currentWindowId)
            .map(w => ({ ...w }));
            
          // 将当前窗口移到顶部
          return {
            windows: [updatedWindow, ...updatedWindows],
            currentStreamingMessage: null,
            currentStreamingReasoningMessage: null
          };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => {
          const updatedWindows = state.windows.map(w => {
            if (w.id === state.currentWindowId) {
              return {
                ...w,
                settings: { ...w.settings, ...newSettings },
                updatedAt: Date.now(),
                lastActiveAt: Date.now()
              };
            }
            return w;
          });
          return { windows: updatedWindows };
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setIsSending: (sending) => set({ isSending: sending }),

      appendToLastMessage: (content) => {
        set((state) => {
          const currentWindow = state.windows.find(w => w.id === state.currentWindowId);
          if (!currentWindow) return state;

          const messages = [...currentWindow.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content += content;
          }
          
          const updatedWindow = {
            ...currentWindow,
            messages,
            updatedAt: Date.now(),
            lastActiveAt: Date.now()
          };
          
          // 根据最新消息活动时间对窗口排序
          let updatedWindows = state.windows
            .filter(w => w.id !== state.currentWindowId)
            .map(w => ({ ...w }));
            
          // 将当前窗口移到顶部
          updatedWindows = [updatedWindow, ...updatedWindows];
          
          return { windows: updatedWindows };
        });
      },

      setCurrentStreamingMessage: (content) => set({ currentStreamingMessage: content }),
      setCurrentStreamingReasoningMessage: (content) => set({ currentStreamingReasoningMessage: content }),

      deleteLastMessage: () => {
        set((state) => {
          const currentWindow = state.windows.find(w => w.id === state.currentWindowId);
          if (!currentWindow) return state;

          const messages = [...currentWindow.messages];
          messages.pop();
          
          const updatedWindow = {
            ...currentWindow,
            messages,
            updatedAt: Date.now(),
            lastActiveAt: Date.now()
          };
          
          // 根据最新消息活动时间对窗口排序
          let updatedWindows = state.windows
            .filter(w => w.id !== state.currentWindowId)
            .map(w => ({ ...w }));
            
          // 将当前窗口移到顶部
          updatedWindows = [updatedWindow, ...updatedWindows];
          
          return { windows: updatedWindows };
        });
      },

      validateAndFixMessageSequence: () => {
        set((state) => {
          const currentWindow = state.windows.find(w => w.id === state.currentWindowId);
          if (!currentWindow) return state;

          const messages = [...currentWindow.messages];
          const fixedMessages: Message[] = [];
          
          if (messages.length === 0) return state;
          
          fixedMessages.push(messages[0]);
          
          for (let i = 1; i < messages.length; i++) {
            const currentMsg = messages[i];
            const lastMsg = fixedMessages[fixedMessages.length - 1];
            
            if (currentMsg.role === lastMsg.role) {
              if (currentMsg.role === 'user') {
                fixedMessages.push({
                  role: 'assistant',
                  content: '[占位回复]',
                  timestamp: Date.now() - 1000,
                  reasoning_content: '',
                });
              } else if (currentMsg.role === 'assistant') {
                fixedMessages.push({
                  role: 'user',
                  content: '[继续]',
                  timestamp: Date.now() - 1000,
                  reasoning_content: '',
                });
              }
            }
            
            fixedMessages.push(currentMsg);
          }
          
          const updatedWindow = {
            ...currentWindow,
            messages: fixedMessages,
            updatedAt: Date.now()
            // 注意：这里不更新lastActiveAt，因为只是验证消息序列，不是真正的消息活动
          };
          
          // 不改变窗口顺序，只修复消息序列
          const updatedWindows = state.windows.map(w => 
            w.id === state.currentWindowId ? updatedWindow : w
          );
          
          return { windows: updatedWindows };
        });
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        windows: state.windows,
        currentWindowId: state.currentWindowId,
        currentStreamingMessage: null,
        currentStreamingReasoningMessage: null,
        isLoading: false,
        isSending: false
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
          state.setCurrentStreamingMessage(null);
          state.setCurrentStreamingReasoningMessage(null);
          state.validateAndFixMessageSequence();
        }
      },
    }
  )
); 