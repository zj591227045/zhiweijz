'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  SignalIcon as Activity, 
  CogIcon as Settings, 
  BeakerIcon as TestTube, 
  DocumentArrowDownIcon as Save, 
  ExclamationCircleIcon as AlertCircle, 
  CheckCircleIcon,
  ArrowPathIcon as RefreshCcw 
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

interface LLMConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxTokens: number;
}

interface TestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  details?: any;
}

export default function LLMConfigPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // Web端完整功能
  const { isAuthenticated, token } = useAdminAuth();
  const [config, setConfig] = useState<LLMConfig>({
    enabled: false,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: '',
    baseUrl: '',
    temperature: 0.7,
    maxTokens: 1000
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // 预定义的提供商和模型选项
  const providers = [
    {
      id: 'openai',
      name: 'OpenAI',
      models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
      defaultBaseUrl: 'https://api.openai.com/v1'
    },
    {
      id: 'siliconflow',
      name: '硅基流动',
      models: ['Qwen/Qwen3-32B', 'Qwen/Qwen2.5-32B-Instruct', 'Qwen/Qwen3-14B', 'Qwen/Qwen3-8B'],
      defaultBaseUrl: 'https://api.siliconflow.cn/v1'
    },
    {
      id: 'custom',
      name: '自定义',
      models: [],
      defaultBaseUrl: ''
    }
  ];

  const currentProvider = providers.find(p => p.id === config.provider);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.SYSTEM_CONFIG_LLM);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data.configs);
        }
      } else {
        toast.error('获取LLM配置失败');
      }
    } catch (error) {
      console.error('获取LLM配置错误:', error);
      toast.error('获取LLM配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await adminApi.put(ADMIN_API_ENDPOINTS.SYSTEM_CONFIG_LLM, config);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('LLM配置保存成功');
          setTestResult(null); // 清空测试结果
        } else {
          toast.error(data.message || '保存LLM配置失败');
        }
      } else {
        toast.error('保存LLM配置失败');
      }
    } catch (error) {
      console.error('保存LLM配置错误:', error);
      toast.error('保存LLM配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 测试连接
  const testConnection = async () => {
    if (!config.provider || !config.model) {
      toast.error('请先选择提供商和模型');
      return;
    }

    if (!config.apiKey) {
      toast.error('请先设置API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await adminApi.post(`${ADMIN_API_ENDPOINTS.SYSTEM_CONFIG_LLM}/test`, {
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestResult(data.data);
          if (data.data.success) {
            toast.success('LLM连接测试成功');
          } else {
            toast.error('LLM连接测试失败');
          }
        } else {
          setTestResult({
            success: false,
            message: data.message || '测试失败'
          });
          toast.error(data.message || '测试失败');
        }
      } else {
        setTestResult({
          success: false,
          message: '网络请求失败'
        });
        toast.error('测试请求失败');
      }
    } catch (error) {
      console.error('测试LLM连接错误:', error);
      setTestResult({
        success: false,
        message: '测试请求异常'
      });
      toast.error('测试请求异常');
    } finally {
      setTesting(false);
    }
  };

  // 处理提供商变更
  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setConfig(prev => ({
        ...prev,
        provider: providerId,
        model: provider.models[0] || '',
        baseUrl: provider.defaultBaseUrl
      }));
      setTestResult(null);
    }
  };

  useEffect(() => {
    // 只在认证完成且有token时才执行API请求
    if (isAuthenticated && token) {
      console.log('🔍 [LLMConfig] Loading config, authenticated:', isAuthenticated, 'hasToken:', !!token);
      loadConfig();
    }
  }, [isAuthenticated, token]);

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载LLM配置...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">加载配置中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LLM 服务管理</h1>
          <p className="text-gray-600">
            配置全局的大语言模型服务，为用户提供AI助手功能
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadConfig} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            保存配置
          </Button>
        </div>
      </div>

      {/* 服务状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            服务状态
          </CardTitle>
          <CardDescription>
            控制LLM服务的全局开关状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="service-enabled">启用LLM服务</Label>
              <p className="text-sm text-gray-600">
                启用后，用户可以使用全局配置的LLM服务
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="service-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  setConfig(prev => ({ ...prev, enabled: checked }))
                }
              />
              <Badge variant={config.enabled ? "default" : "secondary"}>
                {config.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LLM配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            LLM配置
          </CardTitle>
          <CardDescription>
            配置LLM服务提供商和相关参数
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 提供商选择 */}
          <div className="space-y-2">
            <Label>服务提供商</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    config.provider === provider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-600">
                    {provider.id === 'openai' && '官方OpenAI服务'}
                    {provider.id === 'siliconflow' && '国内高性价比选择'}
                    {provider.id === 'custom' && '自定义API提供商'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 模型选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">模型</Label>
              {currentProvider && currentProvider.models.length > 0 ? (
                <select
                  id="model"
                  className="w-full p-2 border rounded-md"
                  value={config.model}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                >
                  {currentProvider.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="model"
                  placeholder="输入模型名称"
                  value={config.model}
                  onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-url">Base URL</Label>
              <Input
                id="base-url"
                placeholder="https://api.example.com/v1"
                value={config.baseUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="输入API密钥"
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            />
            <p className="text-sm text-gray-600">
              API密钥将安全存储在服务器端，不会在前端显示
            </p>
          </div>

          <Separator />

          {/* 参数配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">
                温度参数: {config.temperature}
              </Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <p className="text-xs text-gray-600">
                控制回答的随机性，0表示确定性，2表示高随机性
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">最大Token数</Label>
              <Input
                id="max-tokens"
                type="number"
                min="1"
                max="100000"
                value={config.maxTokens}
                onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
              />
              <p className="text-xs text-gray-600">
                限制AI回答的最大长度
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 连接测试 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            连接测试
          </CardTitle>
          <CardDescription>
            测试当前配置是否能正常连接到LLM服务
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testConnection}
            disabled={testing || !config.provider || !config.model || !config.apiKey}
            className="w-full md:w-auto"
          >
            {testing ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            {testing ? '测试中...' : '测试连接'}
          </Button>

          {testResult && (
            <div className={`border rounded-lg p-4 ${
              testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResult.success ? '连接成功' : '连接失败'}
                </span>
              </div>
              <p className={`text-sm ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
              {testResult.responseTime && (
                <p className="text-xs text-gray-600 mt-1">
                  响应时间: {testResult.responseTime}ms
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 