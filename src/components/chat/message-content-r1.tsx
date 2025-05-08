'use client';

import React, { Suspense, useState, memo, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button, message, Spin } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from '@/styles/chat/table.module.css';

// 处理原始GPU规格文本
const GpuSpecContent = memo(({ content }: { content: string }) => {
  // 按行拆分内容，保留所有文本
  const lines = content.split('\n').map(line => line.trim());
  
  // 提取主标题和基本描述
  const titleLines: string[] = [];
  let contentStartIndex = 0;
  
  // 识别主要标题和描述（通常是前几行没有表格格式的文本）
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (!lines[i].includes('|') && !lines[i].startsWith('---')) {
      titleLines.push(lines[i]);
      contentStartIndex = i + 1;
    } else {
      break;
    }
  }
  
  // 查找表格的结束位置
  let tableEndIndex = lines.length - 1;
  for (let i = contentStartIndex + 3; i < lines.length; i++) {
    // 表格通常在几行没有|字符且包含###或数字编号后结束
    if (!lines[i].includes('|') && !lines[i].startsWith('---') && 
        (lines[i].startsWith('#') || lines[i].match(/^\d+\.\s/) || 
         (lines[i].trim() === '' && i < lines.length - 1 && !lines[i+1].includes('|')))) {
      tableEndIndex = i - 1;
      break;
    }
  }
  
  // 分离表格内容和表格后的文本内容
  const tableContent = lines.slice(contentStartIndex, tableEndIndex + 1).filter(Boolean);
  const afterTableContent = lines.slice(tableEndIndex + 1).filter(Boolean);
  
  // 将表格内容转换为HTML表格
  const getTableHtml = (tableLines: string[]) => {
    const tableRows: JSX.Element[] = [];
    let currentCategory = '';
    
    tableLines.forEach((line, index) => {
      if (line.startsWith('---') || line.startsWith('===') || line.trim() === '') {
        return; // 跳过分隔线和空行
      }
      
      // 检测类别标题（通常使用**标记的行）
      if ((line.includes('**') && !line.includes('|')) || 
          (!line.includes('|') && line.length > 0 && 
           !line.startsWith('-') && !line.startsWith('='))) {
        currentCategory = line.replace(/\*\*/g, '').trim();
        tableRows.push(
          <tr key={`category-${index}`} className="gpu-spec-category-row">
            <td colSpan={3} className="gpu-spec-category-cell">{currentCategory}</td>
          </tr>
        );
        return;
      }
      
      // 提取表格行数据
      if (line.includes('|')) {
        const cells = line.split('|').map(cell => cell.trim()).filter(Boolean);
        if (cells.length >= 1) {
          // 如果是表头行（带有双星号**的行）
          if (line.includes('**')) {
            tableRows.push(
              <tr key={`header-${index}`} className="gpu-spec-header-row">
                {cells.map((cell, cellIndex) => (
                  <th key={`header-cell-${cellIndex}`} className="gpu-spec-header-cell">
                    {cell.replace(/\*\*/g, '')}
                  </th>
                ))}
              </tr>
            );
          } else {
            // 普通数据行
            tableRows.push(
              <tr key={`row-${index}`} className="gpu-spec-row">
                {cells.map((cell, cellIndex) => (
                  <td key={`cell-${cellIndex}`} className="gpu-spec-cell">{cell}</td>
                ))}
              </tr>
            );
          }
        }
      } else if (line.trim() && !line.startsWith('-') && !line.startsWith('=')) {
        // 非表格行，显示为普通文本
        tableRows.push(
          <tr key={`text-${index}`} className="gpu-spec-text-row">
            <td colSpan={3} className="gpu-spec-text-cell">{line}</td>
          </tr>
        );
      }
    });
    
    if (tableRows.length === 0) return null;
    
    return (
      <div className="gpu-spec-container">
        <table className="gpu-spec-table">
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    );
  };
  
  // 处理表格后的正文内容
  const getAfterTableContent = (contentLines: string[]) => {
    if (contentLines.length === 0) return null;
    
    // 合并连续的文本行，并保留特殊标记如###
    return (
      <div className="after-table-content">
        <ReactMarkdown className="markdown-content">
          {contentLines.join('\n')}
        </ReactMarkdown>
      </div>
    );
  };
  
  return (
    <div className="gpu-spec-full-content">
      {/* 显示标题和描述 */}
      {titleLines.map((line, index) => (
        <div key={`title-${index}`} className="gpu-spec-title">
          {line}
        </div>
      ))}
      
      {/* 显示表格内容 */}
      {getTableHtml(tableContent)}
      
      {/* 显示表格后的正文内容 */}
      {getAfterTableContent(afterTableContent)}
    </div>
  );
});

// 普通表格渲染组件
const StandardTable = memo(({ content }: { content: string }) => {
  // 按行拆分内容
  const lines = content.split('\n');
  
  // 查找表格的结束位置
  let tableEndIndex = lines.length - 1;
  for (let i = 3; i < lines.length; i++) {
    // 检测可能的表格结束标志
    if (!lines[i].includes('|') && lines[i].trim() !== '' && 
        (lines[i].startsWith('#') || lines[i].match(/^\d+\.\s/) || 
         (lines[i].trim() === '' && i < lines.length - 1 && !lines[i+1].includes('|')))) {
      tableEndIndex = i - 1;
      break;
    }
  }
  
  // 分离表格内容和表格后的文本
  const tableLines = lines.slice(0, tableEndIndex + 1)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const afterTableLines = lines.slice(tableEndIndex + 1)
    .filter(line => line.trim().length > 0);
  
  // 解析表格结构
  const rows: JSX.Element[] = [];
  
  // 记录是否找到了表头分隔符行
  let foundHeaderSeparator = false;
  let headerIndex = -1;
  
  // 在分隔符行之前的第一行通常是表头
  tableLines.forEach((line, index) => {
    if (!foundHeaderSeparator && line.match(/^\|[\s\-:]+\|[\s\-:]+/)) {
      foundHeaderSeparator = true;
      headerIndex = index - 1;
      return; // 跳过分隔符行
    }
    
    if (line.includes('|')) {
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter((cell, idx, arr) => idx > 0 && idx < arr.length - 1 || (idx === 0 && cell.length > 0) || (idx === arr.length - 1 && cell.length > 0));
      
      if (cells.length > 0) {
        if (index === headerIndex) {
          // 表头行
          rows.push(
            <tr key={`header-${index}`} className="standard-table-header">
              {cells.map((cell, cellIndex) => (
                <th key={`header-${cellIndex}`} dangerouslySetInnerHTML={{__html: cell.replace(/✅/g, '<span class="green-check">✅</span>')}} />
              ))}
            </tr>
          );
        } else if (!line.match(/^\|[\s\-:]+\|[\s\-:]+/)) {
          // 数据行，排除分隔符行
          rows.push(
            <tr key={`row-${index}`}>
              {cells.map((cell, cellIndex) => (
                <td key={`cell-${cellIndex}`} dangerouslySetInnerHTML={{__html: cell.replace(/✅/g, '<span class="green-check">✅</span>')}} />
              ))}
            </tr>
          );
        }
      }
    }
  });
  
  // 若未找到表头分隔符，则假定第一行为表头
  if (!foundHeaderSeparator && rows.length > 0) {
    const firstRow = rows.shift();
    if (firstRow) {
      const headerRow = React.cloneElement(firstRow, {
        className: "standard-table-header",
        key: "header-auto"
      });
      rows.unshift(headerRow);
    }
  }
  
  // 处理表格后的正文内容
  const getAfterTableContent = (contentLines: string[]) => {
    if (contentLines.length === 0) return null;
    
    // 使用ReactMarkdown渲染表格后的内容
    return (
      <div className="after-table-content">
        <ReactMarkdown className="markdown-content">
          {contentLines.join('\n')}
        </ReactMarkdown>
      </div>
    );
  };
  
  return (
    <div className="table-content-wrapper">
      {/* 表格部分 */}
      <div className="standard-table-container">
        <table className="standard-table">
          <tbody>{rows}</tbody>
        </table>
      </div>
      
      {/* 表格后的文本部分 */}
      {afterTableLines.length > 0 && getAfterTableContent(afterTableLines)}
    </div>
  );
});

// 处理特殊格式的函数 - 更加严格的条件以避免误识别
const processContent = (content: string): string => {
  // 检查是否为带有明确标记的GPU规格表（必须同时满足多个条件）
  // 1. 包含GPU型号关键词
  // 2. 包含表格结构
  // 3. 包含足够的结构标识符，如表头分隔符或多行表格
  const hasGpuKeywords = content.includes('RTX') && content.includes('RX') && 
                      (content.includes('NVIDIA') || content.includes('AMD'));
  
  const lines = content.split('\n');
  const tableLineCount = lines.filter(line => line.includes('|')).length;
  const hasTableStructure = tableLineCount >= 3 && 
                          (content.includes('|---') || 
                           content.includes('---|') || 
                           lines.some(line => (line.match(/\|/g) || []).length >= 3));
  
  // 确保是真正的GPU表格，不是普通对话
  const isGpuSpecTable = hasGpuKeywords && hasTableStructure && 
                        // 额外检查：表格内容应该占据内容的主要部分
                        (tableLineCount / lines.length > 0.4);
  
  if (isGpuSpecTable) {
    return `<gpu-spec>${content}</gpu-spec>`;
  }
  
  // 检查是否为普通表格，使用更严格的条件避免误识别
  const isStandardTable = hasTableStructure && 
                         // 确保表格占据一定比例，并且有表头分隔符
                         (tableLineCount / lines.length > 0.3) && 
                         (content.includes('|---') || content.includes('---|'));
  
  if (isStandardTable) {
    return `<standard-table>${content}</standard-table>`;
  }
  
  // 对于所有其他内容，返回原始内容，由ReactMarkdown正常处理
  return content;
};

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
  onClick?: (e: React.MouseEvent) => void;
}

export const MessageContentR1 = memo(({ content, onClick }: MessageContentProps) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [processedContent, setProcessedContent] = useState(content);
  const [gpuSpecContent, setGpuSpecContent] = useState<string | null>(null);
  const [standardTableContent, setStandardTableContent] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 重置表格内容状态
    setGpuSpecContent(null);
    setStandardTableContent(null);
    
    // 处理不同类型的内容部分
    // 注意：我们不应该修改原始内容，而是检测到表格时单独处理
    const isGpuSpec = () => {
      const hasGpuKeywords = content.includes('RTX') && content.includes('RX') && 
                         (content.includes('NVIDIA') || content.includes('AMD'));
    
      const lines = content.split('\n');
      const tableLineCount = lines.filter(line => line.includes('|')).length;
      const hasTableStructure = tableLineCount >= 3 && 
                            (content.includes('|---') || 
                             content.includes('---|') || 
                             lines.some(line => (line.match(/\|/g) || []).length >= 3));
    
      return hasGpuKeywords && hasTableStructure && 
             (tableLineCount / lines.length > 0.4);
    };
    
    const isStandardTable = () => {
      const lines = content.split('\n');
      const tableLineCount = lines.filter(line => line.includes('|')).length;
      const hasTableStructure = tableLineCount >= 3 && 
                            (content.includes('|---') || 
                             content.includes('---|') || 
                             lines.some(line => (line.match(/\|/g) || []).length >= 3));
      
      return hasTableStructure && 
             (tableLineCount / lines.length > 0.3) && 
             (content.includes('|---') || content.includes('---|'));
    };
    
    // 如果是GPU规格表，直接设置GPU规格内容
    if (isGpuSpec()) {
      setGpuSpecContent(content);
      // 普通内容设置为空，因为直接使用GPU规格组件渲染
      setProcessedContent('');
    } 
    // 如果是标准表格，直接设置标准表格内容
    else if (isStandardTable()) {
      setStandardTableContent(content);
      // 普通内容设置为空，因为直接使用表格组件渲染
      setProcessedContent('');
    } 
    // 否则保持原始内容不变
    else {
      setProcessedContent(content);
    }
  }, [content]);

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

  // 如果是GPU规格内容，使用专用组件渲染
  if (gpuSpecContent) {
    return <GpuSpecContent content={gpuSpecContent} />;
  }
  
  // 如果是标准表格内容，使用表格组件渲染
  if (standardTableContent) {
    return <StandardTable content={standardTableContent} />;
  }
  
  // 如果没有特殊内容，且处理后的内容为空，则不渲染任何内容
  if (!processedContent.trim()) {
    return null;
  }

  // 否则使用标准Markdown渲染
  return (
    <div ref={contentRef} onClick={onClick}>
      <Suspense fallback={<Spin />}>
        <ReactMarkdown
          className="markdown-content"
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
            table: ({ node, ...props }) => (
              <div className={styles.tableContainer}>
                <table className={styles.markdownTable} {...props} />
              </div>
            ),
            th: ({ node, ...props }) => (
              <th className={styles.tableHeader} {...props} />
            ),
            td: ({ node, ...props }) => (
              <td className={styles.tableCell} {...props} />
            ),
            p: ({ node, ...props }) => {
              // 检查段落中是否包含HTML
              if (typeof props.children === 'string' && 
                  (props.children.includes('<div') || 
                   props.children.includes('<span') || 
                   props.children.includes('<br>'))
                 ) {
                return <div className="html-content" dangerouslySetInnerHTML={{ __html: props.children }} />;
              }
              return <p {...props} />;
            }
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </Suspense>
    </div>
  );
}); 