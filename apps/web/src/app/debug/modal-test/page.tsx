'use client';

import React, { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { EnhancedVersionUpdateDialog } from '@/components/version/EnhancedVersionUpdateDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ModalTestPage() {
  const [showNormalUpdate, setShowNormalUpdate] = useState(false);
  const [showForceUpdate, setShowForceUpdate] = useState(false);
  const [showLongContent, setShowLongContent] = useState(false);

  // 模拟版本更新数据
  const mockUpdateInfo = {
    hasUpdate: true,
    isForceUpdate: false,
    updateMessage: '发现新版本 1.2.0，建议立即更新以获得最佳体验。',
    latestVersion: {
      id: 'test-version-id',
      platform: 'WEB',
      version: '1.2.0',
      buildNumber: 120,
      versionCode: 120,
      releaseNotes: '• 修复了一些已知问题\n• 优化了用户界面\n• 提升了性能表现',
      downloadUrl: 'https://example.com/download',
      appStoreUrl: 'https://apps.apple.com/app/test',
      detailUrl: 'https://github.com/your-repo/releases/tag/v1.2.0',
      isForceUpdate: false,
      publishedAt: new Date().toISOString()
    }
  };

  const mockForceUpdateInfo = {
    ...mockUpdateInfo,
    isForceUpdate: true,
    updateMessage: '检测到重要安全更新，必须立即更新才能继续使用。',
    latestVersion: {
      ...mockUpdateInfo.latestVersion,
      isForceUpdate: true,
      version: '1.2.1',
      releaseNotes: '• 重要安全修复\n• 修复了严重的安全漏洞\n• 更新了加密算法\n• 提升了数据保护能力'
    }
  };

  const mockLongContentInfo = {
    ...mockUpdateInfo,
    latestVersion: {
      ...mockUpdateInfo.latestVersion,
      version: '2.0.0',
      detailUrl: 'https://github.com/your-repo/releases/tag/v2.0.0',
      releaseNotes: `• 全新的用户界面设计
• 重构了核心架构，提升性能
• 新增了多个实用功能：
  - 智能分类建议
  - 数据导出功能
  - 高级统计图表
  - 多账本支持
• 修复了以下问题：
  - 修复了数据同步问题
  - 解决了内存泄漏
  - 优化了启动速度
  - 改进了错误处理
• 安全性改进：
  - 更新了加密算法
  - 加强了数据保护
  - 优化了权限管理
• 用户体验优化：
  - 简化了操作流程
  - 改进了响应速度
  - 优化了动画效果
  - 提升了可访问性
• 兼容性更新：
  - 支持最新的操作系统
  - 优化了不同设备的适配
  - 改进了浏览器兼容性`
    }
  };

  const handleUserAction = async (action: 'update' | 'postpone' | 'skip') => {
    console.log('用户操作:', action);
    // 模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 关闭对话框
    setShowNormalUpdate(false);
    setShowForceUpdate(false);
    setShowLongContent(false);
  };

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
    <PageContainer
      title="模态框测试"
      showHeader={true}
      showBottomNav={false}
      className="pb-6"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>版本更新模态框测试</CardTitle>
            <CardDescription>
              测试不同场景下的版本更新模态框显示效果
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button
                onClick={() => setShowNormalUpdate(true)}
                variant="outline"
                className="w-full"
              >
                普通更新
              </Button>
              
              <Button
                onClick={() => setShowForceUpdate(true)}
                variant="destructive"
                className="w-full"
              >
                强制更新
              </Button>
              
              <Button
                onClick={() => setShowLongContent(true)}
                variant="outline"
                className="w-full"
              >
                长内容更新
              </Button>
            </div>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>测试要点：</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>模态框是否在屏幕中央显示</li>
                <li>左右边距是否一致</li>
                <li>上下边距是否一致</li>
                <li>在不同屏幕尺寸下的表现</li>
                <li>长内容时的滚动效果</li>
                <li>强制更新时的交互限制</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 屏幕尺寸信息 */}
        <Card>
          <CardHeader>
            <CardTitle>屏幕信息</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">视口宽度:</span>
                <span className="ml-2 font-mono">{typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px</span>
              </div>
              <div>
                <span className="text-gray-600">视口高度:</span>
                <span className="ml-2 font-mono">{typeof window !== 'undefined' ? window.innerHeight : 'N/A'}px</span>
              </div>
              <div>
                <span className="text-gray-600">设备像素比:</span>
                <span className="ml-2 font-mono">{typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">用户代理:</span>
                <span className="ml-2 text-xs break-all">{typeof window !== 'undefined' ? navigator.userAgent.slice(0, 50) + '...' : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 版本更新对话框 */}
      <EnhancedVersionUpdateDialog
        isOpen={showNormalUpdate}
        onClose={() => setShowNormalUpdate(false)}
        updateInfo={mockUpdateInfo}
        onUserAction={handleUserAction}
        platform="web"
      />

      <EnhancedVersionUpdateDialog
        isOpen={showForceUpdate}
        onClose={() => setShowForceUpdate(false)}
        updateInfo={mockForceUpdateInfo}
        onUserAction={handleUserAction}
        platform="ios"
      />

      <EnhancedVersionUpdateDialog
        isOpen={showLongContent}
        onClose={() => setShowLongContent(false)}
        updateInfo={mockLongContentInfo}
        onUserAction={handleUserAction}
        platform="android"
      />
    </PageContainer>
  );
}
