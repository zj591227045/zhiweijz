'use client';

import { useState } from 'react';
import { useServerConfigStore, ServerType } from '@/store/server-config-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// 简单的SVG图标组件
const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const Globe = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
    />
  </svg>
);

const Settings = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

interface ServerSettingsProps {
  onClose: () => void;
  onSave: () => void;
}

export default function ServerSettings({ onClose, onSave }: ServerSettingsProps) {
  const { config, setServerType, setCustomUrl, testConnection, isDockerEnvironment } =
    useServerConfigStore();

  const [activeTab, setActiveTab] = useState<ServerType>(config.type);
  const [customUrlInput, setCustomUrlInput] = useState(config.customUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'failed' | null>(null);

  // 检测Docker环境，如果是Docker环境则不显示此页面
  const isDocker = isDockerEnvironment();

  // 如果是Docker环境，返回null（不渲染）
  if (isDocker) {
    return null;
  }

  // 测试连接
  const handleTestConnection = async () => {
    const urlToTest = activeTab === 'official' ? config.officialUrl : customUrlInput;

    if (!urlToTest) {
      toast.error('请输入服务器地址');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      const isConnected = await testConnection(urlToTest);
      setConnectionStatus(isConnected ? 'success' : 'failed');

      if (isConnected) {
        toast.success('连接测试成功');
      } else {
        toast.error('连接测试失败，请检查服务器地址');
      }
    } catch {
      setConnectionStatus('failed');
      toast.error('连接测试失败');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // 保存并登录
  const handleSaveAndLogin = () => {
    // 设置服务器类型
    setServerType(activeTab);

    // 如果是自定义服务器，保存URL
    if (activeTab === 'custom') {
      if (!customUrlInput.trim()) {
        toast.error('请输入自定义服务器地址');
        return;
      }
      setCustomUrl(customUrlInput);
    }

    toast.success('服务器配置已保存');
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md min-h-screen sm:min-h-0 sm:max-h-[95vh] sm:my-4 overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">服务器设置</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            </div>
            <Settings className="h-5 w-5 text-gray-500" />
          </div>
        </div>

        {/* 说明信息 */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 m-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">服务器配置</div>
              <div>请选择要连接的服务器，配置完成后可以进行登录。</div>
            </div>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="px-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'official'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setActiveTab('official')}
            >
              官方服务器
            </button>
            <button
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'custom'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => setActiveTab('custom')}
            >
              自定义服务器
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          {activeTab === 'official' ? (
            <div className="space-y-4">
              {/* 官方服务器卡片 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-gray-900 dark:text-white">官方服务器</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  使用官方提供的稳定服务器
                </p>

                {/* API服务器地址 */}
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600 mb-4">
                  <div className="text-sm text-gray-800 dark:text-gray-200 font-mono">
                    {config.officialUrl}
                  </div>
                </div>

                {/* 优势特点 */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>稳定可靠的官方服务</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>定期维护和更新</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    <span>数据安全保障</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 自定义服务器卡片 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Settings className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <span className="font-semibold text-gray-900 dark:text-white">自定义服务器</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  适合企业内部部署或个人服务器
                </p>

                {/* 服务器地址输入 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    服务器地址
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="示例：https://your-server.com"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex items-center">
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                        <span className="text-gray-500 dark:text-gray-400 font-mono text-sm font-medium">/API</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 系统会自动添加 "/api" 后缀
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* 连接状态提示 */}
          {connectionStatus && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                connectionStatus === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div
                className={`flex items-center space-x-2 ${
                  connectionStatus === 'success'
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-red-700 dark:text-red-300'
                }`}
              >
                {connectionStatus === 'success' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-current"></div>
                )}
                <span className="text-sm font-medium">
                  {connectionStatus === 'success' ? '✅ 连接测试成功' : '❌ 连接测试失败'}
                </span>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="space-y-3">
            {/* 测试连接按钮 */}
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="w-full border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <Globe className="mr-2 h-4 w-4" />
              {isTestingConnection ? '测试连接中...' : '测试连接'}
            </Button>

            {/* 保存并登录按钮 */}
            <Button
              onClick={handleSaveAndLogin}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
            >
              保存并登录
            </Button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-t border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start space-x-2 mb-3">
            <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs">💡</span>
            </div>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              使用说明
            </span>
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-400 space-y-2 ml-7">
            <div>
              • <strong>官方服务器</strong>：推荐使用，稳定可靠，无需额外配置
            </div>
            <div>
              • <strong>自定义服务器</strong>：适合企业内部部署或个人服务器
            </div>
            <div>
              • <strong>地址格式</strong>：支持 HTTP/HTTPS，可包含端口号
            </div>
            <div>
              • <strong>配置保存</strong>：设置会保存在本地，重新安装应用后需重新配置
            </div>
            <div>
              • <strong>连接测试</strong>：保存前会自动测试连接，确保服务器可用
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
