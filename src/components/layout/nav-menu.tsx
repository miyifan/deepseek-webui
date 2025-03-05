'use client';

import { Menu } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageOutlined,
  SettingOutlined,
  BookOutlined,
  FunctionOutlined,
} from '@ant-design/icons';
import styles from '@/styles/layout/nav-menu.module.css';

const menuItems = [
  {
    key: '/chat',
    icon: <MessageOutlined />,
    label: <Link href="/chat">对话</Link>,
  },
  {
    key: '/templates',
    icon: <BookOutlined />,
    label: <Link href="/templates">提示词模板</Link>,
  },
  {
    key: '/functions',
    icon: <FunctionOutlined />,
    label: <Link href="/functions">函数配置(BETA)</Link>,
  },
  {
    key: '/workflows',
    icon: <FunctionOutlined />,
    label: <Link href="/workflows ">COZE插件配置(开发中)</Link>,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: <Link href="/settings">设置</Link>,
  },
];

interface NavMenuProps {
  onItemClick?: () => void;
}

export function NavMenu({ onItemClick }: NavMenuProps = {}) {
  const pathname = usePathname();
  const selectedKey = menuItems.find(item => 
    pathname.startsWith(item.key)
  )?.key || pathname;

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      className={styles.menu}
      onClick={onItemClick ? () => onItemClick() : undefined}
    />
  );
} 