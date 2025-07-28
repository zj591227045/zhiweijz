'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VersionUpdateModal } from '@/components/version/VersionUpdateModal';
import { VersionUpdateDialog } from '@/components/version/VersionUpdateDialog';
import { EnhancedVersionUpdateDialog } from '@/components/version/EnhancedVersionUpdateDialog';

// 测试数据
const mockVersionData = {
  id: 'test-version-id',
  version: '2.0.0',
  buildNumber: 200,
  versionCode: 20000,
  releaseNotes: '这是一个重要的更新版本，包含以下新功能：\n\n• 全新的用户界面设计\n• 性能优化和错误修复\n• 新增数据导出功能\n• 改进的安全性\n\n请及时更新以获得最佳体验。',
  downloadUrl: 'https://example.com/download/app-v2.0.0.apk',
  appStoreUrl: 'https://apps.apple.com/app/zhiweijz/id123456789',
  detailUrl: 'https://github.com/your-repo/releases/tag/v2.0.0',
  isForceUpdate: false,
  platform: 'WEB' as const,
  publishedAt: new Date().toISOString(),
};

const mockUpdateInfo = {
  hasUpdate: true,
  latestVersion: mockVersionData,
  isForceUpdate: false,
  updateMessage: '发现新版本 2.0.0，建议立即更新以获得最佳体验。',
};

export default function VersionUpdateTestPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showEnhancedDialog, setShowEnhancedDialog] = useState(false);
  const [platform, setPlatform] = useState<'web' | 'ios' | 'android'>('web');

  const handleAction = (action: 'update' | 'postpone' | 'ignore') => {
    console.log('用户操作:', action);
    setShowModal(false);
  };

  const handleUpdate = async () => {
    console.log('用户选择更新');
  };

  const handleSkip = async () => {
    console.log('用户选择跳过');
    setShowDialog(false);
  };

  const handleUserAction = async (action: 'update' | 'postpone' | 'ignore') => {
    console.log('用户操作:', action);
    setShowEnhancedDialog(false);
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">版本更新弹窗测试</h1>
        
        <div className="space-y-6">
          {/* 平台选择 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">选择测试平台</h2>
            <div className="flex gap-4">
              {(['web', 'ios', 'android'] as const).map((p) => (
                <Button
                  key={p}
                  variant={platform === p ? 'default' : 'outline'}
                  onClick={() => setPlatform(p)}
                  className="capitalize"
                >
                  {p === 'web' ? '网页版' : p === 'ios' ? 'iOS' : 'Android'}
                </Button>
              ))}
            </div>
          </div>

          {/* 测试按钮 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">VersionUpdateModal</h3>
              <p className="text-sm text-gray-600 mb-4">
                基础版本更新模态框，支持详细更新情况链接
              </p>
              <Button onClick={() => setShowModal(true)} className="w-full">
                测试 Modal
              </Button>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">VersionUpdateDialog</h3>
              <p className="text-sm text-gray-600 mb-4">
                标准版本更新对话框，支持详细更新情况链接
              </p>
              <Button onClick={() => setShowDialog(true)} className="w-full">
                测试 Dialog
              </Button>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
              <h3 className="text-lg font-semibold mb-4">EnhancedVersionUpdateDialog</h3>
              <p className="text-sm text-gray-600 mb-4">
                增强版本更新对话框，已支持详细更新情况链接
              </p>
              <Button onClick={() => setShowEnhancedDialog(true)} className="w-full">
                测试 Enhanced Dialog
              </Button>
            </div>
          </div>

          {/* 功能说明 */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">✨ 新增功能说明</h2>
            <div className="space-y-2 text-sm">
              <p>• <strong>详细更新情况链接</strong>：在更新说明下方添加了"查看详细更新情况"按钮</p>
              <p>• <strong>跨平台支持</strong>：Web、iOS、Android 三个平台都支持详细链接</p>
              <p>• <strong>外部链接打开</strong>：点击链接会在新标签页中打开详细更新页面</p>
              <p>• <strong>条件显示</strong>：只有当版本数据中包含 detailUrl 时才显示链接按钮</p>
            </div>
          </div>

          {/* 重复弹窗修复说明 */}
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">🔧 重复弹窗问题修复</h2>
            <div className="space-y-2 text-sm">
              <p>• <strong>问题原因</strong>：应用同时使用了 EnhancedVersionProvider 和 AutoVersionChecker</p>
              <p>• <strong>修复方案</strong>：移除了重复的 AutoVersionChecker 组件</p>
              <p>• <strong>现在状态</strong>：只使用 EnhancedVersionProvider 统一管理版本检查和弹窗</p>
              <p>• <strong>预期效果</strong>：不再出现需要点击2次才能关闭的重复弹窗问题</p>
            </div>
          </div>

          {/* 测试数据展示 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">📋 测试数据</h2>
            <div className="bg-white p-4 rounded border">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(mockVersionData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* 模态框组件 */}
      <VersionUpdateModal
        open={showModal}
        onOpenChange={setShowModal}
        version={{
          ...mockVersionData,
          platform: platform.toUpperCase() as 'WEB' | 'IOS' | 'ANDROID',
        }}
        currentVersion="1.0.0"
        onAction={handleAction}
      />

      <VersionUpdateDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        updateInfo={mockUpdateInfo}
        onUpdate={handleUpdate}
        onSkip={handleSkip}
        platform={platform}
      />

      <EnhancedVersionUpdateDialog
        isOpen={showEnhancedDialog}
        onClose={() => setShowEnhancedDialog(false)}
        updateInfo={mockUpdateInfo}
        onUserAction={handleUserAction}
        platform={platform}
      />
    </div>
  );
}
