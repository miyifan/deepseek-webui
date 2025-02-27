'use client';

import { useState } from 'react';
import { Input, Button, message, Tooltip, Modal, Upload } from 'antd';
import { SendOutlined, DeleteOutlined, DownloadOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useChatStore } from '@/lib/store/chat-store';
import { useSettingsStore } from '@/lib/store/settings-store';
import { chatCompletion } from '@/lib/api/deepseek';
import { openUploadFile } from '@/lib/api/deepseekopenapi';
import { useChatShortcuts } from '@/hooks/use-chat-shortcuts';
import styles from '@/styles/chat/chat-input.module.css';
import { TemplateSelector } from './template-selector';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { UploadFile } from 'antd/es/upload/interface';

export const ChatInput = () => {
  const [input, setInput] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<string[]>([]);
  const { 
    addMessage, 
    messages, 
    isLoading, 
    setLoading, 
    clearMessages,
    setCurrentStreamingMessage,
    setCurrentStreamingReasoningMessage,
  } = useChatStore();
  const { settings, apiKey, updateSettings } = useSettingsStore();

  const handleFileUpload = async (file: File) => {
    if (!apiKey) {
      message.error('请先设置 API Key');
      return Upload.LIST_IGNORE;
    }

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

  const sendMessage = async (content: string, reasoning_content?: string) => {
    if (!apiKey) {
      message.error('请先设置 API Key');
      return;
    }

    const userMessage = {
      role: 'user' as const,
      content: content.trim(),
      timestamp: Date.now(),
      reasoning_content: reasoning_content ? reasoning_content?.trim() : '',
    };

    try {
      addMessage(userMessage);
      setLoading(true);
      setCurrentStreamingMessage('');
      setCurrentStreamingReasoningMessage('');

      const messageList = settings.systemPrompt
        ? [
            { role: 'system' as const, content: settings.systemPrompt, timestamp: 0 },
            ...messages,
            userMessage,
          ]
        : [...messages, userMessage];

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
        }
      );

      addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        reasoning_content: response.reasoningContent,
      });

      // 清空文件列表和ID
      setFileList([]);
      setUploadedFileIds([]);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      } else {
        message.error('发送消息失败，请重试');
      }
      console.error(error);
    } finally {
      setLoading(false);
      setCurrentStreamingMessage(null);
      setCurrentStreamingReasoningMessage(null);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // Ctrl + Enter 只换行，阻止发送
        e.preventDefault(); // 阻止默认行为
        e.stopPropagation(); // 阻止事件冒泡，确保不会触发表单提交
        
        const textarea = e.target as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = input.substring(0, start) + '\n' + input.substring(end);
        setInput(newValue);
        // 下一个事件循环中设置光标位置
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
        return false; // 确保不会继续处理
      } else {
        // 普通 Enter 发送消息
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        handleSubmit();
      }
    }
  };

  useChatShortcuts({
    onSend: handleSubmit,
    onClear: () => {
      if (messages.length > 0) {
        Modal.confirm({
          title: '确认清空',
          content: '确定要清空所有对话记录吗？此操作不可恢复。',
          onOk: clearMessages,
        });
      }
    },
  });

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
        onOk: clearMessages,
      });
    }
  };

  const handleTemplateSelect = async (prompt: string) => {
    if (isLoading) return;
    updateSettings({ systemPrompt: prompt });
    clearMessages();
    message.success('已应用模板，对话已重置');
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <TemplateSelector 
          onSelect={handleTemplateSelect}
          disabled={isLoading} 
        />
        <div className={styles.toolbarActions}>
          {/* <Upload
            multiple
            showUploadList={false}
            beforeUpload={handleFileUpload}
            onChange={({ fileList }) => setFileList(fileList)}
            fileList={fileList}
          >
            <Tooltip title="上传文件">
              <Button
                icon={<PaperClipOutlined />}
                disabled={isLoading}
              />
            </Tooltip>
          </Upload> */}
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
      <form onSubmit={handleSubmit}>
        <div className={styles.inputWrapper}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={fileList.length > 0 ? "请输入关于文件的问题..." : "输入消息... (Enter 发送，Ctrl + Enter 换行)"}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className={styles.textarea}
          />
          <Tooltip title="发送">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => handleSubmit()}
              loading={isLoading}
              className={styles.sendButton}
            >
              发送
            </Button>
          </Tooltip>
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
      </form>
    </div>
  );
}; 