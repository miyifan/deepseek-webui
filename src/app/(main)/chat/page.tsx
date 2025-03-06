'use client';

import { ChatWindow } from '@/components/chat/chat-window';
import { ChatInput } from '@/components/chat/chat-input';
import styles from '@/styles/layout/page-layout.module.css';

export default function ChatPage() {
  return (
    <div className={styles.pageContainer} style={{ width: '100%', height: '100%' }}>
      <div className={styles.pageContent} style={{ width: '100%', height: '100%' }}>
        <div className="flex-1 min-h-0 bg-gray-50" style={{ width: '100%', height: 'calc(100% - 80px)' }}>
          <ChatWindow />
        </div>
        <div className="border-t bg-white">
          <ChatInput />
        </div>
      </div>
    </div>
  );
} 