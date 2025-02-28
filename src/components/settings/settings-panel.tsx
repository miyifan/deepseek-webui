'use client';

import { Form, InputNumber, Select, Input, Button, message } from 'antd';
import { useSettingsStore } from '@/lib/store/settings-store';
import { API_CONFIG } from '@/lib/api/config';
import { useState } from 'react';
import { ChatSettings } from '@/types';

export function SettingsPanel() {
  const { settings, updateSettings } = useSettingsStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: ChatSettings) => {
    try {
      setLoading(true);
      updateSettings(values);
      message.success('设置保存成功');
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
        initialValues={settings}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="模型"
          name="model"
          tooltip="选择要使用的 DeepSeek 模型"
        >
          <Select>
            <Select.Option value="chat">DeepSeek Chat</Select.Option>
            <Select.Option value="coder">DeepSeek Coder</Select.Option>
            <Select.Option value="reasoner">DeepSeek Reasoner</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Temperature"
          name="temperature"
          tooltip="控制输出的随机性，值越高输出越随机"
        >
          <InputNumber min={0} max={2} step={0.1} />
        </Form.Item>

        <Form.Item
          label="Top P"
          name="topP"
          tooltip="控制输出的多样性"
        >
          <InputNumber min={0} max={1} step={0.1} />
        </Form.Item>

        <Form.Item
          label="Top K"
          name="topK"
          tooltip="控制每次选择的候选词数量"
        >
          <InputNumber min={1} max={100} />
        </Form.Item>

        <Form.Item
          label="最大长度"
          name="maxLength"
          tooltip="生成文本的最大长度"
        >
          <InputNumber min={1} max={10001} />
        </Form.Item>

        <Form.Item
          label="系统提示词"
          name="systemPrompt"
          tooltip="设置 AI 的角色和行为"
        >
          <Input.TextArea rows={4} placeholder="输入系统提示词..." />
        </Form.Item>

        <Form.Item>
          <div className="flex gap-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
            >
              保存设置
            </Button>
            <Button
              size="large"
              onClick={() => form.resetFields()}
            >
              重置
            </Button>
          </div>
        </Form.Item>
      </Form>

      <div className="mt-4 text-gray-500">
        <h3 className="font-bold mb-2">模型说明</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>DeepSeek Chat:</strong> 通用对话模型，适合日常交流和知识问答
          </li>
          <li>
            <strong>DeepSeek Coder:</strong> 代码专用模型，适合编程相关任务
          </li>
        </ul>
      </div>
    </div>
  );
} 