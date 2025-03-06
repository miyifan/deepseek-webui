'use client';

import { Layout, Button, Drawer } from 'antd';
import { NavMenu } from './nav-menu';
import { PageBreadcrumb } from './breadcrumb';
import { BalanceDisplay } from './balance-display';
import { useState, useEffect } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import styles from '@/styles/layout/main-layout.module.css';

const { Sider, Content } = Layout;

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);

  // 检测窗口大小变化
  useEffect(() => {
    const checkMobile = () => {
      const newIsMobile = window.innerWidth <= 768;
      setIsMobile(newIsMobile);
      
      // 根据窗口宽度设置侧边栏宽度
      if (window.innerWidth <= 992 && window.innerWidth > 768) {
        setSidebarWidth(180);
      } else {
        setSidebarWidth(220);
      }
    };
    
    // 初始检查
    checkMobile();
    
    // 触发一次布局更新
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkMobile);
    
    // 清理监听器
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 添加布局刷新处理
  useEffect(() => {
    // 当窗口大小改变时，强制重新计算布局
    const handleResize = () => {
      // 添加一个小延迟以确保所有状态更新完成
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Layout className={`h-screen ${styles.container}`} style={{ padding: 0, margin: 0, overflow: 'hidden' }}>
      {isMobile ? (
        <>
          <div className={styles.mobileNav}>
            <Button 
              type="text" 
              icon={<MenuOutlined />} 
              onClick={() => setDrawerVisible(true)}
              className={styles.menuToggle}
            />
            <h1 className={styles.mobileTitle}>DeepSeek</h1>
          </div>
          
          <Drawer
            title="DeepSeek"
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            width={250}
            bodyStyle={{ padding: 0 }}
          >
            <div className="flex-1 overflow-y-auto">
              <NavMenu onItemClick={() => setDrawerVisible(false)} />
              <BalanceDisplay />
            </div>
          </Drawer>
        </>
      ) : (
        <Sider 
          theme="light" 
          className={styles.desktopSider}
          width={sidebarWidth}
          style={{ position: 'fixed', left: 0, height: '100%', zIndex: 10 }}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold">DeepSeek</h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavMenu />
              <BalanceDisplay />
            </div>
          </div>
        </Sider>
      )}
      
      <Layout 
        style={{ 
          marginLeft: isMobile ? 0 : `${sidebarWidth}px`, 
          padding: 0,
          width: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
          transition: 'all 0.3s ease',
        }} 
        className={styles.contentLayout}
      >
        <Content className={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
} 