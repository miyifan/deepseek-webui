'use client';

import { useEffect, useState } from 'react';
import { Card, Statistic, Tooltip } from 'antd';
import { WalletOutlined } from '@ant-design/icons';
import { useSettingsStore } from '@/lib/store/settings-store';
import { getBalance, BalanceResponse } from '@/lib/api/deepseek';
import styles from '@/styles/layout/balance-display.module.css';

// 添加全局缓存
let balanceCache: BalanceResponse | null = null;
let lastFetchTime = 0;
let isFetching = false;

export const BalanceDisplay = () => {
  const { apiKey } = useSettingsStore();
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = async () => {
    if (!apiKey) {
      setBalance(null);
      return;
    }
    
    // 如果已经有缓存且距离上次获取时间不超过5分钟，直接使用缓存
    const now = Date.now();
    if (balanceCache && now - lastFetchTime < 5 * 60 * 1000) {
      setBalance(balanceCache);
      return;
    }
    
    // 如果已经在获取中，跳过
    if (isFetching) return;
    
    try {
      setLoading(true);
      isFetching = true;
      const data = await getBalance(apiKey);
      balanceCache = data;
      lastFetchTime = now;
      setBalance(data);
    } catch (error) {
      console.error('获取余额失败:', error);
      setBalance(null);
    } finally {
      setLoading(false);
      isFetching = false;
    }
  };

  // 监听 apiKey 变化
  useEffect(() => {
    fetchBalance();
  }, [apiKey]);

  // 定时刷新
  useEffect(() => {
    if (!apiKey) return;
    
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey]);

  if (!balance || !balance.is_available) return null;

  const cnyBalance = balance.balance_infos.find(info => info.currency === 'CNY');
  if (!cnyBalance) return null;

  return (
    <div className={styles.container}>
      <Card loading={loading} bordered={false} size="small" className={styles.card}>
        <Tooltip
          title={
            <>
              <div>赠金余额: ¥{cnyBalance.granted_balance}</div>
              <div>充值余额: ¥{cnyBalance.topped_up_balance}</div>
            </>
          }
        >
          <Statistic
            title="账户余额"
            value={cnyBalance.total_balance}
            prefix={<WalletOutlined />}
            suffix="¥"
            precision={2}
          />
        </Tooltip>
      </Card>
    </div>
  );
}; 