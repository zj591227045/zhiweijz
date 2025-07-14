'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * AI服务管理主页面
 * 重定向到LLM基本配置页面
 */
export default function AIServicesPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到LLM基本配置页面
    router.replace('/admin/llm');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">正在跳转到AI服务管理...</p>
      </div>
    </div>
  );
}
