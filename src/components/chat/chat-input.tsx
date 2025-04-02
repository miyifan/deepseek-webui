'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, message, Tooltip, Modal, Upload } from 'antd';
import { SendOutlined, DeleteOutlined, DownloadOutlined, PaperClipOutlined, StopOutlined } from '@ant-design/icons';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { chatCompletion } from '@/lib/api/deepseek';
import { openUploadFile } from '@/lib/api/deepseekopenapi';
import { useChatShortcuts } from '@/hooks/use-chat-shortcuts';
import styles from '@/styles/chat/chat-input.module.css';
import { TemplateSelector } from './template-selector';
import { ModelSelector } from './model-selector';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { UploadFile } from 'antd/es/upload/interface';
import type { ChatSettings } from '@/types';

const { TextArea } = Input;

export const ChatInput: React.FC = () => {
  const {
    windows,
    currentWindowId,
    addMessage,
    setLoading,
    isSending,
    setIsSending,
    setCurrentStreamingMessage,
    setCurrentStreamingReasoningMessage,
    updateWindowTitle,
    updateSettings,
    clearMessages
  } = useChatStore();
  
  const { apiKey } = useSettingsStore();

  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentWindow = windows.find(w => w.id === currentWindowId);
  const messages = currentWindow?.messages || [];
  const settings = currentWindow?.settings || {} as ChatSettings;
  
  // 添加调试日志，检查当前使用的模型
  useEffect(() => {
    if (currentWindow) {
      console.log('当前聊天窗口ID:', currentWindowId);
      console.log('当前聊天窗口:', currentWindow);
      console.log('当前聊天窗口使用的模型:', currentWindow.settings.model);
      console.log('当前使用的settings对象:', settings);
    }
  }, [currentWindow, currentWindowId, settings]);

  const handleSend = async () => {
    if (!content.trim()) return;

    const trimmedContent = content.trim();
    setContent('');
    await sendMessage(trimmedContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCancelSend = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
    setLoading(false);
  };

  const sendMessage = async (content: string, reasoning_content?: string) => {
    if (!apiKey) {
      message.error('请先设置 API Key');
      return;
    }

    const displayUserMessage = {
      role: 'user' as const,
      content: content.trim(),
      timestamp: Date.now(),
      reasoning_content: reasoning_content ? reasoning_content?.trim() : '',
    };

    const apiUserMessage = {
      role: 'user' as const,
      content: content.trim(),
    };

    try {
      addMessage(displayUserMessage);
      setLoading(true);
      setIsSending(true);
      setCurrentStreamingMessage('');
      setCurrentStreamingReasoningMessage('');

      abortControllerRef.current = new AbortController();

      const messageList = settings.systemPrompt
        ? [
            { role: 'system' as const, content: settings.systemPrompt },
            ...messages.map(msg => ({ role: msg.role as any, content: msg.content })),
            apiUserMessage,
          ]
        : [...messages.map(msg => ({ role: msg.role as any, content: msg.content })), apiUserMessage];

      // 添加调试日志，查看当前使用的模型设置
      console.log('发送消息时使用的模型:', settings.model);
      console.log('当前设置:', JSON.stringify(settings, null, 2));

      let streamContent = '';
      let reasoningContent = '';
      const response = await chatCompletion(
        messageList as ChatCompletionMessageParam[],
        settings,
        apiKey,
        (content: string) => {
          streamContent += content;
          setCurrentStreamingMessage(streamContent);
        },
        (content: string) => {
          reasoningContent += content;
          setCurrentStreamingReasoningMessage(reasoningContent);
        },
        abortControllerRef.current
      );

      addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        reasoning_content: response.reasoningContent,
      });

      // 更新窗口标题（如果还没有设置过）
      if (currentWindow && currentWindow.title === '新对话') {
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (firstUserMessage) {
          updateWindowTitle(currentWindow.id, firstUserMessage.content.slice(0, 30) + '...');
        }
      }

      setFileList([]);
      setUploadedFileIds([]);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求已被取消');
      } else if (error instanceof Error) {
        message.error(error.message);
        addMessage({
          role: 'assistant',
          content: '服务器响应错误，请重试',
          timestamp: Date.now(),
          reasoning_content: '',
        });
      } else {
        message.error('发送消息失败，请重试');
        addMessage({
          role: 'assistant',
          content: '服务器响应错误，请重试',
          timestamp: Date.now(),
          reasoning_content: '',
        });
      }
      console.error(error);
    } finally {
      setIsSending(false);
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = async (file: File) => {
    // if (!apiKey) {
    //   message.error('请先设置 API Key');
    //   return Upload.LIST_IGNORE;
    // }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件必须小于10MB！');
      return Upload.LIST_IGNORE;
    }

    try {
      const result = await openUploadFile(file, apiKey);
      if (result.code === 0) {
        setUploadedFileIds(prev => [...prev, result.data.biz_data.id]);
        message.success(`文件 "${file.name}" 上传成功`);
        return true;
      } else {
        message.error(result.msg || '文件上传失败');
        return Upload.LIST_IGNORE;
      }
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('文件上传失败');
      }
      return Upload.LIST_IGNORE;
    }
  };

  const handleFileRemove = (file: UploadFile) => {
    setFileList(prev => prev.filter(f => f.uid !== file.uid));
    // 这里可以添加从服务器删除文件的逻辑，如果需要的话
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

  const handleClear = () => {
    if (messages.length > 0) {
      Modal.confirm({
        title: '确认清空',
        content: '确定要清空所有对话记录吗？此操作不可恢复。',
        onOk: () => {
          clearMessages();
        },
      });
    }
  };

  const handleTemplateSelect = async (prompt: string) => {
    if (isSending) return;
    updateSettings({ systemPrompt: prompt });
    setIsSending(true);
    setLoading(true);
    setCurrentStreamingMessage('');
    setCurrentStreamingReasoningMessage('');
    await sendMessage(prompt);
  };

  useChatShortcuts({
    onSend: handleSend,
    onClear: handleClear,
  });

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <TemplateSelector 
            onSelect={handleTemplateSelect}
            disabled={isSending} 
          />
          <ModelSelector />
        </div>
        <div className={styles.toolbarActions}>
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
      </div>
      
      <div className={styles.inputWrapper}>
        <Upload
          fileList={fileList}
          onChange={({ fileList }) => setFileList(fileList)}
          beforeUpload={handleFileUpload}
        >
          <Button icon={<PaperClipOutlined />} />
        </Upload>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息，按 Enter 发送，Shift + Enter 换行"
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.textarea}
          disabled={isSending}
        />
        {isSending ? (
          <Tooltip title="取消发送">
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleCancelSend}
              className={styles.sendButton}
            >
              取消
            </Button>
          </Tooltip>
        ) : (
          <Tooltip title="发送">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isSending}
              className={styles.sendButton}
              disabled={isSending}
            >
              发送
            </Button>
          </Tooltip>
        )}
      </div>
      
      {fileList.length > 0 && (
        <div className={styles.fileList}>
          {fileList.map(file => (
            <div key={file.uid} className={styles.fileItem}>
              <PaperClipOutlined /> {file.name}
              <Button
                type="text"
                size="small"
                danger
                onClick={() => handleFileRemove(file)}
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 