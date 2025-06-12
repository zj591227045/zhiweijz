'use client';

import LLMServiceStatus from '@/components/settings/LLMServiceStatus';

export default function TestLLMStatusPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">LLM服务状态测试</h1>
      <div className="space-y-6">
        <LLMServiceStatus />
      </div>
    </div>
  );
} 