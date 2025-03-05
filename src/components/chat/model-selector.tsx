'use client';

import { Select, Tooltip } from 'antd';
import { useSettingsStore } from '@/lib/store/settings-store';
import { API_CONFIG } from '@/lib/api/config';
import { useState } from 'react';
import styles from '@/styles/chat/model-selector.module.css';

export const ModelSelector = () => {
  const { settings, updateSettings } = useSettingsStore();
  const [isChanging, setIsChanging] = useState(false);

  const handleModelChange = (value: string) => {
    setIsChanging(true);
    updateSettings({ model: value as 'reasoner' | 'chat' | 'coder' });
    setIsChanging(false);
  };

  // 获取当前模型的简称
  const getModelShortName = (model: string) => {
    switch(model) {
      case 'reasoner': return 'Reasoner';
      case 'chat': return 'Chat';
      case 'coder': return 'Coder';
      default: return model;
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

  return (
    <div className={styles.container}>
      <Tooltip title="切换AI模型">
        <Select
          value={settings.model}
          onChange={handleModelChange}
          loading={isChanging}
          className={styles.selector}
          popupMatchSelectWidth={false}
          dropdownStyle={{ minWidth: '220px' }}
          options={modelOptions}
        />
      </Tooltip>
    </div>
  );
}; 