'use client';

import { useState, useEffect } from 'react';
import { adminApiClient, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';
import { 
  CloudArrowUpIcon, 
  CogIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

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
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  filesByBucket: Record<string, number>;
  filesByType: Record<string, number>;
}

interface StorageStatus {
  enabled: boolean;
  configured: boolean;
  message: string;
  healthy?: boolean;
}

export default function StoragePage() {
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'stats' | 'files'>('config');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // 并行加载配置、统计和状态
      const [configRes, statsRes, statusRes] = await Promise.all([
        adminApiClient.get(ADMIN_API_ENDPOINTS.STORAGE_CONFIG),
        adminApiClient.get(ADMIN_API_ENDPOINTS.STORAGE_STATS),
        adminApiClient.get('/files/status') // 这个是普通用户API
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData.data);
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

  const testConnection = async () => {
    try {
      const response = await adminApiClient.post(ADMIN_API_ENDPOINTS.STORAGE_TEST);

      const result = await response.json();

      if (result.success) {
        alert('连接测试成功！');
      } else {
        alert(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error('连接测试失败:', error);
      alert('连接测试失败，请检查配置');
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
            onSave={handleConfigSave} 
            onTest={testConnection}
            isSaving={isSaving}
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
  onSave, 
  onTest, 
  isSaving 
}: { 
  config: StorageConfig | null;
  onSave: (config: Partial<StorageConfig>) => void;
  onTest: () => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<StorageConfig>>({});

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
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">S3存储配置</h3>
        <p className="mt-1 text-sm text-gray-500">
          配置S3存储服务的连接参数和存储桶设置
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 基础配置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled || false}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">启用S3存储</span>
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">存储提供商</label>
            <select
              value={formData.provider || 'minio'}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="minio">MinIO</option>
              <option value="aws">AWS S3</option>
              <option value="aliyun">阿里云OSS</option>
              <option value="tencent">腾讯云COS</option>
            </select>
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">区域</label>
            <input
              type="text"
              value={formData.region || ''}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              placeholder="us-east-1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">访问密钥</label>
            <input
              type="password"
              value={formData.secretAccessKey || ''}
              onChange={(e) => setFormData({ ...formData, secretAccessKey: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onTest}
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
      </form>
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
              <p className="text-2xl font-semibold text-gray-900">{stats.filesByBucket ? Object.keys(stats.filesByBucket).length : 0}</p>
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
            {stats.filesByBucket && Object.keys(stats.filesByBucket).length > 0 ? (
              Object.entries(stats.filesByBucket).map(([bucket, fileCount]) => (
                <div key={bucket} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{bucket}</p>
                    <p className="text-sm text-gray-500">{fileCount} 个文件</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">存储桶</p>
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
