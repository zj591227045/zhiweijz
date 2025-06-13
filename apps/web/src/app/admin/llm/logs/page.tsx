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
import { 
  DocumentTextIcon as FileText, 
  FunnelIcon as Filter, 
  ArrowPathIcon as RefreshCcw,
  EyeIcon as Eye,
  ClockIcon as Clock,
  UserIcon as User,
  ExclamationTriangleIcon as AlertTriangle,
  CheckCircleIcon as CheckCircle,
  XCircleIcon as XCircle,
  CpuChipIcon as Cpu
} from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

// 调试信息：检查环境变量
console.log('LLM Logs Page - Environment Variables:', {
  IS_MOBILE_BUILD: process.env.IS_MOBILE_BUILD,
  NODE_ENV: process.env.NODE_ENV,
  DOCKER_ENV: process.env.DOCKER_ENV
});

interface LLMLog {
  id: string;
  userId: string;
  userName?: string;
  accountBookId?: string;
  accountBookName?: string;
  provider: string;
  model: string;
  userMessage: string;
  assistantMessage?: string;
  isSuccess: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  duration?: number;
  cost?: number;
  serviceType?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  accountBook?: {
    id: string;
    name: string;
    type: string;
  };
}

interface LogFilters {
  status: string;
  provider: string;
  userId: string;
  serviceType: string;
  dateFrom: string;
  dateTo: string;
  timeRange: string;
}

export default function LLMLogsPage() {
  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    return <MobileNotSupported />;
  }

  const { isAuthenticated, token } = useAdminAuth();
  const [logs, setLogs] = useState<LLMLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LLMLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<LogFilters>({
    status: '',
    provider: '',
    userId: '',
    serviceType: '',
    dateFrom: '',
    dateTo: '',
    timeRange: ''
  });

  // 处理时间范围筛选
  const handleTimeRangeChange = (range: string) => {
    const now = new Date();
    let dateFrom = '';
    let dateTo = now.toISOString().split('T')[0]; // 今天

    switch (range) {
      case '1':
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1天前
        break;
      case '7':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7天前
        break;
      case '30':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30天前
        break;
      default:
        dateFrom = '';
        dateTo = '';
    }

    setFilters(prev => ({
      ...prev,
      timeRange: range,
      dateFrom,
      dateTo
    }));
  };

  // 计算token统计
  const getTokenStats = () => {
    const totalTokens = logs.reduce((sum, log) => {
      return sum + (log.totalTokens || 0);
    }, 0);

    const promptTokens = logs.reduce((sum, log) => {
      return sum + (log.promptTokens || 0);
    }, 0);

    const completionTokens = logs.reduce((sum, log) => {
      return sum + (log.completionTokens || 0);
    }, 0);

    return { totalTokens, promptTokens, completionTokens };
  };

  // 格式化token数量
  const formatTokenCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // 加载日志数据
  const loadLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: page.toString(),
        pageSize: '20'
      };
      
      // 添加过滤条件
      if (filters.provider) params.provider = filters.provider;
      if (filters.userId) params.userId = filters.userId;
      if (filters.serviceType) params.serviceType = filters.serviceType;
      if (filters.dateFrom) params.startDate = filters.dateFrom;
      if (filters.dateTo) params.endDate = filters.dateTo;

      const response = await adminApi.getWithParams(ADMIN_API_ENDPOINTS.LLM_LOGS, params);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLogs(data.data.logs);
          setCurrentPage(data.data.pagination.page);
          setTotalPages(data.data.pagination.totalPages);
          setTotalCount(data.data.pagination.total);
        } else {
          toast.error(data.message || '获取日志失败');
        }
      } else {
        toast.error('获取日志失败');
      }
    } catch (error) {
      console.error('获取日志错误:', error);
      toast.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  // 清空日志
  const clearLogs = async () => {
    if (!confirm('确定要清空所有LLM调用日志吗？此操作不可恢复。')) {
      return;
    }

    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.LLM_LOGS_CLEANUP);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('日志清空成功');
          loadLogs(1);
        } else {
          toast.error(data.message || '清空日志失败');
        }
      } else {
        toast.error('清空日志失败');
      }
    } catch (error) {
      console.error('清空日志错误:', error);
      toast.error('清空日志失败');
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 格式化响应时间
  const formatResponseTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 获取状态样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 border-green-200">成功</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">失败</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">处理中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // 查看详情
  const viewDetails = (log: LLMLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      loadLogs();
    }
  }, [isAuthenticated, token, filters]);

  // 如果未认证，显示加载状态
  if (!isAuthenticated || !token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载日志数据...</p>
        </div>
      </div>
    );
  }

  const tokenStats = getTokenStats();

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LLM调用日志</h1>
          <p className="text-gray-600">
            查看和管理所有LLM服务调用记录
          </p>
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>服务类型说明：</strong>
              <span className="ml-2">
                <Badge variant="outline" className="mr-2 text-green-700 border-green-300">官方AI服务</Badge>
                使用全局配置的AI服务（如OpenAI、硅基流动等），计入每日token使用量统计
              </span>
              <span className="ml-4">
                <Badge variant="outline" className="mr-2 text-orange-700 border-orange-300">自定义AI服务</Badge>
                使用用户自定义的AI服务配置，不计入每日token使用量统计
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => loadLogs(currentPage)} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button variant="destructive" onClick={clearLogs}>
            清空日志
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总调用次数</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">成功调用</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(log => log.isSuccess).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">失败调用</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(log => !log.isSuccess).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">平均响应时间</p>
                <p className="text-2xl font-bold">
                  {logs.length > 0 
                    ? formatResponseTime(
                        logs.filter(log => log.duration).reduce((sum, log) => sum + (log.duration || 0), 0) / 
                        logs.filter(log => log.duration).length
                      )
                    : '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Cpu className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Token消耗</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatTokenCount(tokenStats.totalTokens)}
                </p>
                <p className="text-xs text-gray-500">
                  输入: {formatTokenCount(tokenStats.promptTokens)} | 输出: {formatTokenCount(tokenStats.completionTokens)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            筛选条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 时间范围快捷筛选 */}
          <div className="mb-4">
            <Label className="mb-2 block">时间范围</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filters.timeRange === '' ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange('')}
              >
                全部
              </Button>
              <Button
                variant={filters.timeRange === '1' ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange('1')}
              >
                最近1天
              </Button>
              <Button
                variant={filters.timeRange === '7' ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange('7')}
              >
                最近7天
              </Button>
              <Button
                variant={filters.timeRange === '30' ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange('30')}
              >
                最近30天
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="status">状态</Label>
              <select
                id="status"
                className="w-full p-2 border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">全部</option>
                <option value="success">成功</option>
                <option value="error">失败</option>
                <option value="pending">处理中</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="provider">提供商</Label>
              <select
                id="provider"
                className="w-full p-2 border rounded-md"
                value={filters.provider}
                onChange={(e) => setFilters(prev => ({ ...prev, provider: e.target.value }))}
              >
                <option value="">全部</option>
                <option value="openai">OpenAI</option>
                <option value="siliconflow">硅基流动</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            
            <div>
              <Label htmlFor="userId">用户ID</Label>
              <Input
                id="userId"
                placeholder="输入用户ID"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              />
            </div>
            
                         <div>
               <Label htmlFor="serviceType">服务类型</Label>
               <select
                 id="serviceType"
                 className="w-full p-2 border rounded-md"
                 value={filters.serviceType}
                 onChange={(e) => setFilters(prev => ({ ...prev, serviceType: e.target.value }))}
               >
                 <option value="">全部</option>
                 <option value="official">官方AI服务</option>
                 <option value="custom">自定义AI服务</option>
               </select>
             </div>
            
            <div>
              <Label htmlFor="dateFrom">开始日期</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, timeRange: '' }))}
              />
            </div>
            
            <div>
              <Label htmlFor="dateTo">结束日期</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, timeRange: '' }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardHeader>
          <CardTitle>调用记录</CardTitle>
          <CardDescription>
            共 {totalCount} 条记录，当前第 {currentPage} / {totalPages} 页
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">加载中...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无日志记录
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {log.isSuccess && <CheckCircle className="h-5 w-5 text-green-600" />}
                        {!log.isSuccess && <XCircle className="h-5 w-5 text-red-600" />}
                        {getStatusBadge(log.isSuccess ? 'success' : 'error')}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{log.provider} / {log.model}</p>
                          <Badge 
                            variant="outline" 
                            className={log.serviceType === 'official' 
                              ? "text-green-700 border-green-300 bg-green-50" 
                              : "text-orange-700 border-orange-300 bg-orange-50"
                            }
                          >
                            {log.serviceType === 'official' ? '官方' : '自定义'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          <User className="h-4 w-4 inline mr-1" />
                          {log.user?.name || log.userName || log.userId}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{formatTime(log.createdAt)}</p>
                        <p className="text-sm text-gray-500">
                          响应时间: {formatResponseTime(log.duration)}
                        </p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDetails(log)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        详情
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 truncate">
                      <strong>提示:</strong> {log.userMessage}
                    </p>
                    {!log.isSuccess && (
                      <p className="text-sm text-red-600 mt-1">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        调用失败
                      </p>
                    )}
                  </div>
                  
                  {(log.promptTokens || log.completionTokens || log.totalTokens) && (
                    <div className="mt-2 flex space-x-4 text-xs text-gray-500">
                      <span>输入: {log.promptTokens || 0} tokens</span>
                      <span>输出: {log.completionTokens || 0} tokens</span>
                      <span>总计: {log.totalTokens || 0} tokens</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => loadLogs(currentPage - 1)}
              >
                上一页
              </Button>
              
              <span className="text-sm text-gray-600">
                第 {currentPage} / {totalPages} 页
              </span>
              
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => loadLogs(currentPage + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">调用详情</h3>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                关闭
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>状态</Label>
                  <div className="mt-1">{getStatusBadge(selectedLog.isSuccess ? 'success' : 'error')}</div>
                </div>
                <div>
                  <Label>调用时间</Label>
                  <p className="mt-1">{formatTime(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <Label>提供商</Label>
                  <p className="mt-1">{selectedLog.provider}</p>
                </div>
                <div>
                  <Label>模型</Label>
                  <p className="mt-1">{selectedLog.model}</p>
                </div>
                <div>
                  <Label>服务类型</Label>
                  <div className="mt-1">
                    <Badge 
                      variant="outline" 
                      className={selectedLog.serviceType === 'official' 
                        ? "text-green-700 border-green-300 bg-green-50" 
                        : "text-orange-700 border-orange-300 bg-orange-50"
                      }
                    >
                      {selectedLog.serviceType === 'official' ? '官方AI服务' : '自定义AI服务'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>用户</Label>
                  <p className="mt-1">{selectedLog.user?.name || selectedLog.userName || selectedLog.userId}</p>
                </div>
                <div>
                  <Label>响应时间</Label>
                  <p className="mt-1">{formatResponseTime(selectedLog.duration)}</p>
                </div>
              </div>
              
              <div>
                <Label>输入提示</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded border">
                  <pre className="whitespace-pre-wrap text-sm">{selectedLog.userMessage}</pre>
                </div>
              </div>
              
              {selectedLog.assistantMessage && (
                <div>
                  <Label>AI回复</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded border">
                    <pre className="whitespace-pre-wrap text-sm">{selectedLog.assistantMessage}</pre>
                  </div>
                </div>
              )}
              
              {!selectedLog.isSuccess && (
                <div>
                  <Label>错误信息</Label>
                  <div className="mt-1 p-3 bg-red-50 rounded border border-red-200">
                    <p className="text-red-700 text-sm">调用失败</p>
                  </div>
                </div>
              )}
              
              {(selectedLog.promptTokens || selectedLog.completionTokens || selectedLog.totalTokens) && (
                <div>
                  <Label>Token使用情况</Label>
                  <div className="mt-1 grid grid-cols-3 gap-4">
                    <div className="p-3 bg-blue-50 rounded">
                      <p className="text-sm text-blue-600">输入Tokens</p>
                      <p className="text-lg font-semibold">{selectedLog.promptTokens || 0}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded">
                      <p className="text-sm text-green-600">输出Tokens</p>
                      <p className="text-lg font-semibold">{selectedLog.completionTokens || 0}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded">
                      <p className="text-sm text-purple-600">总计Tokens</p>
                      <p className="text-lg font-semibold">{selectedLog.totalTokens || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 