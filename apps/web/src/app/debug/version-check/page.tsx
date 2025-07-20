'use client';

import React from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { VersionCheckSettings } from '@/components/settings/VersionCheckSettings';
import { VersionCheckDebugPanel } from '@/components/version/VersionCheckDebugPanel';

export default function VersionCheckDebugPage() {
  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return (
      <PageContainer
        title="页面不存在"
        showHeader={true}
        showBottomNav={false}
        className="flex items-center justify-center min-h-screen"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">404</h1>
          <p className="text-gray-600">页面不存在</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="版本检查调试" showHeader={true} showBottomNav={false} className="pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 调试面板 */}
        <VersionCheckDebugPanel />

        {/* 版本设置 */}
        <VersionCheckSettings />
      </div>
    </PageContainer>
  );
}
