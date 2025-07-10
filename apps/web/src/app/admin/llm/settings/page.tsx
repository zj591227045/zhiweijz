'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ArrowPathIcon as Loader2,
  CogIcon as Settings,
  DocumentArrowDownIcon as Save,
  ExclamationCircleIcon as AlertCircle,
  CheckCircleIcon as CheckCircle
} from '@heroicons/react/24/outline';
import { adminApi } from '@/lib/admin-api-client';
import { toast } from 'sonner';

interface LLMSettings {
  globalDailyTokenLimit: number;
  tokenLimitEnabled: boolean;
  tokenLimitEnforced: boolean;
}

export default function LLMSettingsPage() {
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    globalDailyTokenLimit: 50000,
    tokenLimitEnabled: true,
    tokenLimitEnforced: true,
  });

  // 加载设置
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.get('/token-limit/global');
      const responseData = await response.json();
      if (responseData.success) {
        const data = responseData.data;
        setSettings(data);
        setFormData({
          globalDailyTokenLimit: data.globalDailyTokenLimit,
          tokenLimitEnabled: data.tokenLimitEnabled,
          tokenLimitEnforced: data.tokenLimitEnforced,
        });
      }
    } catch (error) {
      console.error('加载LLM设置失败:', error);
      toast.error('加载LLM设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存全局限额
  const saveGlobalLimit = async () => {
    try {
      setSaving(true);
      const response = await adminApi.post('/token-limit/global/limit', {
        dailyLimit: formData.globalDailyTokenLimit
      });
      const responseData = await response.json();
      
      if (responseData.success) {
        toast.success('全局Token限额设置成功');
        await loadSettings();
      }
    } catch (error) {
      console.error('设置全局限额失败:', error);
      toast.error('设置全局限额失败');
    } finally {
      setSaving(false);
    }
  };

  // 切换功能开关
  const toggleFeature = async (enabled: boolean) => {
    try {
      const response = await adminApi.post('/token-limit/toggle-feature', {
        enabled
      });
      const responseData = await response.json();
      
      if (responseData.success) {
        toast.success(enabled ? 'Token限额功能已启用' : 'Token限额功能已禁用');
        setFormData(prev => ({ ...prev, tokenLimitEnabled: enabled }));
        await loadSettings();
      }
    } catch (error) {
      console.error('切换功能开关失败:', error);
      toast.error('切换功能开关失败');
    }
  };

  // 切换强制执行
  const toggleEnforcement = async (enforced: boolean) => {
    try {
      const response = await adminApi.post('/token-limit/toggle-enforcement', {
        enforced
      });
      const responseData = await response.json();
      
      if (responseData.success) {
        toast.success(enforced ? 'Token限额强制执行已启用' : 'Token限额强制执行已禁用');
        setFormData(prev => ({ ...prev, tokenLimitEnforced: enforced }));
        await loadSettings();
      }
    } catch (error) {
      console.error('切换强制执行失败:', error);
      toast.error('切换强制执行失败');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">LLM Token 限额管理</h1>
      </div>

      {/* 功能状态提示 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center gap-4">
            <span>当前状态:</span>
            <Badge variant={settings?.tokenLimitEnabled ? "default" : "secondary"}>
              功能{settings?.tokenLimitEnabled ? '已启用' : '已禁用'}
            </Badge>
            <Badge variant={settings?.tokenLimitEnforced ? "destructive" : "outline"}>
              {settings?.tokenLimitEnforced ? '强制执行' : '仅统计'}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 基础设置 */}
        <Card>
          <CardHeader>
            <CardTitle>基础配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 功能开关 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-enabled">启用Token限额功能</Label>
                <p className="text-sm text-muted-foreground">
                  控制是否启用Token使用量统计和限制功能
                </p>
              </div>
              <Switch
                checked={formData.tokenLimitEnabled}
                onCheckedChange={toggleFeature}
              />
            </div>

            <Separator />

            {/* 强制执行 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enforcement-enabled">强制执行限额</Label>
                <p className="text-sm text-muted-foreground">
                  启用后将实际阻止超限使用，禁用后仅统计不限制
                </p>
              </div>
              <Switch
                checked={formData.tokenLimitEnforced}
                onCheckedChange={toggleEnforcement}
                disabled={!formData.tokenLimitEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* 全局限额设置 */}
        <Card>
          <CardHeader>
            <CardTitle>全局限额设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="global-limit">每日Token限额</Label>
              <div className="flex gap-2">
                <Input
                  id="global-limit"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.globalDailyTokenLimit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    globalDailyTokenLimit: parseInt(e.target.value) || 0
                  }))}
                  className="flex-1"
                />
                <Button
                  onClick={saveGlobalLimit}
                  disabled={saving || !formData.tokenLimitEnabled}
                  size="sm"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                设置所有用户的默认每日Token使用限额
              </p>
            </div>

            {/* 限额说明 */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">限额优先级说明:</p>
                  <ul className="text-sm space-y-1">
                    <li>• 用户个人限额（在用户管理中设置）</li>
                    <li>• 全局限额（此处设置）</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* 当前设置概览 */}
      <Card>
        <CardHeader>
          <CardTitle>当前配置概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {settings?.globalDailyTokenLimit?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-muted-foreground">全局每日限额</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {settings?.tokenLimitEnabled ? '已启用' : '已禁用'}
              </div>
              <div className="text-sm text-muted-foreground">功能状态</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {settings?.tokenLimitEnforced ? '强制执行' : '仅统计'}
              </div>
              <div className="text-sm text-muted-foreground">执行模式</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 