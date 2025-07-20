'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SignalIcon as Activity,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon as RefreshCcw,
} from '@heroicons/react/24/outline';
import { aiService } from '@/lib/api/ai-service';
import { toast } from 'sonner';

interface GlobalLLMConfig {
  enabled: boolean;
  provider?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export default function LLMServiceStatus() {
  const [config, setConfig] = useState<GlobalLLMConfig>({ enabled: false });
  const [loading, setLoading] = useState(true);

  const loadGlobalConfig = async () => {
    setLoading(true);
    try {
      const globalConfig = await aiService.getGlobalLLMConfig();
      setConfig(globalConfig);
    } catch (error) {
      console.error('获取全局LLM配置错误:', error);
      toast.error('获取LLM服务状态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalConfig();
  }, []);

  const getProviderDisplayName = (provider?: string) => {
    const providers: { [key: string]: string } = {
      openai: 'OpenAI',
      siliconflow: '硅基流动',
      custom: '自定义',
    };
    return provider ? providers[provider] || provider : '未知';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">加载服务状态...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          LLM 服务状态
        </CardTitle>
        <CardDescription>查看系统管理员配置的全局LLM服务状态</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 服务状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {config.enabled ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">全局LLM服务</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? '已启用' : '未启用'}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadGlobalConfig} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 配置详情 */}
        {config.enabled && (
          <div className="space-y-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">服务提供商:</span>
                <p className="font-medium">{getProviderDisplayName(config.provider)}</p>
              </div>
              <div>
                <span className="text-gray-600">模型:</span>
                <p className="font-medium">{config.model || '未配置'}</p>
              </div>
              {config.baseUrl && (
                <div className="col-span-2">
                  <span className="text-gray-600">服务地址:</span>
                  <p className="font-medium text-xs text-gray-800 break-all">{config.baseUrl}</p>
                </div>
              )}
              {config.temperature !== undefined && (
                <div>
                  <span className="text-gray-600">温度:</span>
                  <p className="font-medium">{config.temperature}</p>
                </div>
              )}
              {config.maxTokens !== undefined && (
                <div>
                  <span className="text-gray-600">最大Token:</span>
                  <p className="font-medium">{config.maxTokens}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 说明文字 */}
        <div className="text-sm text-gray-500 pt-3 border-t">
          {config.enabled ? (
            <p>✅ 全局LLM服务已启用，您可以在账本中使用AI助手功能。</p>
          ) : (
            <p>❌ 全局LLM服务未启用，请联系管理员配置LLM服务或使用个人LLM设置。</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
