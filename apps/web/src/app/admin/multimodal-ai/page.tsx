'use client';

// 强制动态渲染，避免静态生成时的模块解析问题
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MicrophoneIcon,
  EyeIcon,
  CogIcon as Settings, 
  BeakerIcon as TestTube, 
  DocumentArrowDownIcon as Save, 
  ExclamationCircleIcon as AlertCircle, 
  CheckCircleIcon,
  ArrowPathIcon as RefreshCcw 
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { adminApi } from '@/lib/admin-api-client';

interface SpeechConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxFileSize: number;
  allowedFormats: string[];
  timeout: number;
}

interface VisionConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  maxFileSize: number;
  allowedFormats: string[];
  detailLevel: 'low' | 'high' | 'auto';
  timeout: number;
}

interface GeneralConfig {
  enabled: boolean;
  dailyLimit: number;
  userLimit: number;
  retryCount: number;
  cacheEnabled: boolean;
  cacheTtl: number;
}

interface SmartAccountingConfig {
  visionEnabled: boolean;
  speechEnabled: boolean;
  multimodalPrompt: string;
}

interface MultimodalAIConfig {
  speech: SpeechConfig;
  vision: VisionConfig;
  general: GeneralConfig;
  smartAccounting: SmartAccountingConfig;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

interface ProviderOption {
  id: string;
  name: string;
  baseUrl: string;
}

export default function MultimodalAIConfigPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  const { isAuthenticated, token } = useAdminAuth();
  const [config, setConfig] = useState<MultimodalAIConfig>({
    speech: {
      enabled: false,
      provider: 'siliconflow',
      model: 'FunAudioLLM/SenseVoiceSmall',
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1',
      maxFileSize: 10485760,
      allowedFormats: ['mp3', 'wav', 'm4a', 'flac', 'aac'],
      timeout: 60,
    },
    vision: {
      enabled: false,
      provider: 'siliconflow',
      model: 'Qwen/Qwen2.5-VL-72B-Instruct',
      apiKey: '',
      baseUrl: 'https://api.siliconflow.cn/v1',
      maxFileSize: 10485760,
      allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'],
      detailLevel: 'high',
      timeout: 60,
    },
    general: {
      enabled: false,
      dailyLimit: 100,
      userLimit: 10,
      retryCount: 3,
      cacheEnabled: true,
      cacheTtl: 3600,
    },
    smartAccounting: {
      visionEnabled: false,
      speechEnabled: false,
      multimodalPrompt: '请分析这个图片/语音内容，提取其中的记账信息，包括金额、类别、时间、备注等。',
    },
  });

  const [models, setModels] = useState<{
    providers: ProviderOption[];
  }>({
    providers: [],
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState<{
    speech: TestResult | null;
    vision: TestResult | null;
  }>({
    speech: null,
    vision: null,
  });

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const [configResponse, modelsResponse] = await Promise.all([
        adminApi.get('/api/admin/multimodal-ai/config'),
        adminApi.get('/api/admin/multimodal-ai/models'),
      ]);

      if (configResponse.ok) {
        const data = await configResponse.json();
        if (data.success) {
          setConfig(data.data);
        }
      } else {
        toast.error('获取多模态AI配置失败');
      }

      if (modelsResponse.ok) {
        const data = await modelsResponse.json();
        if (data.success) {
          setModels(data.data);
        }
      }
    } catch (error) {
      console.error('获取配置错误:', error);
      toast.error('获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await adminApi.put('/api/admin/multimodal-ai/config', config);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('多模态AI配置保存成功');
        } else {
          toast.error(data.message || '保存配置失败');
        }
      } else {
        toast.error('保存配置失败');
      }
    } catch (error) {
      console.error('保存配置错误:', error);
      toast.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 测试连接
  const testConnection = async (type: 'speech' | 'vision') => {
    try {
      const testConfig = type === 'speech' ? config.speech : config.vision;
      const response = await adminApi.post(`/api/admin/multimodal-ai/${type}/test`, testConfig);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestResults(prev => ({
            ...prev,
            [type]: data.data,
          }));
          toast.success(`${type === 'speech' ? '语音识别' : '视觉识别'}连接测试成功`);
        } else {
          toast.error(data.message || '测试失败');
        }
      } else {
        toast.error('测试连接失败');
      }
    } catch (error) {
      console.error('测试连接错误:', error);
      toast.error('测试连接失败');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadConfig();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <div>请先登录</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">多模态AI配置</h1>
          <p className="text-muted-foreground">配置语音识别和视觉识别功能</p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? '保存中...' : '保存配置'}
        </Button>
      </div>

      <Tabs defaultValue="speech" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="speech" className="flex items-center gap-2">
            <MicrophoneIcon className="w-4 h-4" />
            语音识别
          </TabsTrigger>
          <TabsTrigger value="vision" className="flex items-center gap-2">
            <EyeIcon className="w-4 h-4" />
            视觉识别
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            通用设置
          </TabsTrigger>
          <TabsTrigger value="smart-accounting" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            智能记账
          </TabsTrigger>
        </TabsList>

        {/* 语音识别配置 */}
        <TabsContent value="speech">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MicrophoneIcon className="w-5 h-5" />
                语音识别配置
              </CardTitle>
              <CardDescription>
                配置语音转文本服务，支持多种音频格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基础配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="speech-enabled">启用语音识别</Label>
                  <Switch
                    id="speech-enabled"
                    checked={config.speech.enabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        speech: { ...prev.speech, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="speech-provider">服务提供商</Label>
                    <Select
                      value={config.speech.provider}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          speech: { ...prev.speech, provider: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择提供商" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speech-model">模型</Label>
                    <Input
                      id="speech-model"
                      value={config.speech.model}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          speech: { ...prev.speech, model: e.target.value }
                        }))
                      }
                      placeholder="请输入模型名称，如：FunAudioLLM/SenseVoiceSmall"
                    />
                    <p className="text-sm text-gray-500">
                      常用模型：FunAudioLLM/SenseVoiceSmall、whisper-1、speech-to-text-v1
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speech-api-key">API密钥</Label>
                  <Input
                    id="speech-api-key"
                    type="password"
                    value={config.speech.apiKey}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        speech: { ...prev.speech, apiKey: e.target.value }
                      }))
                    }
                    placeholder="输入API密钥"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speech-base-url">API地址</Label>
                  <Input
                    id="speech-base-url"
                    value={config.speech.baseUrl}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        speech: { ...prev.speech, baseUrl: e.target.value }
                      }))
                    }
                    placeholder="https://api.siliconflow.cn/v1"
                  />
                </div>
              </div>

              <Separator />

              {/* 测试连接 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">连接测试</h4>
                    <p className="text-sm text-muted-foreground">测试语音识别服务连接</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testConnection('speech')}
                    disabled={!config.speech.enabled || !config.speech.apiKey}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    测试连接
                  </Button>
                </div>

                {testResults.speech && (
                  <div className={`p-4 rounded-lg border ${
                    testResults.speech.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {testResults.speech.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        testResults.speech.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResults.speech.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 视觉识别配置 */}
        <TabsContent value="vision">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeIcon className="w-5 h-5" />
                视觉识别配置
              </CardTitle>
              <CardDescription>
                配置图片识别服务，支持多种图片格式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 基础配置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vision-enabled">启用视觉识别</Label>
                  <Switch
                    id="vision-enabled"
                    checked={config.vision.enabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        vision: { ...prev.vision, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vision-provider">服务提供商</Label>
                    <Select
                      value={config.vision.provider}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          vision: { ...prev.vision, provider: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择提供商" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vision-model">模型</Label>
                    <Input
                      id="vision-model"
                      value={config.vision.model}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          vision: { ...prev.vision, model: e.target.value }
                        }))
                      }
                      placeholder="请输入模型名称，如：Qwen/Qwen2.5-VL-72B-Instruct"
                    />
                    <p className="text-sm text-gray-500">
                      常用模型：Qwen/Qwen2.5-VL-72B-Instruct、gpt-4-vision-preview、claude-3-vision
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vision-api-key">API密钥</Label>
                  <Input
                    id="vision-api-key"
                    type="password"
                    value={config.vision.apiKey}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        vision: { ...prev.vision, apiKey: e.target.value }
                      }))
                    }
                    placeholder="输入API密钥"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vision-base-url">API地址</Label>
                  <Input
                    id="vision-base-url"
                    value={config.vision.baseUrl}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        vision: { ...prev.vision, baseUrl: e.target.value }
                      }))
                    }
                    placeholder="https://api.siliconflow.cn/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vision-detail-level">识别细节级别</Label>
                  <Select
                    value={config.vision.detailLevel}
                    onValueChange={(value: 'low' | 'high' | 'auto') =>
                      setConfig(prev => ({
                        ...prev,
                        vision: { ...prev.vision, detailLevel: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择细节级别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">低 (快速)</SelectItem>
                      <SelectItem value="high">高 (详细)</SelectItem>
                      <SelectItem value="auto">自动</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* 测试连接 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">连接测试</h4>
                    <p className="text-sm text-muted-foreground">测试视觉识别服务连接</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => testConnection('vision')}
                    disabled={!config.vision.enabled || !config.vision.apiKey}
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    测试连接
                  </Button>
                </div>

                {testResults.vision && (
                  <div className={`p-4 rounded-lg border ${
                    testResults.vision.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {testResults.vision.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={`font-medium ${
                        testResults.vision.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResults.vision.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通用设置 */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                通用设置
              </CardTitle>
              <CardDescription>
                配置多模态AI的通用参数和限制
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="general-enabled">启用多模态AI</Label>
                  <Switch
                    id="general-enabled"
                    checked={config.general.enabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, enabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="daily-limit">每日调用限制</Label>
                    <Input
                      id="daily-limit"
                      type="number"
                      value={config.general.dailyLimit}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          general: { ...prev.general, dailyLimit: parseInt(e.target.value) || 0 }
                        }))
                      }
                      placeholder="100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="user-limit">每用户每日限制</Label>
                    <Input
                      id="user-limit"
                      type="number"
                      value={config.general.userLimit}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          general: { ...prev.general, userLimit: parseInt(e.target.value) || 0 }
                        }))
                      }
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="retry-count">失败重试次数</Label>
                    <Input
                      id="retry-count"
                      type="number"
                      value={config.general.retryCount}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          general: { ...prev.general, retryCount: parseInt(e.target.value) || 0 }
                        }))
                      }
                      placeholder="3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cache-ttl">缓存时间(秒)</Label>
                    <Input
                      id="cache-ttl"
                      type="number"
                      value={config.general.cacheTtl}
                      onChange={(e) =>
                        setConfig(prev => ({
                          ...prev,
                          general: { ...prev.general, cacheTtl: parseInt(e.target.value) || 0 }
                        }))
                      }
                      placeholder="3600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="cache-enabled">启用结果缓存</Label>
                  <Switch
                    id="cache-enabled"
                    checked={config.general.cacheEnabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        general: { ...prev.general, cacheEnabled: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 智能记账设置 */}
        <TabsContent value="smart-accounting">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                智能记账设置
              </CardTitle>
              <CardDescription>
                配置智能记账中的多模态AI功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="smart-speech-enabled">启用语音记账</Label>
                  <Switch
                    id="smart-speech-enabled"
                    checked={config.smartAccounting.speechEnabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        smartAccounting: { ...prev.smartAccounting, speechEnabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="smart-vision-enabled">启用图片记账</Label>
                  <Switch
                    id="smart-vision-enabled"
                    checked={config.smartAccounting.visionEnabled}
                    onCheckedChange={(checked) =>
                      setConfig(prev => ({
                        ...prev,
                        smartAccounting: { ...prev.smartAccounting, visionEnabled: checked }
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="multimodal-prompt">多模态提示词</Label>
                  <textarea
                    id="multimodal-prompt"
                    className="w-full p-3 border rounded-md resize-none"
                    rows={4}
                    value={config.smartAccounting.multimodalPrompt}
                    onChange={(e) =>
                      setConfig(prev => ({
                        ...prev,
                        smartAccounting: { ...prev.smartAccounting, multimodalPrompt: e.target.value }
                      }))
                    }
                    placeholder="请分析这个图片/语音内容，提取其中的记账信息..."
                  />
                  <p className="text-sm text-muted-foreground">
                    这个提示词将用于指导AI分析图片和语音内容，提取记账相关信息
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
