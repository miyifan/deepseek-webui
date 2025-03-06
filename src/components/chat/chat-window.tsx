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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 用户是否手动滚动的状态
  const [userScrolled, setUserScrolled] = useState(false);
  // 跟踪上一次消息数量，用于检测新消息
  const [lastMessageCount, setLastMessageCount] = useState(0);
  // 是否在底部的阈值（像素）
  const SCROLL_THRESHOLD = 10;
  
  // 滚动到底部的函数
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 检查是否在底部
  const isNearBottom = () => {
    if (!containerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  };
  
  // 处理滚动事件
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    // 当用户手动滚动时，记录用户滚动状态
    // 如果滚动到接近底部，重置为非用户滚动状态
    const nearBottom = isNearBottom();
    setUserScrolled(!nearBottom);
  };
  
  // 初始加载和新消息时处理滚动
  useEffect(() => {
    // 检测是否有新消息
    const hasNewMessages = messages.length > lastMessageCount;
    setLastMessageCount(messages.length);
    
    // 在初始加载或有新消息且用户在底部时滚动到底部
    if (messages.length > 0 && (!userScrolled || (hasNewMessages && isNearBottom()))) {
      scrollToBottom();
    }
  }, [messages.length, userScrolled]);
  
  // 处理流式响应的滚动
  useEffect(() => {
    if ((currentStreamingMessage || currentStreamingReasoningMessage) && !userScrolled) {
      scrollToBottom();
    }
  }, [currentStreamingMessage, currentStreamingReasoningMessage, userScrolled]);
  
  // 添加滚动事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // 窗口大小变化时的处理
  useEffect(() => {
    const handleResize = () => {
      // 只有当用户未手动滚动或在底部附近时才滚动到底部
      if (!userScrolled || isNearBottom()) {
        scrollToBottom();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [userScrolled]);
  
  return (
    <div 
      className={styles.container} 
      style={{ 
        width: '100%', 
        height: '100%',
        padding: 0, 
        margin: 0,
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div 
        className={styles.messageList} 
        ref={containerRef} 
        onScroll={handleScroll} 
        style={{ 
          width: '100%', 
          height: '100%',
          boxSizing: 'border-box',
          padding: '0 1.5rem'
        }}
      >
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