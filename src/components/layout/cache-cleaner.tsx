'use client';

import { Button, Tooltip, message } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import styles from '@/styles/layout/cache-cleaner.module.css';
import { useState, useEffect } from 'react';

export const CacheCleaner = ({ inDrawer = false }) => {
  const [loading, setLoading] = useState(false);
  
  const clearCache = () => {
    try {
      setLoading(true);
      
      // 添加一些关键存储的Key列表，确保它们被清理
      const keysToForceClean = [
        'zustand-store',
        'settings-store',
        'chat-store',
        'user-settings',
        'api-key',
        'apiKey',
        'chat-history',
        'functions',
        'custom-functions',
        'templates',
        'theme',
        'language'
      ];
      
      // 强制清理这些key
      keysToForceClean.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          // 忽略错误
        }
      });
      
      // 完全清除localStorage，不保留任何状态
      localStorage.clear();
      
      // 清除cookies (简单方式)
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      
      // 如果有使用Service Worker，可以考虑清除缓存
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
      
      message.success('缓存已清除，页面将在3秒后刷新');
      
      // 延迟刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      console.error('清除缓存失败:', error);
      message.error('清除缓存失败');
      setLoading(false);
    }
  };

  const clearAll = () => {
    try {
      setLoading(true);
      
      // 定义清除IndexedDB的函数
      const clearIndexedDB = () => {
        return new Promise((resolve) => {
          // 获取所有的数据库
          const request = indexedDB.databases ? indexedDB.databases() : null;
          if (!request) {
            resolve(true);
            return;
          }
          
          request.then((dbs) => {
            dbs.forEach((db) => {
              if (db.name) {
                indexedDB.deleteDatabase(db.name);
              }
            });
            resolve(true);
          }).catch(() => {
            // 如果不支持databases()方法，我们无法获取所有数据库
            resolve(true);
          });
        });
      };
      
      // 清除Service Worker缓存
      const clearCaches = () => {
        return new Promise((resolve) => {
          if ('caches' in window) {
            caches.keys().then((names) => {
              Promise.all(names.map(name => caches.delete(name)))
                .then(() => resolve(true))
                .catch(() => resolve(true));
            }).catch(() => resolve(true));
          } else {
            resolve(true);
          }
        });
      };
      
      // 清除应用缓存
      const clearAppCache = () => {
        return new Promise((resolve) => {
          // applicationCache API已被弃用，直接返回
          resolve(true);
        });
      };
      
      // 执行所有清理操作
      Promise.all([
        clearIndexedDB(),
        clearCaches(),
        clearAppCache()
      ]).then(() => {
        message.success('所有浏览器缓存和应用数据已清理，页面将在3秒后强制重新加载');
        
        // 清除请求缓存并重载页面 (使用强制刷新方式)
        setTimeout(() => {
          try {
            // 使用不带参数的reload方法
            window.location.reload();
          } catch (e) {
            // 如果上面的方法不支持，使用添加时间戳的方式
            const timestamp = new Date().getTime();
            if (window.location.href.indexOf('?') > -1) {
              window.location.href = window.location.href + '&_=' + timestamp;
            } else {
              window.location.href = window.location.href + '?_=' + timestamp;
            }
          }
        }, 3000);
      }).catch((error) => {
        console.error('清理缓存失败:', error);
        message.error('清理缓存失败');
        setLoading(false);
      });
    } catch (error) {
      console.error('清理缓存失败:', error);
      message.error('清理缓存失败');
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} ${inDrawer ? styles.inDrawer : ''}`}>
      <Tooltip title="清除浏览器缓存并刷新页面">
        <Button 
          icon={<ClearOutlined />} 
          type="text"
          size="small" 
          onClick={clearAll}
          className={styles.button}
          loading={loading}
          disabled={loading}
        />
      </Tooltip>
    </div>
  );
}; 