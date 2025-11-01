'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ClockIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { scheduledTaskApi, type ScheduledTask, type TaskExecutionLog } from '@/lib/api/scheduled-task-api';
import TaskFormDialog from './components/TaskFormDialog';
import ExecutionLogsDialog from './components/ExecutionLogsDialog';
import { toast } from 'sonner';

export default function ScheduledTasksPage() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [logs, setLogs] = useState<TaskExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<boolean | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showLogDetailDialog, setShowLogDetailDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<TaskExecutionLog | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');

  const pageSize = 10;

  // 获取任务列表
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await scheduledTaskApi.getTaskList({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        isEnabled: filterEnabled,
      });
      setTasks(response.data || []);
      setTotalTasks(response.total || 0);
    } catch (error) {
      console.error('获取任务列表失败:', error);
      toast.error('获取任务列表失败');
      setTasks([]);
      setTotalTasks(0);
    } finally {
      setLoading(false);
    }
  };

  // 获取执行日志列表
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await scheduledTaskApi.getExecutionLogs({
        page: currentPage,
        limit: pageSize,
      });
      setLogs(response.data || []);
      setTotalLogs(response.total || 0);
    } catch (error) {
      console.error('获取执行日志失败:', error);
      toast.error('获取执行日志失败');
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else {
      fetchLogs();
    }
  }, [currentPage, searchTerm, filterEnabled, activeTab]);

  // 创建任务
  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskDialog(true);
  };

  // 编辑任务
  const handleEditTask = (task: ScheduledTask) => {
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  // 删除任务
  const handleDeleteTask = async (id: string) => {
    if (!confirm('确定要删除这个任务吗？删除后将无法恢复。')) {
      return;
    }

    try {
      await scheduledTaskApi.deleteTask(id);
      toast.success('任务删除成功');
      fetchTasks();
    } catch (error) {
      console.error('删除任务失败:', error);
      toast.error('删除任务失败');
    }
  };

  // 切换任务状态
  const handleToggleTask = async (task: ScheduledTask) => {
    try {
      await scheduledTaskApi.toggleTask(task.id, !task.isEnabled);
      toast.success(task.isEnabled ? '任务已禁用' : '任务已启用');
      fetchTasks();
    } catch (error) {
      console.error('切换任务状态失败:', error);
      toast.error('切换任务状态失败');
    }
  };

  // 手动执行任务
  const handleExecuteTask = async (id: string) => {
    try {
      const response = await scheduledTaskApi.executeTask(id);
      toast.success('任务已开始执行');
      // 切换到日志标签页
      setActiveTab('logs');
      setTimeout(() => fetchLogs(), 1000);
    } catch (error) {
      console.error('执行任务失败:', error);
      toast.error('执行任务失败');
    }
  };

  // 查看任务日志
  const handleViewLogs = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowLogsDialog(true);
  };

  // 查看日志详情
  const handleViewLogDetail = (log: TaskExecutionLog) => {
    setSelectedLog(log);
    setShowLogDetailDialog(true);
  };

  // 任务保存成功回调
  const handleTaskSaved = () => {
    setShowTaskDialog(false);
    fetchTasks();
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 获取脚本类型标签颜色
  const getScriptTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'shell':
        return 'bg-blue-100 text-blue-800';
      case 'sql':
        return 'bg-green-100 text-green-800';
      case 'node':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态标签颜色
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
      case 'pending':
        return '等待中';
      default:
        return status;
    }
  };

  // 格式化执行时长
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const totalPages = Math.ceil(totalTasks / pageSize);
  const totalLogsPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">计划任务管理</h1>
          <p className="text-gray-600 mt-1">管理和监控系统计划任务</p>
        </div>
        <Button onClick={handleCreateTask}>
          <PlusIcon className="h-5 w-5 mr-2" />
          创建任务
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">任务列表</TabsTrigger>
          <TabsTrigger value="logs">执行日志</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="搜索任务名称..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={filterEnabled === undefined ? 'all' : filterEnabled ? 'enabled' : 'disabled'}
                  onChange={(e) =>
                    setFilterEnabled(
                      e.target.value === 'all' ? undefined : e.target.value === 'enabled'
                    )
                  }
                  className="px-4 py-2 border rounded-md"
                >
                  <option value="all">全部状态</option>
                  <option value="enabled">已启用</option>
                  <option value="disabled">已禁用</option>
                </select>
                <Button variant="outline" onClick={fetchTasks}>
                  <ArrowPathIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 任务列表 */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">加载中...</p>
                </CardContent>
              </Card>
            ) : !tasks || tasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  暂无任务
                </CardContent>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle>{task.name}</CardTitle>
                          <Badge className={getScriptTypeBadgeColor(task.scriptType)}>
                            {task.scriptType.toUpperCase()}
                          </Badge>
                          <Switch
                            checked={task.isEnabled}
                            onCheckedChange={() => handleToggleTask(task)}
                          />
                        </div>
                        {task.description && (
                          <CardDescription className="mt-2">{task.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExecuteTask(task.id)}
                        >
                          <PlayIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLogs(task.id)}
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTask(task)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">脚本路径：</span>
                        <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                          {task.scriptPath}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600">Cron表达式：</span>
                        <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                          {task.cronExpression}
                        </code>
                      </div>
                      <div>
                        <span className="text-gray-600">创建时间：</span>
                        <span className="ml-2">{formatDate(task.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">更新时间：</span>
                        <span className="ml-2">{formatDate(task.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              <span className="px-4 py-2">
                第 {currentPage} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* 筛选和刷新 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={fetchLogs}>
                  <ArrowPathIcon className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 执行日志列表 */}
          <div className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">加载中...</p>
                </CardContent>
              </Card>
            ) : !logs || logs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  暂无执行日志
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card
                  key={log.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewLogDetail(log)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{log.task?.name || '未知任务'}</CardTitle>
                          <Badge className={getStatusBadgeColor(log.status)}>
                            {getStatusText(log.status)}
                          </Badge>
                          <Badge variant="outline">
                            {log.triggeredBy === 'cron' ? '自动执行' : '手动执行'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(log.startTime)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">开始时间：</span>
                        <div className="mt-1">{formatDate(log.startTime)}</div>
                      </div>
                      {log.endTime && (
                        <div>
                          <span className="text-gray-600">结束时间：</span>
                          <div className="mt-1">{formatDate(log.endTime)}</div>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">耗时：</span>
                        <div className="mt-1">{formatDuration(log.duration)}</div>
                      </div>
                      {log.exitCode !== undefined && log.exitCode !== null && (
                        <div>
                          <span className="text-gray-600">退出码：</span>
                          <div className="mt-1">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {log.exitCode}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                    {log.error && (
                      <div className="mt-3 text-sm">
                        <span className="text-red-600">错误：</span>
                        <div className="mt-1 text-red-800 bg-red-50 p-2 rounded border border-red-200 truncate">
                          {log.error.substring(0, 200)}
                          {log.error.length > 200 && '...'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* 分页 */}
          {totalLogsPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                上一页
              </Button>
              <span className="px-4 py-2">
                第 {currentPage} / {totalLogsPages} 页
              </span>
              <Button
                variant="outline"
                disabled={currentPage === totalLogsPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 任务表单对话框 */}
      {showTaskDialog && (
        <TaskFormDialog
          task={editingTask}
          onClose={() => setShowTaskDialog(false)}
          onSaved={handleTaskSaved}
        />
      )}

      {/* 执行日志对话框（特定任务） */}
      {showLogsDialog && selectedTaskId && (
        <ExecutionLogsDialog
          taskId={selectedTaskId}
          onClose={() => setShowLogsDialog(false)}
        />
      )}

      {/* 日志详情对话框 */}
      {showLogDetailDialog && selectedLog && (
        <Dialog open={true} onOpenChange={() => setShowLogDetailDialog(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>执行日志详情</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">任务名称：</span>
                  <div className="mt-1">{selectedLog.task?.name || '未知任务'}</div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">状态：</span>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeColor(selectedLog.status)}>
                      {getStatusText(selectedLog.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">触发方式：</span>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {selectedLog.triggeredBy === 'cron' ? '自动执行' : '手动执行'}
                    </Badge>
                  </div>
                </div>
                {selectedLog.triggeredByUser && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">触发者：</span>
                    <div className="mt-1">{selectedLog.triggeredByUser}</div>
                  </div>
                )}
              </div>

              {/* 时间信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">开始时间：</span>
                  <div className="mt-1">{formatDate(selectedLog.startTime)}</div>
                </div>
                {selectedLog.endTime && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">结束时间：</span>
                    <div className="mt-1">{formatDate(selectedLog.endTime)}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-700">耗时：</span>
                  <div className="mt-1">{formatDuration(selectedLog.duration)}</div>
                </div>
              </div>

              {/* 退出码 */}
              {selectedLog.exitCode !== undefined && selectedLog.exitCode !== null && (
                <div>
                  <span className="text-sm font-medium text-gray-700">退出码：</span>
                  <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                    {selectedLog.exitCode}
                  </code>
                </div>
              )}

              {/* 输出 */}
              {selectedLog.output && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">输出：</div>
                  <pre className="text-xs bg-gray-50 p-4 rounded border overflow-x-auto max-h-96 overflow-y-auto">
                    {selectedLog.output}
                  </pre>
                </div>
              )}

              {/* 错误 */}
              {selectedLog.error && (
                <div>
                  <div className="text-sm font-medium text-red-700 mb-2">错误：</div>
                  <pre className="text-xs bg-red-50 p-4 rounded border border-red-200 overflow-x-auto max-h-96 overflow-y-auto text-red-800">
                    {selectedLog.error}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

