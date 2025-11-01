'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { scheduledTaskApi, type ScheduledTask } from '@/lib/api/scheduled-task-api';
import { toast } from 'sonner';

interface TaskFormDialogProps {
  task: ScheduledTask | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskFormDialog({ task, onClose, onSaved }: TaskFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scriptType: 'shell' as 'shell' | 'sql' | 'node',
    scriptPath: '',
    cronExpression: '',
    isEnabled: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description || '',
        scriptType: task.scriptType,
        scriptPath: task.scriptPath,
        cronExpression: task.cronExpression,
        isEnabled: task.isEnabled,
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!formData.name.trim()) {
      toast.error('请输入任务名称');
      return;
    }
    if (!formData.scriptPath.trim()) {
      toast.error('请输入脚本路径');
      return;
    }
    if (!formData.cronExpression.trim()) {
      toast.error('请输入Cron表达式');
      return;
    }

    try {
      setSaving(true);
      if (task) {
        await scheduledTaskApi.updateTask(task.id, formData);
        toast.success('任务更新成功');
      } else {
        await scheduledTaskApi.createTask(formData);
        toast.success('任务创建成功');
      }
      onSaved();
    } catch (error: any) {
      console.error('保存任务失败:', error);
      toast.error(error.message || '保存任务失败');
    } finally {
      setSaving(false);
    }
  };

  // Cron表达式示例
  const cronExamples = [
    { label: '每分钟', value: '* * * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每天凌晨2点', value: '0 2 * * *' },
    { label: '每月1号凌晨2点', value: '0 2 1 * *' },
    { label: '每周一凌晨2点', value: '0 2 * * 1' },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '创建任务'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 任务名称 */}
          <div>
            <Label htmlFor="name">任务名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：每月预算结转"
              required
            />
          </div>

          {/* 任务描述 */}
          <div>
            <Label htmlFor="description">任务描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="描述任务的用途和功能"
              rows={3}
            />
          </div>

          {/* 脚本类型 */}
          <div>
            <Label htmlFor="scriptType">脚本类型 *</Label>
            <Select
              value={formData.scriptType}
              onValueChange={(value: 'shell' | 'sql' | 'node') =>
                setFormData({ ...formData, scriptType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shell">Shell脚本 (.sh)</SelectItem>
                <SelectItem value="sql">SQL脚本 (.sql)</SelectItem>
                <SelectItem value="node">Node.js脚本 (.js)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 脚本路径 */}
          <div>
            <Label htmlFor="scriptPath">脚本路径 *</Label>
            <Input
              id="scriptPath"
              value={formData.scriptPath}
              onChange={(e) => setFormData({ ...formData, scriptPath: e.target.value })}
              placeholder="/path/to/script.sh"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              请输入服务器上脚本文件的绝对路径
            </p>
          </div>

          {/* Cron表达式 */}
          <div>
            <Label htmlFor="cronExpression">Cron表达式 *</Label>
            <Input
              id="cronExpression"
              value={formData.cronExpression}
              onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
              placeholder="0 2 1 * *"
              required
            />
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500">常用示例：</p>
              <div className="flex flex-wrap gap-2">
                {cronExamples.map((example) => (
                  <button
                    key={example.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, cronExpression: example.value })}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    {example.label}: <code>{example.value}</code>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                格式：分 时 日 月 周 (例如：0 2 1 * * 表示每月1号凌晨2点)
              </p>
            </div>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="isEnabled"
              checked={formData.isEnabled}
              onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
            />
            <Label htmlFor="isEnabled">启用任务</Label>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : task ? '更新' : '创建'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

