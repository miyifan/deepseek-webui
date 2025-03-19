'use client';

import React from 'react';
import { useChatStore } from '@/lib/store/chat-store';
import { MessageItem } from './message-item';
import { motion, AnimatePresence } from 'framer-motion';
import styles from '@/styles/chat/chat-window.module.css';

export const ChatMessages: React.FC = () => {
  const { windows, currentWindowId, currentStreamingMessage, currentStreamingReasoningMessage } = useChatStore();
  
  const currentWindow = windows.find(w => w.id === currentWindowId);
  const messages = currentWindow?.messages || [];

  return (
    <div className={styles.messageList}>
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <motion.div
            key={message.timestamp}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            layout
          >
            <MessageItem message={message} />
          </motion.div>
        ))}
        {currentStreamingMessage && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MessageItem
              message={{
                role: 'assistant',
                content: currentStreamingMessage,
                timestamp: Date.now(),
                reasoning_content: currentStreamingReasoningMessage || '',
              }}
              isStreaming
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 