'use client';

import React from 'react';

interface MobileNotSupportedProps {
  pageName?: string;
  reason?: string;
}

export default function MobileNotSupported({ 
  pageName = '此页面', 
  reason = '在移动端构建中不可用' 
}: MobileNotSupportedProps) {
  return (
    <div className="container mx-auto p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">页面不可用</h1>
        <p className="text-gray-600">{pageName}{reason}</p>
        <div className="mt-8">
          <button 
            onClick={() => window.history.back()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            返回上一页
          </button>
        </div>
      </div>
    </div>
  );
}

// 高阶组件：为调试页面添加移动端检查
export function withMobileCheck<P extends object>(
  Component: React.ComponentType<P>,
  pageName?: string
) {
  return function MobileCheckedComponent(props: P) {
    // 如果是移动端构建，显示不支持页面
    if (process.env.IS_MOBILE_BUILD === 'true') {
      return <MobileNotSupported pageName={pageName} />;
    }
    
    return <Component {...props} />;
  };
}
