'use client';

import React from 'react';
import { Drawer, Form, Input, InputNumber, Switch, Button, message } from 'antd';
import { useSettingsStore } from '@/lib/store/settings-store';

export const SettingsDrawer: React.FC = () => {
  const { settings, updateSettings, apiKey, setApiKey } = useSettingsStore();
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      updateSettings(values);
      message.success('设置已保存');
    } catch (error) {
      message.error('保存设置失败');
    }
  };

  return (
    <Drawer
      title="设置"
      placement="right"
      width={400}
      open={false}
      onClose={() => form.resetFields()}
      extra={
        <Button type="primary" onClick={handleSave}>
          保存
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
      >
        <Form.Item
          label="API Key"
          name="apiKey"
          rules={[{ required: true, message: '请输入 API Key' }]}
        >
          <Input.Password
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Form.Item>
        <Form.Item
          label="温度"
          name="temperature"
          rules={[{ required: true, message: '请输入温度值' }]}
        >
          <InputNumber
            min={0}
            max={2}
            step={0.1}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          label="最大长度"
          name="maxLength"
          rules={[{ required: true, message: '请输入最大长度' }]}
        >
          <InputNumber
            min={1}
            max={4000}
            step={100}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item
          label="系统提示词"
          name="systemPrompt"
        >
          <Input.TextArea rows={4} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}; 