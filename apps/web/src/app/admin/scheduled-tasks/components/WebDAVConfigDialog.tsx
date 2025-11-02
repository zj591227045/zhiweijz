'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { scheduledTaskApi } from '@/lib/api/scheduled-task-api';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface WebDAVConfigDialogProps {
  taskId: string;
  taskName: string;
  taskType: 'database-backup' | 's3-backup';
  onClose: () => void;
  onSaved: () => void;
}

interface WebDAVConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  basePath: string;
  maxBackups?: number; // 数据库备份专用
  fullBackupDay?: number; // S3备份专用（0-6，0=周日）
  retentionDays?: number; // S3备份专用
}

export default function WebDAVConfigDialog({
  taskId,
  taskName,
  taskType,
  onClose,
  onSaved,
}: WebDAVConfigDialogProps) {
  const [config, setConfig] = useState<WebDAVConfig>({
    enabled: false,
    url: '',
    username: '',
    password: '',
    basePath: '/zhiweijz-backups',
    maxBackups: 7,
    fullBackupDay: 0,
    retentionDays: 7,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, [taskId]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await scheduledTaskApi.getTaskConfig(taskId);
      if (response.data?.webdav) {
        setConfig({
          ...config,
          ...response.data.webdav,
        });
      }
    } catch (error) {
      console.error('加载配置失败:', error);
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 验证必填字段
    if (config.enabled) {
      if (!config.url.trim()) {
        toast.error('请输入WebDAV服务器地址');
        return;
      }
      if (!config.username.trim()) {
        toast.error('请输入用户名');
        return;
      }
      if (!config.password.trim()) {
        toast.error('请输入密码');
        return;
      }
    }

    try {
      setSaving(true);
      await scheduledTaskApi.updateTaskConfig(taskId, {
        webdav: config,
      });
      toast.success('配置保存成功');
      onSaved();
    } catch (error: any) {
      console.error('保存配置失败:', error);
      toast.error(error.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    // 验证必填字段
    if (!config.url.trim() || !config.username.trim() || !config.password.trim()) {
      toast.error('请先填写完整的WebDAV配置');
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      const response = await scheduledTaskApi.testWebDAVConnection({
        url: config.url,
        username: config.username,
        password: config.password,
        basePath: config.basePath,
      });
      setTestResult(response.data);
      if (response.data.success) {
        toast.success('连接测试成功');
      } else {
        toast.error(`连接测试失败: ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('测试连接失败:', error);
      const message = error.message || '测试连接失败';
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  const weekDays = [
    { value: 0, label: '周日' },
    { value: 1, label: '周一' },
    { value: 2, label: '周二' },
    { value: 3, label: '周三' },
    { value: 4, label: '周四' },
    { value: 5, label: '周五' },
    { value: 6, label: '周六' },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {taskName} - WebDAV备份配置
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">加载中...</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className="space-y-4"
          >
            {/* 启用状态 */}
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
              <Label htmlFor="enabled">启用WebDAV备份</Label>
            </div>

            {config.enabled && (
              <>
                {/* WebDAV服务器地址 */}
                <div>
                  <Label htmlFor="url">WebDAV服务器地址 *</Label>
                  <Input
                    id="url"
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    placeholder="https://webdav.example.com"
                    required
                  />
                </div>

                {/* 用户名 */}
                <div>
                  <Label htmlFor="username">用户名 *</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="用户名"
                    required
                  />
                </div>

                {/* 密码 */}
                <div>
                  <Label htmlFor="password">密码 *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="密码"
                    required
                  />
                </div>

                {/* 基础路径 */}
                <div>
                  <Label htmlFor="basePath">基础路径</Label>
                  <Input
                    id="basePath"
                    value={config.basePath}
                    onChange={(e) => setConfig({ ...config, basePath: e.target.value })}
                    placeholder="/zhiweijz-backups"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    备份文件在WebDAV服务器上的存储路径
                  </p>
                </div>

                {/* 数据库备份专用配置 */}
                {taskType === 'database-backup' && (
                  <div>
                    <Label htmlFor="maxBackups">最大备份数量</Label>
                    <Input
                      id="maxBackups"
                      type="number"
                      min="1"
                      max="100"
                      value={config.maxBackups || 7}
                      onChange={(e) =>
                        setConfig({ ...config, maxBackups: parseInt(e.target.value) || 7 })
                      }
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      保留最近N个备份，超出后自动删除最早的备份
                    </p>
                  </div>
                )}

                {/* S3备份专用配置 */}
                {taskType === 's3-backup' && (
                  <>
                    <div>
                      <Label htmlFor="fullBackupDay">每周全备日期</Label>
                      <Select
                        value={config.fullBackupDay?.toString() || '0'}
                        onValueChange={(value) =>
                          setConfig({ ...config, fullBackupDay: parseInt(value) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDays.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-gray-500 mt-1">
                        每周在指定日期执行全量备份，其他时间执行增量备份
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="retentionDays">保留天数</Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        min="1"
                        max="365"
                        value={config.retentionDays || 7}
                        onChange={(e) =>
                          setConfig({ ...config, retentionDays: parseInt(e.target.value) || 7 })
                        }
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        保留最近N天的备份，超出后自动删除过期备份
                      </p>
                    </div>
                  </>
                )}

                {/* 测试连接 */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full"
                  >
                    {testing ? '测试中...' : '测试WebDAV连接'}
                  </Button>
                  {testResult && (
                    <div
                      className={`mt-2 p-3 rounded-md flex items-center gap-2 ${
                        testResult.success
                          ? 'bg-green-50 text-green-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <XCircleIcon className="h-5 w-5" />
                      )}
                      <span className="text-sm">{testResult.message}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* 按钮 */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? '保存中...' : '保存配置'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

