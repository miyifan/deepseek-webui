'use client';

import { Form, Input, Button, message } from 'antd';
import { useSettingsStore } from '@/lib/store/settings-store';
import { useState } from 'react';
export function ApiSettings() {
  const { apiKey, setApiKey } = useSettingsStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: { apiKey: string }) => {
    try {
      setLoading(true);
      // 这里可以添加 API Key 验证逻辑
      setApiKey(values.apiKey);
      message.success('API Key 保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <Form
        form={form}
        layout="vertical"
        initialValues={{ apiKey: "sk-8d6ae9e94d2e4870abf891bca5801313" }}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: '请输入 API Key' }]}
          extra="在此输入您的 DeepSeek API Key，它将被安全地存储在本地"
        >
          <Input.Password 
            placeholder="请输入 DeepSeek API Key" 
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            size="large"
          >
            保存
          </Button>
        </Form.Item>
      </Form>

      <div className="mt-4 text-gray-500">
        <h3 className="font-bold mb-2">如何获取 API Key？</h3>
        <ol className="list-decimal list-inside space-y-2">
          <li>访问 DeepSeek 开发者平台</li>
          <li>注册或登录您的账号</li>
          <li>在控制台中创建新的 API Key</li>
          <li>复制并粘贴到上方输入框</li>
        </ol>
      </div>
    </div>
  );
} 