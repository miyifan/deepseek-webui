'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Button, Drawer } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import styles from '@/styles/layout/main-layout.module.css';
import { NavMenu } from './nav-menu';
import { BalanceDisplay } from './balance-display';
import { CacheCleaner } from './cache-cleaner';
import { SettingsDrawer } from '../settings/settings-drawer';
import { ChatWindows } from '../chat/chat-windows';
import { usePathname } from 'next/navigation';

const { Sider, Content } = Layout;

export const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';
  
  // 检测窗口大小变化
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // 初始检查
    checkMobile();
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    // 清理监听器
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Layout className={styles.container} style={{ height: '100vh', overflow: 'hidden' }}>
      {isMobile ? (
        <>
          <div className={styles.mobileNav || ''}>
            <Button 
              type="text" 
              icon={<MenuOutlined />} 
              onClick={() => setDrawerVisible(true)}
              className={styles.menuToggle || ''}
            />
            <h1 className={styles.mobileTitle || ''}>DeepSeek</h1>
          </div>
          
          <Drawer
            title="DeepSeek"
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            width={250}
            bodyStyle={{ padding: 0, overflow: 'hidden' }}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden py-2">
                <NavMenu onItemClick={() => setDrawerVisible(false)} />
                {isChatPage && <ChatWindows />}
              </div>
              <BalanceDisplay />
              <div style={{ position: 'relative', height: '0px' }}>
                <CacheCleaner inDrawer={true} />
              </div>
            </div>
          </Drawer>
        </>
      ) : (
        <Sider 
          theme="light" 
          className={styles.desktopSider || ''}
          width={220}
          style={{ position: 'fixed', left: 0, height: '100%', zIndex: 10, overflow: 'hidden' }}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold">DeepSeek</h1>
            </div>
            <div className="flex-1 overflow-visible py-2">
              <NavMenu />
              {isChatPage && <ChatWindows />}
            </div>
            <BalanceDisplay />
            <div style={{ position: 'relative', height: '0px' }}>
              <CacheCleaner />
            </div>
          </div>
        </Sider>
      )}
      
      <Layout 
        style={{ 
          marginLeft: isMobile ? 0 : '220px', 
          padding: 0,
          width: isMobile ? '100%' : 'calc(100% - 220px)',
        }} 
        className={styles.contentLayout || ''}
      >
        <Content className={styles.content || ''}>
          {children}
        </Content>
      </Layout>
      <SettingsDrawer />
    </Layout>
  );
}; 