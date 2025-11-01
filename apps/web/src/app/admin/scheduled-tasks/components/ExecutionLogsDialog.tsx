'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { scheduledTaskApi, type TaskExecutionLog } from '@/lib/api/scheduled-task-api';
import { toast } from 'sonner';

interface ExecutionLogsDialogProps {
  taskId: string;
  onClose: () => void;
}

export default function ExecutionLogsDialog({ taskId, onClose }: ExecutionLogsDialogProps) {
  const [logs, setLogs] = useState<TaskExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<TaskExecutionLog | null>(null);

  const pageSize = 10;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await scheduledTaskApi.getExecutionLogs({
        taskId,
        page: currentPage,
        limit: pageSize,
      });
      setLogs(response.data);
      setTotalLogs(response.total);
    } catch (error) {
      console.error('获取执行日志失败:', error);
      toast.error('获取执行日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [taskId, currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

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

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>执行日志</DialogTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">加载中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500">暂无执行日志</div>
          ) : (
            <>
              {logs.map((log) => (
                <Card
                  key={log.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedLog?.id === log.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* 基本信息 */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusBadgeColor(log.status)}>
                            {getStatusText(log.status)}
                          </Badge>
                          <Badge variant="outline">
                            {log.triggeredBy === 'cron' ? '自动执行' : '手动执行'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDate(log.startTime)}
                        </div>
                      </div>

                      {/* 执行信息 */}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">开始时间：</span>
                          <span className="ml-2">{formatDate(log.startTime)}</span>
                        </div>
                        {log.endTime && (
                          <div>
                            <span className="text-gray-600">结束时间：</span>
                            <span className="ml-2">{formatDate(log.endTime)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">耗时：</span>
                          <span className="ml-2">{formatDuration(log.duration)}</span>
                        </div>
                      </div>

                      {/* 展开的详细信息 */}
                      {selectedLog?.id === log.id && (
                        <div className="mt-4 space-y-3 border-t pt-3">
                          {/* 退出码 */}
                          {log.exitCode !== undefined && log.exitCode !== null && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">退出码：</span>
                              <code className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded">
                                {log.exitCode}
                              </code>
                            </div>
                          )}

                          {/* 输出 */}
                          {log.output && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2">输出：</div>
                              <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto max-h-60 overflow-y-auto">
                                {log.output}
                              </pre>
                            </div>
                          )}

                          {/* 错误 */}
                          {log.error && (
                            <div>
                              <div className="text-sm font-medium text-red-700 mb-2">错误：</div>
                              <pre className="text-xs bg-red-50 p-3 rounded border border-red-200 overflow-x-auto max-h-60 overflow-y-auto text-red-800">
                                {log.error}
                              </pre>
                            </div>
                          )}

                          {/* 触发者 */}
                          {log.triggeredByUser && (
                            <div className="text-sm">
                              <span className="text-gray-600">触发者：</span>
                              <span className="ml-2">{log.triggeredByUser}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    第 {currentPage} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

