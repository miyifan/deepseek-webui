'use client';

import { MainLayout } from '@/components/layout/main-layout';
import { useState, useEffect } from 'react';
import { Spin } from 'antd';

export default function MainLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // 等待 hydration 完成后再渲染
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">
      <Spin size="large" tip="加载中..." />
    </div>;
  }

  return <MainLayout>{children}</MainLayout>;
} 