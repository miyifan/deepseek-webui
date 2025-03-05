import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  // 构建完整的请求 URL，包含所有额外的查询参数
  const targetUrl = new URL(url);
  
  // 将除了 'url' 以外的所有参数添加到目标 URL
  searchParams.forEach((value, key) => {
    if (key !== 'url') {
      targetUrl.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API 请求失败: ${errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('代理请求失败:', error);
    return NextResponse.json(
      { error: '代理请求失败：' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
  }

  // 构建完整的请求 URL，包含所有额外的查询参数
  const targetUrl = new URL(url);
  
  // 将除了 'url' 以外的所有参数添加到目标 URL
  searchParams.forEach((value, key) => {
    if (key !== 'url') {
      targetUrl.searchParams.append(key, value);
    }
  });

  try {
    const body = await request.json();
    const headers = new Headers(request.headers);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API 请求失败: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('代理请求失败:', error);
    return NextResponse.json(
      { error: '代理请求失败：' + (error as Error).message },
      { status: 500 }
    );
  }
} 