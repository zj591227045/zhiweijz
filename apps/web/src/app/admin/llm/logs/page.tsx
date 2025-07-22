'use client';

// 强制动态渲染，避免静态生成时的模块解析问题
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DocumentTextIcon as FileText,
  FunnelIcon as Filter,
  ArrowDownTrayIcon as Download,
  ArrowPathIcon as RefreshCcw,
  MagnifyingGlassIcon as Search,
  CalendarIcon as Calendar,
  UserIcon as User,
  CpuChipIcon as Cpu,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

interface LLMLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  account_book_id?: string;
  account_book_name?: string;
  provider: string;
  model: string;
  source: string;
  ai_service_type: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens: number;
  user_message?: string;
  assistant_message?: string;
  system_prompt?: string;
  is_success: boolean;
  error_message?: string;
  duration: number;
  cost?: number;
  created_at: string;
  // 多模态AI字段
  input_size?: number;
  input_format?: string;
  output_text?: string;
  confidence_score?: number;
  log_type: string;
}

interface LogsResponse {
  logs: LLMLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface LogStatistics {
  overview: {
    totalCalls: number;
    successCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgDuration: number;
  };
  byServiceType: {
    llm: number;
    speech: number;
    vision: number;
  };
  bySource: {
    App: number;
    WeChat: number;
    API: number;
  };
}

export default function LLMLogsPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  // Web端完整功能
  const { isAuthenticated, token } = useAdminAuth();
  const [logs, setLogs] = useState<LLMLog[]>([]);
  const [statistics, setStatistics] = useState<LogStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // 筛选状态
  const [filters, setFilters] = useState({
    userEmail: '',
    provider: '',
    model: '',
    isSuccess: '',
    aiServiceType: '',
    serviceType: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  // 时间范围筛选状态
  const [timeRange, setTimeRange] = useState('7d'); // '1d', '7d', '30d', 'custom'

  // 处理时间范围变化
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);

    if (range === 'custom') {
      // 自定义时间范围，不自动设置日期
      return;
    }

    const now = new Date();
    const endDate = now.toISOString().split('T')[0];
    let startDate = '';

    switch (range) {
      case '1d':
        startDate = endDate; // 今天
        break;
      case '7d':
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = sevenDaysAgo.toISOString().split('T')[0];
        break;
      case '30d':
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = thirtyDaysAgo.toISOString().split('T')[0];
        break;
      default:
        startDate = '';
        break;
    }

    setFilters(prev => ({
      ...prev,
      startDate,
      endDate: range === 'all' ? '' : endDate,
    }));
  };

  // 加载日志列表
  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pagination.pageSize.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== '')),
      });

      const response = await adminApi.get(`${ADMIN_API_ENDPOINTS.AI_CALL_LOGS}?${params}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.data.logs || []);
          setPagination(data.data.pagination || pagination);
        } else {
          toast.error(data.message || '获取日志失败');
        }
      } else {
        toast.error('获取日志失败');
      }
    } catch (error) {
      console.error('获取LLM日志错误:', error);
      toast.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载统计数据
  const loadStatistics = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await adminApi.get(
        `${ADMIN_API_ENDPOINTS.AI_CALL_LOGS}/statistics?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatistics(data.data.statistics);
        }
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
    }
  };

  // 导出日志
  const exportLogs = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== '')),
      );

      const response = await adminApi.get(`${ADMIN_API_ENDPOINTS.AI_CALL_LOGS}/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `llm-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('日志导出成功');
      } else {
        toast.error('导出失败');
      }
    } catch (error) {
      console.error('导出日志错误:', error);
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 处理筛选变更
  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 应用筛选
  const applyFilters = () => {
    loadLogs(1);
    loadStatistics();
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      userEmail: '',
      provider: '',
      model: '',
      isSuccess: '',
      aiServiceType: '',
      serviceType: '',
      startDate: '',
      endDate: '',
      search: '',
    });
    setTimeRange('7d');
    // 重置为默认的7天范围
    handleTimeRangeChange('7d');
  };

  // 格式化时间
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化持续时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 格式化成本
  const formatCost = (cost?: number) => {
    if (!cost || typeof cost !== 'number') return '-';
    return `¥${Number(cost).toFixed(4)}`;
  };

  // 初始化默认时间范围
  useEffect(() => {
    handleTimeRangeChange('7d');
  }, []);

  useEffect(() => {
    // 只在认证完成且有token时才执行API请求
    if (isAuthenticated && token) {
      console.log(
        '🔍 [LLMLogsPage] Loading logs, authenticated:',
        isAuthenticated,
        'hasToken:',
        !!token,
      );
      loadLogs();
      loadStatistics();
    }
  }, [isAuthenticated, token]);

  // 当筛选条件变化时重新加载数据
  useEffect(() => {
    if (isAuthenticated && token) {
      loadLogs();
      loadStatistics();
    }
  }, [filters]);

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载LLM日志...</p>
        </div>
      </div>
    );
  }

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">加载日志中...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI 调用日志</h1>
          <p className="text-gray-600">
            查看和管理系统中所有的AI服务调用记录（包括LLM、语音识别、图片识别）
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadLogs();
              loadStatistics();
            }}
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" onClick={exportLogs} disabled={exporting}>
            {exporting ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            导出
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总调用次数</p>
                  <p className="text-2xl font-bold">
                    {statistics?.overview?.totalCalls?.toLocaleString() || '0'}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">成功率</p>
                  <p className="text-2xl font-bold">
                    {(statistics?.overview?.totalCalls || 0) > 0
                      ? (
                          ((statistics?.overview?.successCalls || 0) /
                            (statistics?.overview?.totalCalls || 1)) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">总Token数</p>
                  <p className="text-2xl font-bold">
                    {statistics?.overview?.totalTokens?.toLocaleString() || '0'}
                  </p>
                </div>
                <Cpu className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">平均响应时间</p>
                  <p className="text-2xl font-bold">
                    {formatDuration(statistics?.overview?.avgDuration || 0)}
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 时间范围选择器 */}
          <div className="space-y-2">
            <Label>时间范围</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={timeRange === '1d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangeChange('1d')}
              >
                今天
              </Button>
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangeChange('7d')}
              >
                最近7天
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangeChange('30d')}
              >
                最近30天
              </Button>
              <Button
                variant={timeRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTimeRangeChange('custom')}
              >
                自定义
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aiServiceType">AI服务类型</Label>
              <select
                id="aiServiceType"
                className="w-full p-2 border rounded-md"
                value={filters.aiServiceType}
                onChange={(e) => handleFilterChange('aiServiceType', e.target.value)}
              >
                <option value="">全部</option>
                <option value="llm">LLM对话</option>
                <option value="speech">语音识别</option>
                <option value="vision">图片识别</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail">用户邮箱</Label>
              <Input
                id="userEmail"
                placeholder="输入用户邮箱"
                value={filters.userEmail}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">服务提供商</Label>
              <select
                id="provider"
                className="w-full p-2 border rounded-md"
                value={filters.provider}
                onChange={(e) => handleFilterChange('provider', e.target.value)}
              >
                <option value="">全部</option>
                <option value="openai">OpenAI</option>
                <option value="siliconflow">硅基流动</option>
                <option value="baidu">百度云</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">模型</Label>
              <Input
                id="model"
                placeholder="输入模型名称"
                value={filters.model}
                onChange={(e) => handleFilterChange('model', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isSuccess">调用状态</Label>
              <select
                id="isSuccess"
                className="w-full p-2 border rounded-md"
                value={filters.isSuccess}
                onChange={(e) => handleFilterChange('isSuccess', e.target.value)}
              >
                <option value="">全部</option>
                <option value="true">成功</option>
                <option value="false">失败</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceType">服务类型</Label>
              <select
                id="serviceType"
                className="w-full p-2 border rounded-md"
                value={filters.serviceType}
                onChange={(e) => handleFilterChange('serviceType', e.target.value)}
              >
                <option value="">全部</option>
                <option value="llm">文本生成</option>
                <option value="speech">语音识别</option>
                <option value="vision">图像识别</option>
              </select>
            </div>

            {timeRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="startDate">开始日期</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">结束日期</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="search">关键词搜索</Label>
              <Input
                id="search"
                placeholder="搜索用户消息或错误信息"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={applyFilters} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              应用筛选
            </Button>
            <Button variant="outline" onClick={resetFilters}>
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              调用日志
            </span>
            <span className="text-sm font-normal text-gray-600">共 {pagination.total} 条记录</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无日志记录</div>
          ) : (
            <div className="space-y-4">
              {/* 表格头部 */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700">
                <div className="col-span-2">用户信息</div>
                <div className="col-span-2">服务信息</div>
                <div className="col-span-2">使用量/输入</div>
                <div className="col-span-2">性能指标</div>
                <div className="col-span-2">调用时间</div>
                <div className="col-span-2">状态</div>
              </div>

              {/* 日志条目 */}
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="lg:grid lg:grid-cols-12 gap-4 space-y-2 lg:space-y-0">
                    {/* 用户信息 */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{log.userName || 'Unknown User'}</p>
                          <p className="text-xs text-gray-500">{log.userEmail || 'N/A'}</p>
                          {log.accountBookName && (
                            <p className="text-xs text-blue-600">{log.accountBookName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 服务信息 */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {log.provider || 'unknown'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {log.aiServiceType || 'unknown'}
                          </Badge>
                        </div>
                        <p className="text-sm font-mono">{log.model || 'unknown'}</p>
                        <p className="text-xs text-gray-500">来源: {log.source || 'unknown'}</p>
                      </div>
                    </div>

                    {/* Token使用/输入信息 */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        {log.aiServiceType === 'llm' ? (
                          <>
                            <p className="text-sm">
                              <span className="text-gray-600">总计:</span>{' '}
                              {log.totalTokens?.toLocaleString() || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              输入: {log.promptTokens?.toLocaleString() || 'N/A'} | 输出:{' '}
                              {log.completionTokens?.toLocaleString() || 'N/A'}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm">
                              <span className="text-gray-600">输入大小:</span>{' '}
                              {log.inputSize ? `${(log.inputSize / 1024).toFixed(1)}KB` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              格式: {log.inputFormat || 'N/A'}
                            </p>
                          </>
                        )}
                        {log.cost && (
                          <p className="text-xs text-green-600">成本: {formatCost(log.cost)}</p>
                        )}
                      </div>
                    </div>

                    {/* 性能指标 */}
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600">响应时间:</span>{' '}
                          {formatDuration(log.duration)}
                        </p>
                        {log.userMessage && (
                          <p className="text-xs text-gray-500 truncate" title={log.userMessage}>
                            消息: {log.userMessage.substring(0, 30)}...
                          </p>
                        )}
                        {log.assistantMessage && (
                          <p
                            className="text-xs text-blue-500 truncate"
                            title={log.assistantMessage}
                          >
                            回复: {log.assistantMessage.substring(0, 30)}...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 调用时间 */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* 状态 */}
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
                        {log.isSuccess ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              成功
                            </Badge>
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-5 w-5 text-red-500" />
                            <Badge variant="destructive">失败</Badge>
                          </>
                        )}
                      </div>
                      {log.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 truncate" title={log.errorMessage}>
                          {log.errorMessage.substring(0, 50)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页 */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                显示第 {(pagination.page - 1) * pagination.pageSize + 1} -{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} 条， 共{' '}
                {pagination.total} 条记录
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadLogs(pagination.page - 1)}
                >
                  上一页
                </Button>
                <span className="flex items-center px-3 text-sm">
                  第 {pagination.page} / {pagination.totalPages} 页
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadLogs(pagination.page + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
