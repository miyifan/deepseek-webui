import React from 'react';
import { Button, List, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, CheckOutlined } from '@ant-design/icons';
import { useChatStore } from '@/lib/store/chat-store';
import { Input } from 'antd';
import styles from '@/styles/chat/chat-windows.module.css';

const { TextArea } = Input;

// 格式化对话窗口标题，添加日期和序号
const formatWindowTitle = () => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const dateStr = `${month}.${day}`;
  
  // 获取所有对话窗口
  const allWindows = useChatStore.getState().windows;
  
  // 匹配标题中的序号，支持两种格式：
  // 1. 新对话M.D(N)
  // 2. 新对话(N)
  const maxNumber = allWindows
    .map(w => {
      // 匹配任意日期格式的序号
      const dateFormatMatch = w.title.match(/新对话[\d\.]+\((\d+)\)/);
      if (dateFormatMatch) {
        return parseInt(dateFormatMatch[1], 10);
      }
      
      // 匹配简单序号格式
      const simpleFormatMatch = w.title.match(/新对话\((\d+)\)/);
      if (simpleFormatMatch) {
        return parseInt(simpleFormatMatch[1], 10);
      }
      
      return 0;
    })
    .reduce((max, num) => Math.max(max, num), 0);
  
  // 序号等于最大值+1，确保持续递增
  const nextNumber = maxNumber + 1;
  
  return `新对话${dateStr}(${nextNumber})`;
};

export const ChatWindows: React.FC = () => {
  const { windows, currentWindowId, addWindow, deleteWindow, setCurrentWindow, updateWindowTitle, moveWindowToTop } = useChatStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingTitle, setEditingTitle] = React.useState('');

  const handleAddWindow = () => {
    // 创建新窗口时使用带有日期和序号的标题
    addWindow(formatWindowTitle());
  };

  const handleDeleteWindow = (id: string) => {
    // 允许删除所有对话窗口，移除数量限制
    deleteWindow(id);
  };

  const handleEditTitle = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = (id: string) => {
    if (editingTitle.trim()) {
      updateWindowTitle(id, editingTitle.trim());
      setEditingId(null);
    }
  };

  const handleWindowSelect = (id: string) => {
    setCurrentWindow(id);
    // 移除moveWindowToTop调用
    // 仅选择窗口，不改变排序和活跃度
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>对话列表</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddWindow}
          className={styles.addButton}
        >
          新建对话
        </Button>
      </div>
      <List
        className={`${styles.list} scrollable-container`}
        dataSource={windows}
        renderItem={(window) => (
          <List.Item
            className={`${styles.item} ${
              currentWindowId === window.id ? styles.activeItem : ''
            }`}
            onClick={() => handleWindowSelect(window.id)}
          >
            {editingId === window.id ? (
              <div className={styles.editWrapper}>
                <Input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleSaveTitle(window.id)}
                  onPressEnter={() => handleSaveTitle(window.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  className={styles.editInput}
                  maxLength={30}
                  suffix={
                    <CheckOutlined 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTitle(window.id);
                      }}
                      className={styles.saveIcon}
                    />
                  }
                />
              </div>
            ) : (
              <>
                <div className={styles.itemTitle} title={window.title}>{window.title}</div>
                <div className={styles.itemActions}>
                  <EditOutlined
                    key="edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditTitle(window.id, window.title);
                    }}
                    className={styles.actionIcon}
                  />
                  <DeleteOutlined 
                    key="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWindow(window.id);
                    }}
                    className={styles.actionIcon}
                  />
                </div>
              </>
            )}
          </List.Item>
        )}
      />
    </div>
  );
}; 