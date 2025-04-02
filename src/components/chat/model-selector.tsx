'use client';

import { Select, Tooltip, Switch, message } from 'antd';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useChatStore } from '@/lib/store/chat-store';
import { API_CONFIG } from '@/lib/api/config';
import { useState, useEffect } from 'react';
import styles from '@/styles/chat/model-selector.module.css';

export const ModelSelector = () => {
  // 只使用全局设置来获取API key等信息
  const { apiKey } = useSettingsStore();
  
  // 使用聊天窗口的状态
  const { updateSettings, windows, currentWindowId } = useChatStore();
  const [isChanging, setIsChanging] = useState(false);
  
  // 获取当前聊天窗口的设置
  const currentWindow = windows.find(w => w.id === currentWindowId);
  const currentSettings = currentWindow?.settings;
  const currentModel = currentSettings?.model || 'chat';
  
  // 本地状态，用于跟踪界面上的显示
  const [localModelValue, setLocalModelValue] = useState<'reasoner' | 'chat' | 'coder'>(currentModel as 'reasoner' | 'chat' | 'coder');
  const [isReasonerMode, setIsReasonerMode] = useState(currentModel === 'reasoner');
  
  // 当当前窗口或模型变化时，更新本地状态
  useEffect(() => {
    if (currentModel) {
      setLocalModelValue(currentModel as 'reasoner' | 'chat' | 'coder');
      setIsReasonerMode(currentModel === 'reasoner');
      console.log('ModelSelector - 当前模型已更新:', currentModel, '窗口ID:', currentWindowId);
    }
  }, [currentModel, currentWindowId]);

  const handleModelChange = (value: string) => {
    if (!currentWindowId) {
      message.error('请先选择一个对话窗口');
      return;
    }
    
    setIsChanging(true);
    
    // 更新本地状态
    setLocalModelValue(value as 'reasoner' | 'chat' | 'coder');
    setIsReasonerMode(value === 'reasoner');
    
    // 更新聊天窗口设置
    updateSettings({ model: value as 'reasoner' | 'chat' | 'coder' });
    console.log('ModelSelector - 已将模型切换为:', value, '窗口ID:', currentWindowId);
    
    // 显示用户友好的提示
    switch(value) {
      case 'reasoner':
        message.success('已切换到DeepSeek Reasoner模型，将显示AI思考过程');
        break;
      case 'chat':
        message.success('已切换到DeepSeek Chat模型，适合日常对话');
        break;
      case 'coder':
        message.success('已切换到DeepSeek Coder模型，适合编程相关任务');
        break;
    }
    
    setIsChanging(false);
  };
  
  const handleThinkingChange = (checked: boolean) => {
    if (!currentWindowId) {
      message.error('请先选择一个对话窗口');
      return;
    }
    
    // 更新本地状态
    setIsReasonerMode(checked);
    
    // 切换深度思考模式：选中时使用reasoner，未选中时使用chat
    const newModel = checked ? 'reasoner' : 'chat';
    setLocalModelValue(newModel as 'reasoner' | 'chat' | 'coder');
    
    // 更新聊天窗口设置
    updateSettings({ model: newModel });
    console.log('ModelSelector - 已将深度思考模式切换为:', checked, '新模型:', newModel, '窗口ID:', currentWindowId);
    
    // 显示切换状态反馈
    if (checked) {
      message.success('已开启深度思考模式，AI将展示思考过程');
    } else {
      message.info('已关闭深度思考模式');
    }
  };

  const modelOptions = [
    { 
      value: 'reasoner', 
      label: (
        <div className={styles.optionItem}>
          <span className={styles.optionLabel}>DeepSeek Reasoner</span>
          <span className={styles.optionDescription}>支持思考过程的推理模型</span>
        </div>
      )
    },
    { 
      value: 'chat', 
      label: (
        <div className={styles.optionItem}>
          <span className={styles.optionLabel}>DeepSeek Chat</span>
          <span className={styles.optionDescription}>通用对话模型</span>
        </div>
      )
    },
    { 
      value: 'coder', 
      label: (
        <div className={styles.optionItem}>
          <span className={styles.optionLabel}>DeepSeek Coder</span>
          <span className={styles.optionDescription}>代码编程模型</span>
        </div>
      )
    },
  ];

  // 如果没有选择聊天窗口，禁用控件
  const isDisabled = !currentWindowId;

  return (
    <div className={styles.container}>
      <div className={styles.controlGroup}>
        <Tooltip title={isDisabled ? "请先选择一个对话窗口" : "切换AI模型"}>
          <Select
            value={localModelValue}
            onChange={handleModelChange}
            loading={isChanging}
            disabled={isDisabled}
            className={styles.selector}
            popupMatchSelectWidth={false}
            dropdownStyle={{ minWidth: '220px' }}
            options={modelOptions}
          />
        </Tooltip>
        <Tooltip title={isDisabled ? "请先选择一个对话窗口" : "启用深度思考模式"}>
          <div className={styles.switchWrapper}>
            <Switch 
              checked={isReasonerMode}
              onChange={handleThinkingChange}
              size="small"
              disabled={isDisabled}
              className={styles.thinkingSwitch}
            />
            <span className={styles.switchLabel}>深度思考</span>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}; 