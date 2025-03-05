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
    <Layout className="h-screen">
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
          width={220}
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
      
      <Layout style={{ marginLeft: isMobile ? 0 : 220 }}>
        <Content className="h-full overflow-hidden">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
} 