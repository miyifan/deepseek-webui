'use client';

import { Button, Tooltip, Modal, message } from 'antd';
import { DeleteOutlined, DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useChatStore } from '@/lib/store/chat-store';
import { useState } from 'react';

export function ChatToolbar() {
  const { windows, currentWindowId, clearMessages } = useChatStore();
  const currentWindow = windows.find(w => w.id === currentWindowId);
  const messages = currentWindow?.messages || [];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClear = () => {
    setIsModalOpen(true);
  };

  const confirmClear = () => {
    clearMessages();
    setIsModalOpen(false);
    message.success('对话已清空');
  };

  const handleExport = () => {
    try {
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        time: new Date(msg.timestamp).toLocaleString()
      }));

      const blob = new Blob([JSON.stringify(chatHistory, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  return (
    <div className="px-4 py-2 border-b flex justify-between items-center">
      <h1 className="text-xl font-bold">对话</h1>
      <div className="space-x-2">
        <Tooltip title="导出对话">
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={messages.length === 0}
          />
        </Tooltip>
        <Tooltip title="清空对话">
          <Button
            icon={<DeleteOutlined />}
            onClick={handleClear}
            disabled={messages.length === 0}
          />
        </Tooltip>
      </div>

      <Modal
        title="确认清空"
        open={isModalOpen}
        onOk={confirmClear}
        onCancel={() => setIsModalOpen(false)}
        okText="确认"
        cancelText="取消"
      >
        <p>确定要清空所有对话记录吗？此操作不可恢复。</p>
      </Modal>
    </div>
  );
} 