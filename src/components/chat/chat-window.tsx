'use client';

import { Message } from '@/types';
import { useChatStore } from '@/lib/store/chat-store';
import { formatDate } from '@/lib/utils';
import { Card, Avatar, Spin, Image } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageContent } from './message-content';
import { MessageContentR1 } from './message-content-r1';
import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/chat/chat-window.module.css';

export const ChatWindow = () => {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const currentStreamingMessage = useChatStore((state) => state.currentStreamingMessage);
  const currentStreamingReasoningMessage = useChatStore((state) => state.currentStreamingReasoningMessage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 检测用户滚动
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (isAtBottom) {
      setUserScrolled(false);
    } else if (isLoading || currentStreamingMessage) {
      setUserScrolled(true);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage, currentStreamingReasoningMessage, userScrolled]);

  // 添加滚动事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // 当新消息添加时，如果用户没有滚动，则滚动到底部
  useEffect(() => {
    if (messages.length > 0 && !userScrolled) {
      scrollToBottom();
    }
  }, [messages.length, userScrolled]);

  return (
    <div className={styles.container}>
      <div className={styles.messageList} ref={containerRef} onScroll={handleScroll}>
        <AnimatePresence mode="popLayout">
          {messages.map((message: Message) => (
            <motion.div
              key={message.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              layout
              className={`${styles.messageWrapper} ${
                message.role === 'assistant'
                  ? styles.messageWrapperAssistant
                  : styles.messageWrapperUser
              }`}
            >
              <Card
                size="small"
                className={`${styles.messageCard} ${
                  message.role === 'assistant'
                    ? styles.messageCardAssistant
                    : styles.messageCardUser
                }`}
                bordered={false}
              >
                <div className={styles.messageContent}>
                  <Avatar
                    icon={message.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
                    className={message.role === 'assistant' ? 'bg-blue-500' : 'bg-green-500'}
                  />
                  <div className={styles.messageText}>
                    {message.reasoning_content && (
                      <div className={styles.messageReasoning}>
                        <div className={styles.messageReasoningTitle}>
                          R1思考过程:
                        </div>
                        <MessageContentR1 content={message.reasoning_content} />
                      </div>
                    )}
                    <div className={styles.messageTextContent}>
                      <MessageContent content={message.content} />
                    </div>
                    <div className={styles.messageTime}>
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {(currentStreamingMessage || currentStreamingReasoningMessage) && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.messageWrapper} ${styles.messageWrapperAssistant}`}
            >
              <Card
                size="small"
                className={`${styles.messageCard} ${styles.messageCardAssistant}`}
                bordered={false}
              >
                <div className={styles.messageContent}>
                  <Avatar
                    icon={<RobotOutlined />}
                    className="bg-blue-500"
                  />
                  <div className={styles.messageText}>
                    {
                      currentStreamingReasoningMessage && <div className={styles.messageReasoning}>
                      <div className={styles.messageReasoningTitle}>
                        R1思考中...
                      </div>
                      <MessageContentR1 content={currentStreamingReasoningMessage} />
                    </div>
                    }
                    {
                      currentStreamingMessage && <div className={styles.messageTextContent}>
                        <MessageContent content={currentStreamingMessage} />
                      </div>
                    }
                    <div className={styles.messageTime}>
                      {formatDate(Date.now())}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        {isLoading && !currentStreamingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={styles.loadingWrapper}
          >
            <Spin tip="AI思考中..." />
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}; 