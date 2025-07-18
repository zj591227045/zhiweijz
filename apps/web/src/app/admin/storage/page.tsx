'use client';

import { useState, useEffect } from 'react';
import { adminApiClient, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';
import {
  CloudArrowUpIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ServerIcon,
  CubeIcon,
  DocumentDuplicateIcon,
  SwatchIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface ImageCompressionConfig {
  enabled: boolean;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: 'jpeg' | 'png' | 'webp' | 'auto';
}

interface StorageConfig {
  enabled: boolean;
  provider: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  buckets: {
    avatars: string;
    attachments: string;
    temp: string;
    system: string;
  };
  maxFileSize: number;
  allowedTypes: string[];
  imageCompression?: {
    globalEnabled: boolean;
    globalQuality: number;
    avatar: ImageCompressionConfig;
    attachment: ImageCompressionConfig;
    multimodal: ImageCompressionConfig;
    general: ImageCompressionConfig;
    mobileOptimization: boolean;
    progressiveJpeg: boolean;
    preserveMetadata: boolean;
  };
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  filesByBucket: Record<string, number>;
  filesByType: Record<string, number>;
  bucketInfo?: {
    configured: number;
    existing: number;
    buckets: Array<{
      name: string;
      configured: boolean;
      exists: boolean;
      fileCount: number;
    }>;
  };
}

interface StorageStatus {
  enabled: boolean;
  configured: boolean;
  message: string;
  healthy?: boolean;
}

interface ConfigTemplate {
  name: string;
  description: string;
  config: Partial<StorageConfig>;
}

interface ConfigTemplates {
  minio: ConfigTemplate;
  aws: ConfigTemplate;
  aliyun: ConfigTemplate;
  tencent: ConfigTemplate;
}

type ConfigMode = 'auto' | 'custom';

export default function StoragePage() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [templates, setTemplates] = useState<ConfigTemplates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'files'>('config');
  const [configMode, setConfigMode] = useState<ConfigMode>('auto');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 添加时间戳参数以破坏缓存，确保获取最新状态
      const timestamp = Date.now();

      // 并行加载配置、统计、状态和模板
      const [configRes, statsRes, statusRes, templatesRes] = await Promise.all([
        adminApiClient.get(`${ADMIN_API_ENDPOINTS.STORAGE_CONFIG}?t=${timestamp}`),
        adminApiClient.get(`${ADMIN_API_ENDPOINTS.STORAGE_STATS}?t=${timestamp}`),
        adminApiClient.get(`${ADMIN_API_ENDPOINTS.STORAGE_CONFIG.replace('/config', '/status')}?t=${timestamp}`), // 使用管理员API
        adminApiClient.get(`${ADMIN_API_ENDPOINTS.STORAGE_CONFIG.replace('/config', '/templates')}?t=${timestamp}`),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);

        // 根据配置判断当前模式 - 更灵活的判断逻辑
        const isAutoConfig = configData.data?.endpoint === 'http://minio:9000';
        setConfigMode(isAutoConfig ? 'auto' : 'custom');
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData.data);
        console.log('📊 最新存储状态:', statusData.data);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data);
      }
    } catch (error) {
      console.error('加载存储数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigSave = async (newConfig: Partial<StorageConfig>) => {
    try {
      setIsSaving(true);

      const response = await adminApiClient.put(ADMIN_API_ENDPOINTS.STORAGE_CONFIG, newConfig);

      if (response.ok) {
        await loadData(); // 重新加载数据
        alert('配置保存成功！');
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert('保存配置失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (testConfig?: Partial<StorageConfig>) => {
    try {
      // 使用传入的配置或当前配置进行测试
      const configToTest = testConfig || config;

      const response = await adminApiClient.post(ADMIN_API_ENDPOINTS.STORAGE_TEST, configToTest);

      const result = await response.json();

      if (result.success && result.data.success) {
        alert(`连接测试成功！${result.data.message}`);
      } else {
        alert(`连接测试失败: ${result.data?.message || result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      alert('连接测试失败，请检查配置');
    }
  };

  const diagnoseStorage = async () => {
    try {
      const response = await adminApiClient.get(`${ADMIN_API_ENDPOINTS.STORAGE_CONFIG.replace('/config', '/diagnose')}`);
      const result = await response.json();

      if (result.success) {
        // 创建诊断报告窗口
        const reportWindow = window.open('', '_blank', 'width=800,height=600');
        if (reportWindow) {
          reportWindow.document.write(`
            <html>
              <head>
                <title>存储服务诊断报告</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .step { margin: 10px 0; padding: 10px; border-radius: 5px; }
                  .success { background-color: #d4edda; border: 1px solid #c3e6cb; }
                  .error { background-color: #f8d7da; border: 1px solid #f5c6cb; }
                  .running { background-color: #fff3cd; border: 1px solid #ffeaa7; }
                  .skipped { background-color: #e2e3e5; border: 1px solid #d6d8db; }
                  pre { background: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
                </style>
              </head>
              <body>
                <h1>存储服务诊断报告</h1>
                <p>诊断时间: ${result.data.timestamp}</p>
                ${result.data.steps.map((step: any) => `
                  <div class="step ${step.status}">
                    <h3>步骤 ${step.step}: ${step.name}</h3>
                    <p>状态: ${step.status}</p>
                    ${step.data ? `<pre>${JSON.stringify(step.data, null, 2)}</pre>` : ''}
                    ${step.error ? `<p style="color: red;">错误: ${step.error}</p>` : ''}
                    ${step.reason ? `<p>原因: ${step.reason}</p>` : ''}
                  </div>
                `).join('')}
              </body>
            </html>
          `);
        }
      } else {
        alert(`诊断失败: ${result.message}`);
      }
    } catch (error) {
      console.error('存储诊断失败:', error);
      alert('存储诊断失败，请检查网络连接');
    }
  };

  const handleModeChange = (mode: ConfigMode) => {
    setConfigMode(mode);
    if (mode === 'auto' && templates?.minio) {
      // 自动应用MinIO模板
      setConfig(prev => ({
        ...prev,
        ...templates.minio.config,
      } as StorageConfig));
    }
  };

  const applyTemplate = (templateKey: keyof ConfigTemplates) => {
    if (templates && templates[templateKey]) {
      setConfig(prev => ({
        ...prev,
        ...templates[templateKey].config,
      } as StorageConfig));
    }
  };

  const resetToDefault = async () => {
    try {
      const response = await adminApiClient.post(`${ADMIN_API_ENDPOINTS.STORAGE_CONFIG}/reset`);
      if (response.ok) {
        await loadData();
        alert('配置已重置为默认值！');
      }
    } catch (error) {
      console.error('重置配置失败:', error);
      alert('重置配置失败，请重试');
    }
  };

  const initializeMinIO = async () => {
    try {
      setIsInitializing(true);

      const response = await adminApiClient.post(ADMIN_API_ENDPOINTS.STORAGE_MINIO_INITIALIZE);
      const result = await response.json();

      if (result.success) {
        alert(`MinIO初始化成功！\n访问密钥ID: ${result.data.accessKeyId}\n已创建存储桶: ${result.data.bucketsCreated?.join(', ') || '无'}`);

        // 等待后端服务完全重新加载配置，然后强制刷新状态
        console.log('MinIO初始化成功，等待后端配置重新加载...');
        setTimeout(async () => {
          console.log('开始强制刷新存储状态...');
          await loadData(); // 重新加载数据以显示新配置
        }, 2000); // 增加等待时间确保后端配置完全重新加载
      } else {
        alert(`MinIO初始化失败: ${result.message}`);
      }
    } catch (error) {
      console.error('MinIO初始化失败:', error);
      alert('MinIO初始化失败，请检查MinIO容器是否正在运行');
    } finally {
      setIsInitializing(false);
    }
  };

  const getStatusIcon = () => {
    if (!status) return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    
    if (status.enabled && status.configured) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else if (status.enabled && !status.configured) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    } else {
      return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    
    if (status.enabled && status.configured) {
      return 'text-green-600';
    } else if (status.enabled && !status.configured) {
      return 'text-yellow-600';
    } else {
      return 'text-gray-500';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">文件存储管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            配置和管理S3文件存储服务
          </p>
        </div>

        {/* 状态指示器 */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="text-sm font-medium">
            {status?.message || '状态未知'}
          </span>
        </div>
      </div>

      {/* 存储状态概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 配置状态 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CogIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">配置状态</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-lg font-semibold ${
                      status?.configured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status?.configured ? '已配置' : '未配置'}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      status?.configured ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status?.configured ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 连接状态 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ServerIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">连接状态</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-lg font-semibold ${
                      status?.healthy ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status?.healthy ? '正常' : '异常'}
                    </div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      status?.healthy ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {status?.healthy ? (
                        <CheckCircleIcon className="h-4 w-4" />
                      ) : (
                        <ExclamationTriangleIcon className="h-4 w-4" />
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 配置模式 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WrenchScrewdriverIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">配置模式</dt>
                  <dd className="flex items-baseline">
                    <div className="text-lg font-semibold text-blue-600">
                      {configMode === 'auto' ? '自动配置' : '自定义配置'}
                    </div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                      {configMode === 'auto' ? (
                        <CubeIcon className="h-4 w-4" />
                      ) : (
                        <CogIcon className="h-4 w-4" />
                      )}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 诊断工具 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">诊断工具</h3>
                <p className="text-sm text-gray-500">详细检查存储服务的配置和连接状态</p>
              </div>
              <button
                onClick={diagnoseStorage}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                运行诊断
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'config', name: '存储配置', icon: CogIcon },
            { id: 'stats', name: '存储统计', icon: ChartBarIcon },
            { id: 'files', name: '文件管理', icon: CloudArrowUpIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* 标签页内容 */}
      <div className="mt-6">
        {activeTab === 'config' && (
          <StorageConfigTab
            config={config}
            templates={templates}
            configMode={configMode}
            onSave={handleConfigSave}
            onTest={testConnection}
            onModeChange={handleModeChange}
            onApplyTemplate={applyTemplate}
            onReset={resetToDefault}
            onInitializeMinIO={initializeMinIO}
            isSaving={isSaving}
            isInitializing={isInitializing}
          />
        )}
        
        {activeTab === 'stats' && (
          <StorageStatsTab stats={stats} />
        )}
        
        {activeTab === 'files' && (
          <FileManagementTab />
        )}
      </div>
    </div>
  );
}

// 存储配置标签页组件
function StorageConfigTab({
  config,
  templates,
  configMode,
  onSave,
  onTest,
  onModeChange,
  onApplyTemplate,
  onReset,
  onInitializeMinIO,
  isSaving,
  isInitializing
}: {
  config: StorageConfig | null;
  templates: ConfigTemplates | null;
  configMode: ConfigMode;
  onSave: (config: Partial<StorageConfig>) => void;
  onTest: (config?: Partial<StorageConfig>) => void;
  onModeChange: (mode: ConfigMode) => void;
  onApplyTemplate: (templateKey: keyof ConfigTemplates) => void;
  onReset: () => void;
  onInitializeMinIO: () => void;
  isSaving: boolean;
  isInitializing: boolean;
}) {
  const [formData, setFormData] = useState<Partial<StorageConfig>>({});
  const [showBucketConfig, setShowBucketConfig] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      {/* 配置模式选择 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">配置模式</h3>
          <p className="mt-1 text-sm text-gray-500">
            选择存储配置模式：自动配置或自定义配置
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`relative rounded-lg border-2 cursor-pointer transition-colors ${
                configMode === 'auto'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onModeChange('auto')}
            >
              <div className="p-4">
                <div className="flex items-center">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">自动配置</h4>
                    <p className="text-sm text-gray-500">使用容器统一部署的MinIO</p>
                  </div>
                </div>
                {configMode === 'auto' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>

            <div
              className={`relative rounded-lg border-2 cursor-pointer transition-colors ${
                configMode === 'custom'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onModeChange('custom')}
            >
              <div className="p-4">
                <div className="flex items-center">
                  <CogIcon className="h-6 w-6 text-blue-600" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">自定义配置</h4>
                    <p className="text-sm text-gray-500">自定义MinIO或其他S3服务</p>
                  </div>
                </div>
                {configMode === 'custom' && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MinIO自动初始化（仅自动配置模式显示） */}
      {configMode === 'auto' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">MinIO初始化</h3>
            <p className="mt-1 text-sm text-gray-500">
              自动连接到MinIO容器，生成访问密钥并创建必要的存储桶
            </p>
          </div>

          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">注意事项</h4>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>请确保MinIO容器正在运行</li>
                      <li>初始化将自动生成新的访问密钥</li>
                      <li>将创建必要的存储桶（avatars、transaction-attachments、temp-files、system-files）</li>
                      <li>配置将自动保存到数据库</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onInitializeMinIO}
              disabled={isInitializing}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isInitializing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  初始化中...
                </>
              ) : (
                <>
                  <CubeIcon className="h-4 w-4 mr-2" />
                  初始化MinIO
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 配置模板选择（仅自定义模式显示） */}
      {configMode === 'custom' && templates && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">配置模板</h3>
            <p className="mt-1 text-sm text-gray-500">
              选择预设模板快速配置存储服务
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(templates).map(([key, template]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onApplyTemplate(key as keyof ConfigTemplates)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center mb-2">
                    <SwatchIcon className="h-5 w-5 text-blue-600" />
                    <span className="ml-2 font-medium text-gray-900">{template.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 存储配置表单 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">存储配置</h3>
          <p className="mt-1 text-sm text-gray-500">
            配置S3存储服务的连接参数和存储桶设置
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基础配置 */}
          <div className="space-y-6">
            {/* 启用存储服务 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-gray-900">存储服务状态</h4>
                <p className="text-sm text-gray-500">启用或禁用S3文件存储服务</p>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.enabled || false}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="ml-3 text-sm font-medium text-gray-700 whitespace-nowrap">启用S3存储</span>
              </label>
            </div>

            {/* 存储提供商选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">存储提供商</label>
              <select
                value={formData.provider || 'minio'}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                disabled={configMode === 'auto'}
              >
                <option value="minio">MinIO</option>
                <option value="aws">AWS S3</option>
                <option value="aliyun">阿里云OSS</option>
                <option value="tencent">腾讯云COS</option>
              </select>
              {configMode === 'auto' && (
                <p className="mt-1 text-xs text-gray-500">自动配置模式下提供商已锁定为MinIO</p>
              )}
            </div>
          </div>

        {/* 连接配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">服务端点</label>
            <input
              type="url"
              value={formData.endpoint || ''}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="http://localhost:9000"
              disabled={configMode === 'auto'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">区域</label>
            <input
              type="text"
              value={formData.region || ''}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="us-east-1"
              disabled={configMode === 'auto'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">访问密钥ID</label>
            <input
              type="text"
              value={formData.accessKeyId || ''}
              onChange={(e) => setFormData({ ...formData, accessKeyId: e.target.value })}
              disabled={configMode === 'auto'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">访问密钥</label>
            <input
              type="password"
              value={formData.secretAccessKey || ''}
              onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
              disabled={configMode === 'auto'}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        </div>

        {/* 存储桶配置 */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-medium text-gray-900">存储桶配置</h4>
              <p className="text-sm text-gray-500">配置不同用途的存储桶名称</p>
            </div>
            <button
              type="button"
              onClick={() => setShowBucketConfig(!showBucketConfig)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-500"
            >
              {showBucketConfig ? '收起' : '展开'}
              <ChevronDownIcon className={`ml-1 h-4 w-4 transform transition-transform ${
                showBucketConfig ? 'rotate-180' : ''
              }`} />
            </button>
          </div>

          {showBucketConfig && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <DocumentDuplicateIcon className="inline h-4 w-4 mr-1" />
                  头像存储桶
                </label>
                <input
                  type="text"
                  value={formData.buckets?.avatars || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    buckets: { ...formData.buckets, avatars: e.target.value } as any
                  })}
                  placeholder="avatars"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <DocumentDuplicateIcon className="inline h-4 w-4 mr-1" />
                  附件存储桶
                </label>
                <input
                  type="text"
                  value={formData.buckets?.attachments || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    buckets: { ...formData.buckets, attachments: e.target.value } as any
                  })}
                  placeholder="transaction-attachments"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <DocumentDuplicateIcon className="inline h-4 w-4 mr-1" />
                  临时文件存储桶
                </label>
                <input
                  type="text"
                  value={formData.buckets?.temp || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    buckets: { ...formData.buckets, temp: e.target.value } as any
                  })}
                  placeholder="temp-files"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <DocumentDuplicateIcon className="inline h-4 w-4 mr-1" />
                  系统文件存储桶
                </label>
                <input
                  type="text"
                  value={formData.buckets?.system || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    buckets: { ...formData.buckets, system: e.target.value } as any
                  })}
                  placeholder="system-files"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 图片压缩配置 */}
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div>
              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                图片压缩设置
              </h4>
              <p className="text-sm text-gray-500">配置图片上传时的自动压缩功能，优化移动设备访问体验</p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.imageCompression?.globalEnabled || false}
                onChange={(e) => setFormData({
                  ...formData,
                  imageCompression: {
                    ...formData.imageCompression,
                    globalEnabled: e.target.checked,
                    globalQuality: formData.imageCompression?.globalQuality || 80,
                    avatar: formData.imageCompression?.avatar || { enabled: true, quality: 85, maxWidth: 512, maxHeight: 512, format: 'webp' },
                    attachment: formData.imageCompression?.attachment || { enabled: true, quality: 80, maxWidth: 1920, maxHeight: 1920, format: 'auto' },
                    multimodal: formData.imageCompression?.multimodal || { enabled: true, quality: 90, maxWidth: 2048, maxHeight: 2048, format: 'auto' },
                    general: formData.imageCompression?.general || { enabled: true, quality: 80, maxWidth: 1920, maxHeight: 1920, format: 'auto' },
                    mobileOptimization: formData.imageCompression?.mobileOptimization || true,
                    progressiveJpeg: formData.imageCompression?.progressiveJpeg || true,
                    preserveMetadata: formData.imageCompression?.preserveMetadata || false,
                  } as any
                })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">启用图片压缩</span>
            </label>
          </div>

          {formData.imageCompression?.globalEnabled && (
            <div className="space-y-6">
              {/* 全局压缩质量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  全局默认压缩质量: {formData.imageCompression?.globalQuality || 80}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.imageCompression?.globalQuality || 80}
                  onChange={(e) => setFormData({
                    ...formData,
                    imageCompression: {
                      ...formData.imageCompression,
                      globalQuality: parseInt(e.target.value)
                    } as any
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>低质量 (小文件)</span>
                  <span>高质量 (大文件)</span>
                </div>
              </div>

              {/* 分类压缩配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 头像压缩 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-900">头像压缩</h5>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.imageCompression?.avatar?.enabled || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          imageCompression: {
                            ...formData.imageCompression,
                            avatar: {
                              ...formData.imageCompression?.avatar,
                              enabled: e.target.checked
                            }
                          } as any
                        })}
                        className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                  {formData.imageCompression?.avatar?.enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          质量: {formData.imageCompression?.avatar?.quality || 85}%
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={formData.imageCompression?.avatar?.quality || 85}
                          onChange={(e) => setFormData({
                            ...formData,
                            imageCompression: {
                              ...formData.imageCompression,
                              avatar: {
                                ...formData.imageCompression?.avatar,
                                quality: parseInt(e.target.value)
                              }
                            } as any
                          })}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">最大宽度</label>
                          <input
                            type="number"
                            value={formData.imageCompression?.avatar?.maxWidth || 512}
                            onChange={(e) => setFormData({
                              ...formData,
                              imageCompression: {
                                ...formData.imageCompression,
                                avatar: {
                                  ...formData.imageCompression?.avatar,
                                  maxWidth: parseInt(e.target.value)
                                }
                              } as any
                            })}
                            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">最大高度</label>
                          <input
                            type="number"
                            value={formData.imageCompression?.avatar?.maxHeight || 512}
                            onChange={(e) => setFormData({
                              ...formData,
                              imageCompression: {
                                ...formData.imageCompression,
                                avatar: {
                                  ...formData.imageCompression?.avatar,
                                  maxHeight: parseInt(e.target.value)
                                }
                              } as any
                            })}
                            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">输出格式</label>
                        <select
                          value={formData.imageCompression?.avatar?.format || 'webp'}
                          onChange={(e) => setFormData({
                            ...formData,
                            imageCompression: {
                              ...formData.imageCompression,
                              avatar: {
                                ...formData.imageCompression?.avatar,
                                format: e.target.value as any
                              }
                            } as any
                          })}
                          className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="webp">WebP (推荐)</option>
                          <option value="jpeg">JPEG</option>
                          <option value="png">PNG</option>
                          <option value="auto">自动选择</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 记账附件压缩 */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-gray-900">记账附件压缩</h5>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.imageCompression?.attachment?.enabled || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          imageCompression: {
                            ...formData.imageCompression,
                            attachment: {
                              ...formData.imageCompression?.attachment,
                              enabled: e.target.checked
                            }
                          } as any
                        })}
                        className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                  {formData.imageCompression?.attachment?.enabled && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          质量: {formData.imageCompression?.attachment?.quality || 80}%
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          value={formData.imageCompression?.attachment?.quality || 80}
                          onChange={(e) => setFormData({
                            ...formData,
                            imageCompression: {
                              ...formData.imageCompression,
                              attachment: {
                                ...formData.imageCompression?.attachment,
                                quality: parseInt(e.target.value)
                              }
                            } as any
                          })}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">最大宽度</label>
                          <input
                            type="number"
                            value={formData.imageCompression?.attachment?.maxWidth || 1920}
                            onChange={(e) => setFormData({
                              ...formData,
                              imageCompression: {
                                ...formData.imageCompression,
                                attachment: {
                                  ...formData.imageCompression?.attachment,
                                  maxWidth: parseInt(e.target.value)
                                }
                              } as any
                            })}
                            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">最大高度</label>
                          <input
                            type="number"
                            value={formData.imageCompression?.attachment?.maxHeight || 1920}
                            onChange={(e) => setFormData({
                              ...formData,
                              imageCompression: {
                                ...formData.imageCompression,
                                attachment: {
                                  ...formData.imageCompression?.attachment,
                                  maxHeight: parseInt(e.target.value)
                                }
                              } as any
                            })}
                            className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">输出格式</label>
                        <select
                          value={formData.imageCompression?.attachment?.format || 'auto'}
                          onChange={(e) => setFormData({
                            ...formData,
                            imageCompression: {
                              ...formData.imageCompression,
                              attachment: {
                                ...formData.imageCompression?.attachment,
                                format: e.target.value as any
                              }
                            } as any
                          })}
                          className="w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                          <option value="auto">自动选择 (推荐)</option>
                          <option value="webp">WebP</option>
                          <option value="jpeg">JPEG</option>
                          <option value="png">PNG</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 高级选项 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-900 mb-3">高级选项</h5>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.imageCompression?.mobileOptimization || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        imageCompression: {
                          ...formData.imageCompression,
                          mobileOptimization: e.target.checked
                        } as any
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">移动设备优化</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.imageCompression?.progressiveJpeg || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        imageCompression: {
                          ...formData.imageCompression,
                          progressiveJpeg: e.target.checked
                        } as any
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">渐进式JPEG</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.imageCompression?.preserveMetadata || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        imageCompression: {
                          ...formData.imageCompression,
                          preserveMetadata: e.target.checked
                        } as any
                      })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">保留图片元数据</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            重置为默认
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => onTest(formData)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              测试连接
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? '保存中...' : '保存配置'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}

// 存储统计标签页组件
function StorageStatsTab({ stats }: { stats: StorageStats | null }) {
  if (!stats) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">暂无统计数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总文件数</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalFiles || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">总存储大小</p>
              <p className="text-2xl font-semibold text-gray-900">{formatFileSize(stats.totalSize || 0)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">存储桶数量</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.bucketInfo ? `${stats.bucketInfo.existing}/${stats.bucketInfo.configured}` : '0'}
              </p>
              {stats.bucketInfo && (
                <p className="text-xs text-gray-400">已存在/已配置</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 存储桶统计 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">存储桶统计</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.bucketInfo && stats.bucketInfo.buckets.length > 0 ? (
              stats.bucketInfo.buckets.map((bucket) => (
                <div key={bucket.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${bucket.exists ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{bucket.name}</p>
                      <p className="text-sm text-gray-500">{bucket.fileCount} 个文件</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${bucket.exists ? 'text-green-600' : 'text-red-600'}`}>
                      {bucket.exists ? '已存在' : '不存在'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {bucket.configured ? '已配置' : '未配置'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">暂无存储桶数据</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 文件管理标签页组件
function FileManagementTab() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">文件管理</h3>
      <p className="text-gray-500">文件管理功能开发中...</p>
    </div>
  );
}

// 辅助函数
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
