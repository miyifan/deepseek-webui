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

// 处理原始比较表格文本
const ComparisonTableContent = memo(({ content }: { content: string }) => {
  // 按行拆分内容，保留所有文本
  const lines = content.split('\n');
  
  // 查找表格区域和表格前后的文本
  const titleLines: string[] = [];
  let tableStartLineIndex = 0;
  let tableEndLineIndex = lines.length - 1;
  let inTable = false;
  
  // 查找表格开始和结束位置
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测表格开始
    if (!inTable && line.includes('|')) {
      // 开始之前的内容都是标题或描述
      titleLines.push(...lines.slice(0, i).map(l => l.trim()).filter(l => l));
      tableStartLineIndex = i;
      inTable = true;
    }
    // 检测表格结束
    else if (inTable && !line.includes('|') && line !== '') {
      tableEndLineIndex = i - 1;
      break;
    }
  }
  
  // 提取表格内容和表格后的文本
  const tableContent = lines.slice(tableStartLineIndex, tableEndLineIndex + 1)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  const afterTableContent = lines.slice(tableEndLineIndex + 1)
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  // 解析表格内容 - 直接简单地渲染原始表格结构
  const getTableHtml = (tableLines: string[]) => {
    if (tableLines.length === 0) return null;
    
    // 将表格行转换为行和单元格
    const rows = tableLines.map((line, index) => {
      // 如果行不包含表格标记，可能是分类标题
      if (!line.includes('|')) {
        // 处理分类标题行
        return (
          <tr key={`category-${index}`} className="spec-category-row">
            <td 
              colSpan={10} 
              className="spec-category-cell"
              dangerouslySetInnerHTML={{__html: line}}
            ></td>
          </tr>
        );
      }
      
      // 普通的表格行
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter((cell, i, arr) => i > 0 && i < arr.length - 1 || cell !== '');
      
      // 检查是否是标题行（通常带有**）
      const isHeader = line.includes('**');
      
      if (isHeader && !line.includes('|---')) {
        return (
          <tr key={`header-${index}`} className="spec-header-row">
            {cells.map((cell, cellIndex) => (
              <th 
                key={`header-${index}-${cellIndex}`} 
                className="spec-header-cell"
                dangerouslySetInnerHTML={{__html: cell}}
              ></th>
            ))}
          </tr>
        );
      } else if (line.includes('|---')) {
        // 跳过分隔符行
        return null;
      } else {
        return (
          <tr key={`row-${index}`} className="spec-row">
            {cells.map((cell, cellIndex) => (
              <td 
                key={`cell-${index}-${cellIndex}`} 
                className="spec-cell"
                dangerouslySetInnerHTML={{
                  __html: cell
                    .replace(/✅/g, '<span class="green-check">✅</span>')
                    .replace(/❌/g, '<span class="red-cross">❌</span>')
                }}
              ></td>
            ))}
          </tr>
        );
      }
    }).filter(Boolean); // 过滤掉null行
    
    return (
      <div className="spec-table-container">
        <table className="spec-table">
          <tbody>
            {rows}
          </tbody>
        </table>
      </div>
    );
  };
  
  // 处理表格后的正文内容
  const getAfterTableContent = (contentLines: string[]) => {
    if (contentLines.length === 0) return null;
    
    return contentLines.map((line, index) => (
      <div key={`text-${index}`} className="spec-text-row">
        <div className="spec-text-cell" dangerouslySetInnerHTML={{__html: line}}></div>
      </div>
    ));
  };
  
  return (
    <div className="spec-full-content">
      {/* 显示标题和描述 */}
      {titleLines.map((line, index) => (
        <div 
          key={`title-${index}`} 
          className="spec-title"
          dangerouslySetInnerHTML={{__html: line}}
        ></div>
      ))}
      
      {/* 显示表格内容 */}
      {getTableHtml(tableContent)}
      
      {/* 显示表格后的正文内容 */}
      {getAfterTableContent(afterTableContent)}
    </div>
  );
});

// 处理特殊格式的函数 - 更加严格的条件以避免误识别
const processContent = (content: string): string => {
  // 检查是否为带有明确标记的比较表格（必须同时满足多个条件）
  const lines = content.split('\n');
  const tableLineCount = lines.filter(line => line.includes('|')).length;
  const hasTableStructure = tableLineCount >= 3 && 
                        (content.includes('|---') || 
                         content.includes('---|') || 
                         lines.some(line => (line.match(/\|/g) || []).length >= 3));
  
  // 确保是真正的比较表格，不是普通对话
  const isComparisonTable = hasTableStructure && 
                          // 额外检查：表格内容应该占据内容的主要部分
                          (tableLineCount / lines.length > 0.4);
  
  if (isComparisonTable) {
    return `<comparison-table>${content}</comparison-table>`;
  }
  
  // 检查是否为普通表格，使用更严格的条件避免误识别
  const isStandardTable = hasTableStructure && 
                         // 确保表格占据一定比例，并且有表头分隔符
                         (tableLineCount / lines.length > 0.3) && 
                         (content.includes('|---') || content.includes('---|'));
  
  if (isStandardTable) {
    return `<standard-table>${content}</standard-table>`;
  }
  
  // 对于所有其他内容，返回原始内容
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
  const [contentBlocks, setContentBlocks] = useState<Array<{type: 'text' | 'table' | 'comparison', content: string}>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 默认情况下保留原始内容
    setContentBlocks([{ type: 'text', content }]);
    
    // 若内容为空，直接返回
    if (!content || content.trim() === '') {
      return;
    }
    
    try {
      // 解析内容中的所有表格
      const blocks = extractAllTables(content);
      if (blocks.length > 0) {
        setContentBlocks(blocks);
      }
    } catch (error) {
      console.error('处理内容时出错:', error);
      // 出错时显示原始内容
      setContentBlocks([{ type: 'text', content }]);
    }
  }, [content]);

  // 提取内容中的所有表格和文本块
  const extractAllTables = (originalContent: string) => {
    // 对原始内容进行标准化处理，确保每行都正确断行
    const normalizedContent = originalContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    
    // 用于保存所有内容块
    const blocks: Array<{type: 'text' | 'table' | 'comparison', content: string}> = [];
    
    // 进行内容分块
    let currentBlock: string[] = [];
    let currentBlockType: 'text' | 'table' | null = 'text';
    let inTable = false;
    let tableLines = 0;
    
    // 按行处理内容
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 检查是否是表格标记行
      const pipeCount = (line.match(/\|/g) || []).length;
      const hasTableMarker = pipeCount >= 2;
      
      // 进入表格
      if (!inTable && hasTableMarker) {
        // 如果之前有文本内容，保存它
        if (currentBlock.length > 0) {
          blocks.push({
            type: 'text',
            content: currentBlock.join('\n')
          });
          currentBlock = [];
        }
        
        inTable = true;
        tableLines = 1;
        currentBlockType = 'table';
        currentBlock.push(line);
      }
      // 在表格内部
      else if (inTable && hasTableMarker) {
        tableLines++;
        currentBlock.push(line);
      }
      // 表格结束
      else if (inTable && !hasTableMarker) {
        inTable = false;
        
        // 检查是否是有效的表格（至少3行）
        if (tableLines >= 3) {
          // 检查是否是特殊格式的比较表格
          const tableContent = currentBlock.join('\n');
          const isComparison = isComparisonTable(tableContent);
          
          blocks.push({
            type: isComparison ? 'comparison' : 'table',
            content: tableContent
          });
        } else {
          // 不是有效表格，作为普通文本处理
          blocks.push({
            type: 'text',
            content: currentBlock.join('\n')
          });
        }
        
        // 开始新的文本块
        currentBlock = [line];
        currentBlockType = 'text';
        tableLines = 0;
      }
      // 普通文本
      else {
        currentBlock.push(line);
      }
    }
    
    // 处理最后一个块
    if (currentBlock.length > 0) {
      if (inTable && tableLines >= 3) {
        const tableContent = currentBlock.join('\n');
        const isComparison = isComparisonTable(tableContent);
        
        blocks.push({
          type: isComparison ? 'comparison' : 'table',
          content: tableContent
        });
      } else {
        blocks.push({
          type: 'text',
          content: currentBlock.join('\n')
        });
      }
    }
    
    return blocks;
  };
  
  // 检查内容是否为比较表格
  const isComparisonTable = (tableContent: string) => {
    // 表格行数
    const tableLines = tableContent.split('\n');
    const tableLineCount = tableLines.filter(line => line.includes('|')).length;
    
    // 检查是否有表格结构
    const hasTableStructure = tableLineCount >= 3 && 
                         (tableContent.includes('|---') || 
                          tableContent.includes('---|') || 
                          tableLines.some(line => (line.match(/\|/g) || []).length >= 3));
    
    // 表格内部本身就包含复杂结构（如带**的行）
    return hasTableStructure && tableContent.includes('**') && tableLineCount >= 3;
  };

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
  
  // 渲染Markdown内容的函数
  const renderMarkdown = (content: string) => {
    if (!content.trim()) return null;
    
    return (
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
        {content}
      </ReactMarkdown>
    );
  };

  // 构建完整的渲染内容
  return (
    <div ref={contentRef} onClick={onClick}>
      <Suspense fallback={<Spin />}>
        {contentBlocks.map((block, index) => (
          <div className="content-block" key={`block-${index}`}>
            {block.type === 'text' && renderMarkdown(block.content)}
            {block.type === 'table' && <StandardTable content={block.content} />}
            {block.type === 'comparison' && <ComparisonTableContent content={block.content} />}
          </div>
        ))}
      </Suspense>
    </div>
  );
}); 