'use client';

import React, { useEffect } from 'react';
import { ChatWindow } from '@/components/chat/chat-window';
import { ChatInput } from '@/components/chat/chat-input';
import { useChatStore } from '@/lib/store/chat-store';

export default function ChatPage() {
  const { 
    validateAndFixMessageSequence, 
    setCurrentStreamingMessage, 
    setCurrentStreamingReasoningMessage, 
    setLoading, 
    addWindow, 
    windows, 
    setCurrentWindow,
    currentWindowId
  } = useChatStore();

  // 页面加载时重置不稳定状态
  useEffect(() => {
    // 重置流状态和加载状态
    setCurrentStreamingMessage(null);
    setCurrentStreamingReasoningMessage(null);
    setLoading(false);
    
    // 不再自动创建窗口，而是让用户通过侧边栏创建
    if (windows.length > 0 && !currentWindowId) {
      // 设置第一个窗口为当前窗口
      setCurrentWindow(windows[0].id);
    }
    
    // 确保消息序列有效
    if (currentWindowId) {
      setTimeout(() => {
        validateAndFixMessageSequence();
      }, 100);
    }
  }, []);

  // 没有聊天窗口或未选择窗口时显示提示
  if (windows.length === 0 || !currentWindowId) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        flexDirection: 'column',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#666' }}>没有可用的对话窗口</h2>
        <p style={{ fontSize: '16px', color: '#888' }}>请点击左侧"新建对话"按钮创建一个对话窗口</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-1 min-h-0 bg-gray-50" style={{ width: '100%', height: 'calc(100% - 80px)' }}>
        <ChatWindow />
      </div>
      <div className="border-t bg-white">
        <ChatInput />
      </div>
    </div>
  );
} 