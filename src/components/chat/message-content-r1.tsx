'use client';

import React, { Suspense, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, message, Spin } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = memo(({ language, code, onCopy, isCopied }: {
  language: string;
  code: string;
  onCopy: (code: string) => void;
  isCopied: boolean;
}) => (
  <div className="relative group">
    <Button
      type="primary"
      size="small"
      className="absolute right-2 top-2 opacity-100 z-10"
      icon={isCopied ? <CheckOutlined /> : <CopyOutlined />}
      onClick={() => onCopy(code)}
      style={{ 
        backgroundColor: isCopied ? '#52c41a' : '#1890ff',
        borderColor: isCopied ? '#52c41a' : '#1890ff',
        color: '#fff',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      PreTag="div"
    >
      {code}
    </SyntaxHighlighter>
  </div>
));

interface MessageContentProps {
  content: string;
}

export const MessageContentR1 = memo(({ content }: MessageContentProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      message.success('代码已复制');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      message.error('复制失败');
    }
  };

  return (
    <Suspense fallback={<Spin />}>
      <ReactMarkdown
        components={{
          code: ({ inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const code = String(children).replace(/\n$/, '');

            if (!inline && match) {
              return (
                <CodeBlock
                  language={match[1]}
                  code={code}
                  onCopy={handleCopyCode}
                  isCopied={copiedCode === code}
                />
              );
            }
            return <code className={className} {...props}>{children}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Suspense>
  );
}); 