'use client';

import React from 'react';
import { Message } from '@/types';
import { Card, Avatar } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import { MessageContent } from './message-content';
import { MessageContentR1 } from './message-content-r1';
import { formatDate } from '@/lib/utils';
import styles from '@/styles/chat/chat-window.module.css';

interface MessageItemProps {
  message: Message;
  isLast?: boolean;
  isStreaming?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, isLast, isStreaming }) => {
  return (
    <div className={`${styles.messageWrapper} ${
      message.role === 'assistant' ? styles.messageWrapperAssistant : styles.messageWrapperUser
    }`}>
      <Card
        size="small"
        className={`${styles.messageCard} ${
          message.role === 'assistant' ? styles.messageCardAssistant : styles.messageCardUser
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
    </div>
  );
}; 