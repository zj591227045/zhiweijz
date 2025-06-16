'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  PlusIcon as Plus, 
  TrashIcon as Trash2, 
  PencilIcon as Edit,
  BeakerIcon as TestTube,
  SignalIcon as Activity,
  ArrowPathIcon as RefreshCw,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  DocumentArrowDownIcon as Save
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

interface LLMProviderInstance {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  priority: number;
  weight: number;
  enabled: boolean;
  healthy: boolean;
  lastHealthCheck?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface MultiProviderLLMConfig {
  id: string;
  name: string;
  enabled: boolean;
  providers: LLMProviderInstance[];
  failover: {
    enabled: boolean;
    maxRetries: number;
    retryInterval: number;
  };
  loadBalancing: {
    strategy: 'round-robin' | 'weighted' | 'random';
    healthCheckInterval: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ProviderTemplate {
  provider: string;
  name: string;
  defaultModels: string[];
  defaultBaseUrl: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
}

interface ProviderHealthStatus {
  providerId: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  checkedAt: Date;
}

export default function MultiProviderLLMPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  const { isAuthenticated } = useAdminAuth();
  const [config, setConfig] = useState<MultiProviderLLMConfig | null>(null);
  const [templates, setTemplates] = useState<ProviderTemplate[]>([]);
  const [healthStatuses, setHealthStatuses] = useState<ProviderHealthStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProviderInstance | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [providers, setProviders] = useState<LLMProviderInstance[]>([]);
  const [healthStatus, setHealthStatus] = useState<{ [key: string]: ProviderHealthStatus }>({});
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [priorityInfo, setPriorityInfo] = useState<any>(null);

  // 新增提供商表单数据
  const [newProvider, setNewProvider] = useState({
    provider: 'openai',
    name: '',
    apiKey: '',
    model: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 1000,
    priority: 1,
    weight: 1,
    enabled: true
  });

  // 加载配置优先级信息
  const loadPriorityInfo = async () => {
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_CONFIG_PRIORITY);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPriorityInfo(data.data);
        }
      }
    } catch (error) {
      console.error('获取配置优先级信息失败:', error);
    }
  };

  // 加载配置
  const loadConfig = async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_CONFIG);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConfig(data.data);
          setProviders(data.data.providers || []);
        }
      } else {
        toast.error('获取配置失败');
      }
    } catch (error) {
      console.error('获取配置错误:', error);
      toast.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载提供商模板
  const loadTemplates = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_TEMPLATES);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTemplates(data.data);
        }
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    }
  };

  // 加载健康状态
  const loadHealthStatuses = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_HEALTH);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHealthStatuses(data.data);
        }
      }
    } catch (error) {
      console.error('加载健康状态失败:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
      loadPriorityInfo();
      loadTemplates();
      loadHealthStatuses();
    }
  }, [isAuthenticated]);

  // 保存配置
  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await adminApi.put(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_CONFIG, config);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('配置保存成功');
          await loadConfig();
        } else {
          toast.error(data.message || '保存失败');
        }
      } else {
        toast.error('保存请求失败');
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 添加提供商实例
  const addProvider = async () => {
    if (!newProvider.name || !newProvider.apiKey) {
      toast.error('名称和API密钥不能为空');
      return;
    }

    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_PROVIDERS, newProvider);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('提供商添加成功');
          setShowAddProvider(false);
          setNewProvider({
            provider: 'openai',
            name: '',
            apiKey: '',
            model: '',
            baseUrl: '',
            temperature: 0.7,
            maxTokens: 1000,
            priority: 1,
            weight: 1,
            enabled: true
          });
          await loadConfig();
        } else {
          toast.error(data.message || '添加失败');
        }
      } else {
        toast.error('添加请求失败');
      }
    } catch (error) {
      console.error('添加提供商失败:', error);
      toast.error('添加提供商失败');
    }
  };

  // 更新提供商实例
  const updateProvider = async () => {
    if (!editingProvider) return;

    try {
      const response = await adminApi.put(`${ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_PROVIDERS}/${editingProvider.id}`, editingProvider);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('提供商实例已更新');
          setEditingProvider(null);
          loadConfig(); // 重新加载配置
        } else {
          toast.error(data.message || '更新提供商实例失败');
        }
      } else {
        toast.error('更新提供商实例失败');
      }
    } catch (error) {
      console.error('更新提供商实例失败:', error);
      toast.error('更新提供商实例失败');
    }
  };

  // 删除提供商实例
  const deleteProvider = async (providerId: string) => {
    if (!confirm('确定要删除这个提供商实例吗？')) return;

    try {
      const response = await adminApi.delete(`${ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_PROVIDERS}/${providerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('提供商删除成功');
          await loadConfig();
        } else {
          toast.error(data.message || '删除失败');
        }
      } else {
        toast.error('删除请求失败');
      }
    } catch (error) {
      console.error('删除提供商失败:', error);
      toast.error('删除提供商失败');
    }
  };

  // 测试提供商连接
  const testProvider = async (providerId: string) => {
    try {
      const response = await adminApi.post(`${ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_PROVIDERS}/${providerId}/test`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const result = data.data;
          if (result.healthy) {
            toast.success(`连接测试成功 (${result.responseTime}ms)`);
          } else {
            toast.error(`连接测试失败: ${result.error}`);
          }
          await loadHealthStatuses();
        } else {
          toast.error(data.message || '测试失败');
        }
      } else {
        toast.error('测试请求失败');
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      toast.error('测试连接失败');
    }
  };

  // 触发健康检查
  const triggerHealthCheck = async () => {
    try {
      const response = await adminApi.post(`${ADMIN_API_ENDPOINTS.MULTI_PROVIDER_LLM_HEALTH}/check`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('健康检查已触发');
          // 延迟加载健康状态，给检查时间
          setTimeout(() => {
            loadHealthStatuses();
          }, 2000);
        } else {
          toast.error(data.message || '触发失败');
        }
      } else {
        toast.error('触发请求失败');
      }
    } catch (error) {
      console.error('触发健康检查失败:', error);
      toast.error('触发健康检查失败');
    }
  };

  // 选择提供商模板时更新表单
  const handleProviderTemplateChange = (providerType: string) => {
    const template = templates.find(t => t.provider === providerType);
    if (template) {
      setNewProvider(prev => ({
        ...prev,
        provider: providerType,
        model: template.defaultModels[0] || '',
        baseUrl: template.defaultBaseUrl,
        temperature: template.defaultTemperature,
        maxTokens: template.defaultMaxTokens
      }));
    }
  };

  // 获取提供商健康状态
  const getProviderHealthStatus = (providerId: string) => {
    return healthStatuses.find(h => h.providerId === providerId);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          多提供商 LLM 管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          配置多个LLM提供商，支持优先级、故障转移和负载均衡
        </p>
        
        {/* 配置优先级状态 */}
        {priorityInfo && (
          <div className={`mt-4 p-4 border rounded-lg ${
            priorityInfo.mode === 'multi-provider' 
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
              : 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
          }`}>
            <div className="flex items-start space-x-3">
              <div className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                priorityInfo.mode === 'multi-provider' 
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {priorityInfo.mode === 'multi-provider' ? '✓' : '⚠️'}
              </div>
              <div>
                <h3 className={`text-sm font-semibold ${
                  priorityInfo.mode === 'multi-provider'
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-orange-900 dark:text-orange-100'
                }`}>
                  {priorityInfo.description}
                </h3>
                <p className={`text-sm mt-1 ${
                  priorityInfo.mode === 'multi-provider'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-orange-800 dark:text-orange-200'
                }`}>
                  {priorityInfo.note}
                  {priorityInfo.activeProviders && ` (${priorityInfo.activeProviders} 个活跃提供商)`}
                </p>
                {priorityInfo.mode === 'single-provider' && (
                  <div className="mt-2">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-orange-700 dark:text-orange-300 text-sm"
                      onClick={() => window.open('/admin/llm', '_blank')}
                    >
                      查看全局LLM配置 →
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">多提供商LLM管理</h1>
          <p className="text-gray-600 mt-2">配置多个LLM提供商，支持优先级、故障转移和负载均衡</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={triggerHealthCheck} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            健康检查
          </Button>
          <Button onClick={saveConfig} disabled={saving || !config} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      {config && (
        <>
          {/* 全局配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                全局配置
              </CardTitle>
              <CardDescription>
                配置多提供商LLM服务的全局参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={config.enabled}
                  onCheckedChange={(checked) => setConfig({...config, enabled: checked})}
                />
                <Label htmlFor="enabled">启用多提供商LLM服务</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">故障转移配置</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="failover-enabled"
                      checked={config.failover.enabled}
                      onCheckedChange={(checked) => 
                        setConfig({
                          ...config, 
                          failover: {...config.failover, enabled: checked}
                        })
                      }
                    />
                    <Label htmlFor="failover-enabled">启用故障转移</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">最大重试次数</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      min="1"
                      max="10"
                      value={config.failover.maxRetries}
                      onChange={(e) => 
                        setConfig({
                          ...config,
                          failover: {...config.failover, maxRetries: parseInt(e.target.value) || 3}
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="retry-interval">重试间隔 (毫秒)</Label>
                    <Input
                      id="retry-interval"
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={config.failover.retryInterval}
                      onChange={(e) => 
                        setConfig({
                          ...config,
                          failover: {...config.failover, retryInterval: parseInt(e.target.value) || 1000}
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">负载均衡配置</h3>
                  <div className="space-y-2">
                    <Label htmlFor="lb-strategy">负载均衡策略</Label>
                    <select
                      id="lb-strategy"
                      className="w-full p-2 border rounded-md"
                      value={config.loadBalancing.strategy}
                      onChange={(e) => 
                        setConfig({
                          ...config,
                          loadBalancing: {
                            ...config.loadBalancing, 
                            strategy: e.target.value as 'round-robin' | 'weighted' | 'random'
                          }
                        })
                      }
                    >
                      <option value="round-robin">轮询 (Round Robin)</option>
                      <option value="weighted">加权轮询 (Weighted)</option>
                      <option value="random">随机 (Random)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="health-check-interval">健康检查间隔 (毫秒)</Label>
                    <Input
                      id="health-check-interval"
                      type="number"
                      min="60000"
                      max="3600000"
                      step="60000"
                      value={config.loadBalancing.healthCheckInterval}
                      onChange={(e) => 
                        setConfig({
                          ...config,
                          loadBalancing: {
                            ...config.loadBalancing, 
                            healthCheckInterval: parseInt(e.target.value) || 300000
                          }
                        })
                      }
                    />
                    <p className="text-sm text-gray-500">建议设置为5分钟 (300000毫秒)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 提供商实例列表 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    LLM提供商实例
                  </CardTitle>
                  <CardDescription>
                    管理配置的LLM提供商实例
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setShowAddProvider(true)} 
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  添加提供商
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {config.providers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  还没有配置任何提供商实例，点击"添加提供商"开始配置
                </div>
              ) : (
                <div className="space-y-4">
                  {config.providers
                    .sort((a, b) => a.priority - b.priority)
                    .map((provider) => {
                      const healthStatus = getProviderHealthStatus(provider.id);
                      return (
                        <div key={provider.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">{provider.name}</h3>
                                <Badge variant={provider.enabled ? "default" : "secondary"}>
                                  {provider.enabled ? "启用" : "禁用"}
                                </Badge>
                                <Badge 
                                  variant={healthStatus?.healthy ? "default" : "destructive"}
                                  className="flex items-center gap-1"
                                >
                                  {healthStatus?.healthy ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <XCircle className="h-3 w-3" />
                                  )}
                                  {healthStatus?.healthy ? "健康" : "不健康"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                onClick={() => testProvider(provider.id)}
                                variant="outline" 
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <TestTube className="h-3 w-3" />
                                测试
                              </Button>
                              <Button 
                                onClick={() => setEditingProvider(provider)}
                                variant="outline" 
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-3 w-3" />
                                编辑
                              </Button>
                              <Button 
                                onClick={() => deleteProvider(provider.id)}
                                variant="destructive" 
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                删除
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">提供商：</span>
                              <span className="ml-2 font-medium">{provider.provider}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">模型：</span>
                              <span className="ml-2 font-medium">{provider.model}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">优先级：</span>
                              <span className="ml-2 font-medium">{provider.priority}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">权重：</span>
                              <span className="ml-2 font-medium">{provider.weight}</span>
                            </div>
                          </div>

                          {healthStatus && (
                            <div className="text-xs text-gray-500">
                              最后检查: {new Date(healthStatus.checkedAt).toLocaleString()}
                              {healthStatus.responseTime && (
                                <span className="ml-2">响应时间: {healthStatus.responseTime}ms</span>
                              )}
                              {healthStatus.error && (
                                <span className="ml-2 text-red-500">错误: {healthStatus.error}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 添加提供商对话框 */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">添加LLM提供商</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider-type">提供商类型</Label>
                <select
                  id="provider-type"
                  className="w-full p-2 border rounded-md"
                  value={newProvider.provider}
                  onChange={(e) => handleProviderTemplateChange(e.target.value)}
                >
                  {templates.map((template) => (
                    <option key={template.provider} value={template.provider}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-name">显示名称</Label>
                <Input
                  id="provider-name"
                  placeholder="例如: OpenAI主要服务"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-api-key">API密钥</Label>
                <Input
                  id="provider-api-key"
                  type="password"
                  placeholder="输入API密钥"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({...newProvider, apiKey: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-model">模型</Label>
                <Input
                  id="provider-model"
                  placeholder="模型名称"
                  value={newProvider.model}
                  onChange={(e) => setNewProvider({...newProvider, model: e.target.value})}
                />
              </div>

              {newProvider.provider === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="provider-base-url">Base URL</Label>
                  <Input
                    id="provider-base-url"
                    placeholder="https://api.example.com/v1"
                    value={newProvider.baseUrl}
                    onChange={(e) => setNewProvider({...newProvider, baseUrl: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-priority">优先级</Label>
                  <Input
                    id="provider-priority"
                    type="number"
                    min="1"
                    max="100"
                    value={newProvider.priority}
                    onChange={(e) => setNewProvider({...newProvider, priority: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-xs text-gray-500">数字越小优先级越高</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider-weight">权重</Label>
                  <Input
                    id="provider-weight"
                    type="number"
                    min="1"
                    max="100"
                    value={newProvider.weight}
                    onChange={(e) => setNewProvider({...newProvider, weight: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-xs text-gray-500">用于加权负载均衡</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-temperature">温度</Label>
                  <Input
                    id="provider-temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={newProvider.temperature}
                    onChange={(e) => setNewProvider({...newProvider, temperature: parseFloat(e.target.value) || 0.7})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider-max-tokens">最大Tokens</Label>
                  <Input
                    id="provider-max-tokens"
                    type="number"
                    min="100"
                    max="10000"
                    value={newProvider.maxTokens}
                    onChange={(e) => setNewProvider({...newProvider, maxTokens: parseInt(e.target.value) || 1000})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="provider-enabled"
                  checked={newProvider.enabled}
                  onCheckedChange={(checked) => setNewProvider({...newProvider, enabled: checked})}
                />
                <Label htmlFor="provider-enabled">启用此提供商</Label>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button onClick={addProvider} className="flex-1">
                添加提供商
              </Button>
              <Button 
                onClick={() => setShowAddProvider(false)} 
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑提供商对话框 */}
      {editingProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">编辑LLM提供商</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-provider-name">显示名称</Label>
                <Input
                  id="edit-provider-name"
                  placeholder="例如: OpenAI主要服务"
                  value={editingProvider.name}
                  onChange={(e) => setEditingProvider({...editingProvider, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider-api-key">API密钥</Label>
                <Input
                  id="edit-provider-api-key"
                  type="password"
                  placeholder="输入API密钥"
                  value={editingProvider.apiKey}
                  onChange={(e) => setEditingProvider({...editingProvider, apiKey: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-provider-model">模型</Label>
                <Input
                  id="edit-provider-model"
                  placeholder="模型名称"
                  value={editingProvider.model}
                  onChange={(e) => setEditingProvider({...editingProvider, model: e.target.value})}
                />
              </div>

              {editingProvider.provider === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-provider-base-url">Base URL</Label>
                  <Input
                    id="edit-provider-base-url"
                    placeholder="https://api.example.com/v1"
                    value={editingProvider.baseUrl || ''}
                    onChange={(e) => setEditingProvider({...editingProvider, baseUrl: e.target.value})}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-provider-priority">优先级</Label>
                  <Input
                    id="edit-provider-priority"
                    type="number"
                    min="1"
                    max="100"
                    value={editingProvider.priority}
                    onChange={(e) => setEditingProvider({...editingProvider, priority: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-xs text-gray-500">数字越小优先级越高</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-provider-weight">权重</Label>
                  <Input
                    id="edit-provider-weight"
                    type="number"
                    min="1"
                    max="100"
                    value={editingProvider.weight}
                    onChange={(e) => setEditingProvider({...editingProvider, weight: parseInt(e.target.value) || 1})}
                  />
                  <p className="text-xs text-gray-500">用于加权负载均衡</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-provider-temperature">温度</Label>
                  <Input
                    id="edit-provider-temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editingProvider.temperature}
                    onChange={(e) => setEditingProvider({...editingProvider, temperature: parseFloat(e.target.value) || 0.7})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-provider-max-tokens">最大Tokens</Label>
                  <Input
                    id="edit-provider-max-tokens"
                    type="number"
                    min="100"
                    max="10000"
                    value={editingProvider.maxTokens}
                    onChange={(e) => setEditingProvider({...editingProvider, maxTokens: parseInt(e.target.value) || 1000})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-provider-enabled"
                  checked={editingProvider.enabled}
                  onCheckedChange={(checked) => setEditingProvider({...editingProvider, enabled: checked})}
                />
                <Label htmlFor="edit-provider-enabled">启用此提供商</Label>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Button onClick={updateProvider} className="flex-1">
                保存更改
              </Button>
              <Button 
                onClick={() => setEditingProvider(null)} 
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}