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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowPathIcon as RefreshCcw,
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import PlaceholderHelp from '@/components/admin/PlaceholderHelp';
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
  // 百度云特有配置 - 根据官方文档使用 API Key 和 Secret Key
  secretKey?: string;
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

interface SmartAccountingConfig {
  multimodalPrompt: string;
  // 新增的三个提示词字段
  relevanceCheckPrompt: string; // 记账相关性判断提示词
  smartAccountingPrompt: string; // 智能记账主要提示词
  imageAnalysisPrompt: string; // 图片分析提示词
}

interface MultimodalAIConfig {
  speech: SpeechConfig;
  vision: VisionConfig;
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
      secretKey: '',
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
    smartAccounting: {
      multimodalPrompt:
        '分析图片中的记账信息，提取：1.微信/支付宝付款记录：金额、收款人、备注，并从收款人分析记账类别；2.订单截图（美团/淘宝/京东/外卖/抖音）：内容、金额、时间、收件人；3.发票/票据：内容、分类、金额、时间。返回JSON格式。',
      relevanceCheckPrompt: `你是一个专业的财务助手。请判断以下用户描述是否与记账相关。

判断标准：
1. 包含金额信息（必须）
2. 包含记账流水明细（必须）
3. 可能包含日期信息（可选）
4. 可能包含预算信息（可选）

如果描述中包含明确的金额和记账内容（如购买、支付、收入、转账等），则判定为与记账相关。
如果描述中只是询问、闲聊或其他非记账相关内容，则判定为与记账无关。

请只回答 "相关" 或 "无关"，不要有其他文字。

用户描述: {{description}}`,
      smartAccountingPrompt: `你是专业财务助手，从用户描述中提取记账信息。

分类列表：
{{categories}}

{{budgets}}

从描述中提取：
1. 金额（仅数字）
2. 日期（未提及用今日）
3. 分类（匹配上述分类）
4. 预算（若提及预算/人名则匹配）
5. 备注（简短描述）

返回JSON格式：
{
  "amount": 数字,
  "date": "YYYY-MM-DD",
  "categoryId": "分类ID",
  "categoryName": "分类名",
  "type": "EXPENSE/INCOME",
  "budgetName": "预算名(可选)",
  "confidence": 0-1小数,
  "note": "备注"
}

用户描述: {{description}}
当前日期: {{currentDate}}

仅返回JSON，无其他文字。`,
      imageAnalysisPrompt: `请分析这张图片中的记账信息。

请从图片中识别以下信息：
1. 记账金额：准确的数字金额
2. 记账时间：日期和时间信息
3. 记账对象：商家名称、收款人或付款人
4. 记账类型：收入、支出、转账等
5. 记账内容：商品名称、服务描述或记账备注
6. 其他信息：订单号、记账单号等

请以JSON格式返回结果：
{
  "amount": "金额数字",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "merchant": "商家/收款人名称",
  "type": "EXPENSE/INCOME/TRANSFER",
  "description": "记账描述",
  "category": "推测的记账分类",
  "confidence": 0.0-1.0,
  "additional_info": {
    "order_id": "订单号",
    "transaction_id": "记账号"
  }
}

如果图片中没有明确的记账信息，请返回 {"error": "未识别到记账信息"}。`,
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
          setTestResults((prev) => ({
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="speech" className="flex items-center gap-2">
            <MicrophoneIcon className="w-4 h-4" />
            语音识别
          </TabsTrigger>
          <TabsTrigger value="vision" className="flex items-center gap-2">
            <EyeIcon className="w-4 h-4" />
            视觉识别
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
              <CardDescription>配置语音转文本服务，支持多种音频格式</CardDescription>
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
                      setConfig((prev) => ({
                        ...prev,
                        speech: { ...prev.speech, enabled: checked },
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
                        setConfig((prev) => {
                          const newConfig = {
                            ...prev,
                            speech: { ...prev.speech, provider: value },
                          };

                          // 根据提供商设置默认值
                          if (value === 'baidu') {
                            newConfig.speech.model = 'default';
                            newConfig.speech.baseUrl = 'https://vop.baidu.com/server_api';
                          } else if (value === 'siliconflow') {
                            newConfig.speech.model = 'FunAudioLLM/SenseVoiceSmall';
                            newConfig.speech.baseUrl = 'https://api.siliconflow.cn/v1';
                          }

                          return newConfig;
                        })
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
                        setConfig((prev) => ({
                          ...prev,
                          speech: { ...prev.speech, model: e.target.value },
                        }))
                      }
                      placeholder={
                        config.speech.provider === 'baidu'
                          ? '请输入模型名称，如：default'
                          : '请输入模型名称，如：FunAudioLLM/SenseVoiceSmall'
                      }
                    />
                    <p className="text-sm text-gray-500">
                      {config.speech.provider === 'baidu'
                        ? '百度云模型：default (通用普通话)、pro (极速版专业)、longform (长语音/远场)'
                        : '常用模型：FunAudioLLM/SenseVoiceSmall、whisper-1、speech-to-text-v1'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speech-api-key">
                    {config.speech.provider === 'baidu' ? 'API Key *' : 'API密钥'}
                  </Label>
                  <Input
                    id="speech-api-key"
                    type="password"
                    value={config.speech.apiKey}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        speech: { ...prev.speech, apiKey: e.target.value },
                      }))
                    }
                    placeholder={
                      config.speech.provider === 'baidu'
                        ? '请输入百度云应用的 API Key'
                        : '输入API密钥'
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="speech-base-url">API地址</Label>
                  <Input
                    id="speech-base-url"
                    value={config.speech.baseUrl}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        speech: { ...prev.speech, baseUrl: e.target.value },
                      }))
                    }
                    placeholder={
                      config.speech.provider === 'baidu'
                        ? 'https://vop.baidu.com/server_api'
                        : 'https://api.siliconflow.cn/v1'
                    }
                    disabled={config.speech.provider === 'baidu'}
                  />
                  {config.speech.provider === 'baidu' && (
                    <p className="text-sm text-gray-500">
                      百度云语音识别使用固定API地址：https://vop.baidu.com/server_api
                    </p>
                  )}
                </div>

                {/* 百度云特有配置 */}
                {config.speech.provider === 'baidu' && (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-blue-800 mb-2">
                        📋 百度智能云语音识别配置指南
                      </h5>
                      <div className="text-sm text-blue-700 space-y-3">
                        <div>
                          <p className="font-medium">🔑 1. 获取API凭证</p>
                          <ul className="ml-4 space-y-1">
                            <li>
                              • 访问{' '}
                              <a
                                href="https://console.bce.baidu.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-900"
                              >
                                百度智能云控制台
                              </a>
                            </li>
                            <li>• 选择"产品服务" → "人工智能" → "语音技术"</li>
                            <li>• 创建"语音识别"应用</li>
                            <li>
                              • 在应用详情页获取 <strong>API Key</strong> 和{' '}
                              <strong>Secret Key</strong>
                            </li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">⚙️ 2. 技术规格</p>
                          <ul className="ml-4 space-y-1">
                            <li>
                              • <strong>音频格式：</strong>wav, mp3, pcm, flac, aac, m4a, amr
                            </li>
                            <li>
                              • <strong>文件限制：</strong>最大 60MB，时长 ≤ 60秒
                            </li>
                            <li>
                              • <strong>采样率：</strong>8000Hz 或 16000Hz (推荐16000Hz)
                            </li>
                            <li>
                              • <strong>声道数：</strong>仅支持单声道 (mono)
                            </li>
                            <li>
                              • <strong>语言支持：</strong>普通话、英语、粤语、四川话等
                            </li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">🎯 3. 模型类型</p>
                          <ul className="ml-4 space-y-1">
                            <li>
                              • <strong>default：</strong>通用普通话模型，识别准确率高
                            </li>
                            <li>
                              • <strong>pro：</strong>极速版专业模型，响应速度快 (500ms内)
                            </li>
                            <li>
                              • <strong>longform：</strong>长语音/远场模型，适合会议录音
                            </li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium">💰 4. 计费说明</p>
                          <ul className="ml-4 space-y-1">
                            <li>• 按实际调用次数计费，无最低消费</li>
                            <li>• 新用户享有免费额度</li>
                            <li>
                              • 详细价格请查看{' '}
                              <a
                                href="https://cloud.baidu.com/doc/SPEECH/s/price"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-blue-900"
                              >
                                官方价格文档
                              </a>
                            </li>
                          </ul>
                        </div>
                        <div className="bg-blue-100 rounded p-2 mt-2">
                          <p className="font-medium text-blue-900">💡 温馨提示</p>
                          <p className="text-blue-800">
                            首次使用建议选择 <code className="bg-white px-1 rounded">default</code>{' '}
                            模型进行测试，确认效果后再根据业务需求选择合适的模型。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="speech-secret-key">Secret Key *</Label>
                      <Input
                        id="speech-secret-key"
                        type="password"
                        value={config.speech.secretKey || ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            speech: { ...prev.speech, secretKey: e.target.value },
                          }))
                        }
                        placeholder="请输入百度云应用的 Secret Key"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        💡 在百度智能云控制台 → 产品服务 → 语音技术 → 应用管理中获取
                      </p>
                    </div>
                  </>
                )}
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
                    disabled={
                      !config.speech.enabled ||
                      (config.speech.provider === 'baidu'
                        ? !config.speech.apiKey || !config.speech.secretKey
                        : !config.speech.apiKey)
                    }
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    测试连接
                  </Button>
                </div>

                {testResults.speech && (
                  <div
                    className={`p-4 rounded-lg border ${
                      testResults.speech.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResults.speech.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span
                        className={`font-medium ${
                          testResults.speech.success ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
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
              <CardDescription>配置图片识别服务，支持多种图片格式</CardDescription>
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
                      setConfig((prev) => ({
                        ...prev,
                        vision: { ...prev.vision, enabled: checked },
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
                        setConfig((prev) => ({
                          ...prev,
                          vision: { ...prev.vision, provider: value },
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
                        setConfig((prev) => ({
                          ...prev,
                          vision: { ...prev.vision, model: e.target.value },
                        }))
                      }
                      placeholder="请输入模型名称，如：Qwen/Qwen2.5-VL-72B-Instruct"
                    />
                    <p className="text-sm text-gray-500">
                      常用模型：Qwen/Qwen2.5-VL-72B-Instruct、Pro/Qwen/Qwen2.5-VL-7B-Instruct、claude-3-vision
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
                      setConfig((prev) => ({
                        ...prev,
                        vision: { ...prev.vision, apiKey: e.target.value },
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
                      setConfig((prev) => ({
                        ...prev,
                        vision: { ...prev.vision, baseUrl: e.target.value },
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
                      setConfig((prev) => ({
                        ...prev,
                        vision: { ...prev.vision, detailLevel: value },
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
                  <div
                    className={`p-4 rounded-lg border ${
                      testResults.vision.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {testResults.vision.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span
                        className={`font-medium ${
                          testResults.vision.success ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {testResults.vision.message}
                      </span>
                    </div>
                  </div>
                )}
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
              <CardDescription>配置智能记账中的多模态AI功能和提示词</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 提示词配置 */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">AI提示词配置</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    配置不同场景下的AI提示词，使用变量占位符实现动态内容替换
                  </p>
                </div>

                {/* 1. 记账相关性判断提示词 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="relevance-check-prompt">记账相关性判断提示词</Label>
                      <Badge variant="outline">用于过滤无关内容</Badge>
                    </div>
                    <PlaceholderHelp type="relevanceCheck" />
                  </div>
                  <textarea
                    id="relevance-check-prompt"
                    className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                    rows={8}
                    value={config.smartAccounting.relevanceCheckPrompt}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smartAccounting: {
                          ...prev.smartAccounting,
                          relevanceCheckPrompt: e.target.value,
                        },
                      }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>变量占位符：</strong>
                    </p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>
                        <code>{'{{description}}'}</code> - 用户输入的描述内容
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 2. 智能记账主要提示词 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="smart-accounting-prompt">智能记账分析提示词</Label>
                      <Badge variant="outline">用于提取记账信息</Badge>
                    </div>
                    <PlaceholderHelp type="smartAccounting" />
                  </div>
                  <textarea
                    id="smart-accounting-prompt"
                    className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                    rows={12}
                    value={config.smartAccounting.smartAccountingPrompt}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smartAccounting: {
                          ...prev.smartAccounting,
                          smartAccountingPrompt: e.target.value,
                        },
                      }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>变量占位符：</strong>
                    </p>
                    <ul className="list-disc ml-4 mt-1">
                      <li>
                        <code>{'{{categories}}'}</code> - 动态插入的分类列表
                      </li>
                      <li>
                        <code>{'{{budgets}}'}</code> - 动态插入的预算列表
                      </li>
                      <li>
                        <code>{'{{description}}'}</code> - 用户输入的记账描述
                      </li>
                      <li>
                        <code>{'{{currentDate}}'}</code> - 当前日期
                      </li>
                    </ul>
                  </div>
                </div>

                {/* 3. 图片分析提示词 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="image-analysis-prompt">图片分析提示词</Label>
                      <Badge variant="outline">用于图片信息提取</Badge>
                    </div>
                    <PlaceholderHelp type="imageAnalysis" />
                  </div>
                  <textarea
                    id="image-analysis-prompt"
                    className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                    rows={10}
                    value={config.smartAccounting.imageAnalysisPrompt}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smartAccounting: {
                          ...prev.smartAccounting,
                          imageAnalysisPrompt: e.target.value,
                        },
                      }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>说明：</strong>
                      此提示词用于从图片中提取记账信息，支持微信/支付宝付款记录、电商订单截图、发票票据等场景。
                    </p>
                  </div>
                </div>

                {/* 4. 多模态兼容提示词 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="multimodal-prompt">多模态兼容提示词</Label>
                    <Badge variant="outline">向后兼容</Badge>
                  </div>
                  <textarea
                    id="multimodal-prompt"
                    className="w-full p-3 border rounded-md resize-none font-mono text-sm"
                    rows={4}
                    value={config.smartAccounting.multimodalPrompt}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        smartAccounting: {
                          ...prev.smartAccounting,
                          multimodalPrompt: e.target.value,
                        },
                      }))
                    }
                  />
                  <div className="text-xs text-muted-foreground">
                    <p>
                      <strong>说明：</strong>
                      这个提示词主要用于向后兼容，当专门的图片分析提示词为空时使用此提示词。
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* 占位符说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-800 mb-2">📝 变量占位符说明</h5>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>
                    <strong>占位符格式：</strong>使用双花括号包围变量名，如{' '}
                    <code className="bg-blue-100 px-1 rounded">{'{{variableName}}'}</code>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <p className="font-medium">记账相关性判断：</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        <li>
                          • <code>{'{{description}}'}</code> - 用户描述内容
                        </li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">智能记账分析：</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        <li>
                          • <code>{'{{categories}}'}</code> - 账本分类列表
                        </li>
                        <li>
                          • <code>{'{{budgets}}'}</code> - 预算列表
                        </li>
                        <li>
                          • <code>{'{{description}}'}</code> - 记账描述
                        </li>
                        <li>
                          • <code>{'{{currentDate}}'}</code> - 当前日期
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-blue-100 rounded p-2 mt-2">
                    <p className="font-medium text-blue-900">💡 使用建议</p>
                    <ul className="text-blue-800 text-xs mt-1 space-y-1">
                      <li>• 提示词应简洁明了，避免过多无关信息以减少token消耗</li>
                      <li>• 使用明确的输出格式要求（如JSON），便于系统解析</li>
                      <li>• 针对不同场景优化提示词内容，提高识别准确率</li>
                      <li>• 定期测试和优化提示词效果</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
