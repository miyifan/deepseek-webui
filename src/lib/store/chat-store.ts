import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, ChatSettings } from '@/types';

interface ChatState {
  messages: Message[];
  settings: ChatSettings;
  isLoading: boolean;
  currentStreamingMessage: string | null;
  currentStreamingReasoningMessage: string | null;
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  updateSettings: (settings: Partial<ChatSettings>) => void;
  setLoading: (loading: boolean) => void;
  appendToLastMessage: (content: string) => void;
  setCurrentStreamingMessage: (content: string | null) => void;
  setCurrentStreamingReasoningMessage: (content: string | null) => void;
  deleteLastMessage: () => void;
  validateAndFixMessageSequence: () => void;
}

const defaultSettings: ChatSettings = {
  temperature: 0.7,
  topP: 0.9,
  topK: 50,
  maxLength: 2000,
  systemPrompt: '',
  model: 'chat',
  functions: []
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      settings: defaultSettings,
      isLoading: false,
      currentStreamingMessage: null,
      currentStreamingReasoningMessage: null,
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message],
        currentStreamingMessage: null,
        currentStreamingReasoningMessage: null
      })),
      clearMessages: () => set({ messages: [], currentStreamingMessage: null, currentStreamingReasoningMessage: null }),
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      setLoading: (loading) => set({ isLoading: loading }),
      appendToLastMessage: (content) => set((state) => {
        const messages = [...state.messages];
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.content += content;
        }
        return { messages };
      }),
      setCurrentStreamingMessage: (content) => set({ currentStreamingMessage: content }),
      setCurrentStreamingReasoningMessage: (content) => set({ currentStreamingReasoningMessage: content }),
      deleteLastMessage: () => set((state) => {
        if (state.messages.length === 0) return state;
        const messages = [...state.messages];
        messages.pop(); // 删除最后一条消息
        return { messages };
      }),
      validateAndFixMessageSequence: () => set((state) => {
        // 检查消息序列，确保一问一答交替出现
        const messages = [...state.messages];
        const fixedMessages: Message[] = [];
        
        // 如果没有消息，无需修改
        if (messages.length === 0) return state;
        
        // 处理第一条消息
        fixedMessages.push(messages[0]);
        
        // 处理后续消息，自动插入占位消息保持序列一致
        for (let i = 1; i < messages.length; i++) {
          const currentMsg = messages[i];
          const lastMsg = fixedMessages[fixedMessages.length - 1];
          
          // 如果当前消息和上一条角色相同，插入占位消息
          if (currentMsg.role === lastMsg.role) {
            // 如果连续用户消息，插入占位助手消息
            if (currentMsg.role === 'user') {
              fixedMessages.push({
                role: 'assistant',
                content: '[占位回复]',
                timestamp: Date.now() - 1000, // 稍早于当前消息
                reasoning_content: '',
              });
            } 
            // 如果连续助手消息，插入占位用户消息
            else if (currentMsg.role === 'assistant') {
              fixedMessages.push({
                role: 'user',
                content: '[继续]',
                timestamp: Date.now() - 1000,
                reasoning_content: '',
              });
            }
          }
          
          // 添加当前消息
          fixedMessages.push(currentMsg);
        }
        
        console.log('修复后的消息序列:', fixedMessages);
        return { messages: fixedMessages };
      }),
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({ 
        messages: state.messages, 
        settings: state.settings,
        // 确保流状态也被重置
        currentStreamingMessage: null,
        currentStreamingReasoningMessage: null,
        isLoading: false
      }),
      // 添加存储恢复后的回调
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 确保在页面加载时重置流状态和加载状态
          state.setLoading(false);
          state.setCurrentStreamingMessage(null);
          state.setCurrentStreamingReasoningMessage(null);
          
          // 检查消息序列的一致性
          state.validateAndFixMessageSequence();
        }
      },
    }
  )
); 