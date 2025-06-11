# LLM调用日志实现指南

## 1. 概述

本文档描述如何在现有的"只为记账"系统中实现LLM调用日志功能，包括日志记录、查询和管理界面的开发。

## 2. 后端实现

### 2.1 LLM调用日志中间件

创建一个中间件来自动记录所有LLM调用：

```typescript
// server/src/middleware/llmLoggingMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { performance } from 'perf_hooks';

const prisma = new PrismaClient();

interface LLMRequest extends Request {
  llmCallStart?: number;
  llmCallData?: {
    userId: string;
    userName: string;
    accountBookId?: string;
    accountBookName?: string;
    provider: string;
    model: string;
    userMessage: string;
    systemPrompt?: string;
  };
}

export const startLLMLogging = (req: LLMRequest, res: Response, next: NextFunction) => {
  req.llmCallStart = performance.now();
  next();
};

export const completeLLMLogging = async (
  req: LLMRequest,
  response: any,
  error?: Error
) => {
  if (!req.llmCallStart || !req.llmCallData) {
    return;
  }

  const duration = Math.round(performance.now() - req.llmCallStart);
  const isSuccess = !error && response;

  try {
    await prisma.llmCallLog.create({
      data: {
        userId: req.llmCallData.userId,
        userName: req.llmCallData.userName,
        accountBookId: req.llmCallData.accountBookId,
        accountBookName: req.llmCallData.accountBookName,
        provider: req.llmCallData.provider,
        model: req.llmCallData.model,
        promptTokens: response?.usage?.prompt_tokens || 0,
        completionTokens: response?.usage?.completion_tokens || 0,
        totalTokens: response?.usage?.total_tokens || 0,
        userMessage: req.llmCallData.userMessage,
        assistantMessage: response?.choices?.[0]?.message?.content || '',
        systemPrompt: req.llmCallData.systemPrompt,
        isSuccess,
        errorMessage: error?.message,
        duration,
        cost: calculateCost(req.llmCallData.provider, req.llmCallData.model, response?.usage),
      },
    });
  } catch (logError) {
    console.error('Failed to log LLM call:', logError);
  }
};

function calculateCost(provider: string, model: string, usage: any): number | null {
  if (!usage) return null;
  
  // 示例：OpenAI GPT-3.5-turbo 定价
  if (provider === 'openai' && model === 'gpt-3.5-turbo') {
    const inputCost = (usage.prompt_tokens / 1000) * 0.001; // $0.001/1K tokens
    const outputCost = (usage.completion_tokens / 1000) * 0.002; // $0.002/1K tokens
    return inputCost + outputCost;
  }
  
  return null;
}
```

### 2.2 LLM服务集成

修改现有的LLM服务以使用日志中间件：

```typescript
// server/src/services/llmService.ts
import { OpenAI } from 'openai';
import { completeLLMLogging } from '../middleware/llmLoggingMiddleware';

export class LLMService {
  private openai: OpenAI;

  async analyzeTransaction(
    userId: string,
    userName: string,
    accountBookId: string,
    accountBookName: string,
    userMessage: string,
    systemPrompt: string
  ) {
    const startTime = performance.now();
    
    const callData = {
      userId,
      userName,
      accountBookId,
      accountBookName,
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      userMessage,
      systemPrompt,
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
      });

      // 记录成功的调用
      await completeLLMLogging(
        { llmCallStart: startTime, llmCallData: callData } as any,
        response
      );

      return response.choices[0].message.content;
    } catch (error) {
      // 记录失败的调用
      await completeLLMLogging(
        { llmCallStart: startTime, llmCallData: callData } as any,
        null,
        error as Error
      );
      
      throw error;
    }
  }
}
```

### 2.3 管理接口实现

```typescript
// server/src/admin/controllers/llmController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class LLMController {
  // 获取LLM调用日志列表
  async getLogs(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        userId,
        accountBookId,
        provider,
        isSuccess,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const where: any = {};
      
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
      
      if (userId) where.userId = userId;
      if (accountBookId) where.accountBookId = accountBookId;
      if (provider) where.provider = provider;
      if (isSuccess !== undefined) where.isSuccess = isSuccess === 'true';

      const [logs, total] = await Promise.all([
        prisma.llmCallLog.findMany({
          where,
          orderBy: { [sort as string]: order },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
          select: {
            id: true,
            userId: true,
            userName: true,
            accountBookId: true,
            accountBookName: true,
            provider: true,
            model: true,
            promptTokens: true,
            completionTokens: true,
            totalTokens: true,
            userMessage: true,
            assistantMessage: true,
            isSuccess: true,
            duration: true,
            cost: true,
            createdAt: true,
          },
        }),
        prisma.llmCallLog.count({ where }),
      ]);

      // 计算统计数据
      const stats = await this.calculateStats(where);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
          stats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: '获取LLM调用日志失败', details: error.message },
      });
    }
  }

  // 获取LLM调用统计
  async getStats(req: Request, res: Response) {
    try {
      const { period = '7d', groupBy = 'day' } = req.query;
      
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where = {
        createdAt: { gte: startDate },
      };

      // 总体统计
      const [overview, timeline] = await Promise.all([
        this.calculateOverviewStats(where),
        this.calculateTimeline(where, groupBy as string),
      ]);

      // 用户排行
      const topUsers = await prisma.llmCallLog.groupBy({
        by: ['userId', 'userName'],
        where,
        _count: { id: true },
        _sum: { totalTokens: true, cost: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      });

      // 服务商统计
      const providerStats = await prisma.llmCallLog.groupBy({
        by: ['provider', 'model'],
        where,
        _count: { id: true },
        _sum: { totalTokens: true, cost: true },
        _avg: { duration: true },
        orderBy: { _count: { id: 'desc' } },
      });

      res.json({
        success: true,
        data: {
          overview,
          timeline,
          topUsers: topUsers.map(user => ({
            userId: user.userId,
            userName: user.userName,
            calls: user._count.id,
            tokens: user._sum.totalTokens || 0,
            cost: user._sum.cost || 0,
          })),
          providerStats: providerStats.map(stat => ({
            provider: stat.provider,
            model: stat.model,
            calls: stat._count.id,
            tokens: stat._sum.totalTokens || 0,
            cost: stat._sum.cost || 0,
            avgDuration: Math.round(stat._avg.duration || 0),
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: '获取LLM统计数据失败', details: error.message },
      });
    }
  }

  // 获取单个日志详情
  async getLogDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const log = await prisma.llmCallLog.findUnique({
        where: { id },
      });

      if (!log) {
        return res.status(404).json({
          success: false,
          error: { message: '日志记录不存在' },
        });
      }

      res.json({
        success: true,
        data: { log },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: '获取日志详情失败', details: error.message },
      });
    }
  }

  private async calculateStats(where: any) {
    const [totalCalls, successCalls, totalTokens, totalCost, avgDuration] = await Promise.all([
      prisma.llmCallLog.count({ where }),
      prisma.llmCallLog.count({ where: { ...where, isSuccess: true } }),
      prisma.llmCallLog.aggregate({
        where,
        _sum: { totalTokens: true },
      }),
      prisma.llmCallLog.aggregate({
        where,
        _sum: { cost: true },
      }),
      prisma.llmCallLog.aggregate({
        where,
        _avg: { duration: true },
      }),
    ]);

    return {
      totalCalls,
      successRate: totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0,
      totalTokens: totalTokens._sum.totalTokens || 0,
      totalCost: totalCost._sum.cost || 0,
      avgDuration: Math.round(avgDuration._avg.duration || 0),
    };
  }

  private async calculateOverviewStats(where: any) {
    const [total, success, failed, tokens, cost, duration] = await Promise.all([
      prisma.llmCallLog.count({ where }),
      prisma.llmCallLog.count({ where: { ...where, isSuccess: true } }),
      prisma.llmCallLog.count({ where: { ...where, isSuccess: false } }),
      prisma.llmCallLog.aggregate({ where, _sum: { totalTokens: true } }),
      prisma.llmCallLog.aggregate({ where, _sum: { cost: true } }),
      prisma.llmCallLog.aggregate({ where, _avg: { duration: true } }),
    ]);

    return {
      totalCalls: total,
      successCalls: success,
      failedCalls: failed,
      successRate: total > 0 ? (success / total) * 100 : 0,
      totalTokens: tokens._sum.totalTokens || 0,
      totalCost: cost._sum.cost || 0,
      avgDuration: Math.round(duration._avg.duration || 0),
    };
  }

  private async calculateTimeline(where: any, groupBy: string) {
    // 简化实现，实际应该根据groupBy参数动态生成SQL
    const logs = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as calls,
        SUM(total_tokens) as tokens,
        SUM(cost) as cost,
        AVG(duration) as avgDuration
      FROM llm_call_logs
      WHERE created_at >= ${where.createdAt.gte}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return logs;
  }
}
```

## 3. 前端实现

### 3.1 LLM日志管理页面

```tsx
// apps/web/app/admin/llm/logs/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LLMLog {
  id: string;
  userId: string;
  userName: string;
  accountBookName?: string;
  provider: string;
  model: string;
  totalTokens: number;
  userMessage: string;
  assistantMessage?: string;
  isSuccess: boolean;
  duration: number;
  cost?: number;
  createdAt: string;
}

interface LogsResponse {
  logs: LLMLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    totalCalls: number;
    successRate: number;
    totalTokens: number;
    totalCost: number;
    avgDuration: number;
  };
}

export default function LLMLogsPage() {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    provider: '',
    isSuccess: '',
    search: '',
  });

  const { data, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ['llm-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      
      const response = await fetch(`/api/admin/llm/logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      return response.json().then(res => res.data);
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return `$${amount.toFixed(4)}`;
  };

  const formatMessage = (message: string, maxLength = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">LLM调用日志</h1>
        <Button onClick={() => refetch()}>刷新</Button>
      </div>

      {/* 统计卡片 */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalCalls}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总Token数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总成本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.stats.totalCost)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">平均响应时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.avgDuration}ms</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 过滤器 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="搜索用户名或消息..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            
            <Select value={filters.provider} onValueChange={(value) => handleFilterChange('provider', value)}>
              <SelectTrigger>
                <SelectValue placeholder="选择服务商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部服务商</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.isSuccess} onValueChange={(value) => handleFilterChange('isSuccess', value)}>
              <SelectTrigger>
                <SelectValue placeholder="调用状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部状态</SelectItem>
                <SelectItem value="true">成功</SelectItem>
                <SelectItem value="false">失败</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => setFilters({ page: 1, limit: 20, provider: '', isSuccess: '', search: '' })}>
              重置过滤器
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">加载中...</div>
          ) : (
            <div className="space-y-4">
              {data?.logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.userName}</span>
                        {log.accountBookName && (
                          <span className="text-sm text-gray-500">({log.accountBookName})</span>
                        )}
                        <Badge variant={log.isSuccess ? 'default' : 'destructive'}>
                          {log.isSuccess ? '成功' : '失败'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {log.provider} • {log.model} • {log.totalTokens} tokens
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-500">
                      <div>{new Date(log.createdAt).toLocaleString()}</div>
                      <div>{log.duration}ms • {formatCurrency(log.cost)}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-blue-600">用户消息：</span>
                      <p className="text-sm mt-1">{formatMessage(log.userMessage, 100)}</p>
                    </div>
                    
                    {log.assistantMessage && (
                      <div>
                        <span className="text-sm font-medium text-green-600">AI回复：</span>
                        <p className="text-sm mt-1">{formatMessage(log.assistantMessage, 100)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* 分页 */}
              {data?.pagination && (
                <div className="flex justify-between items-center pt-4">
                  <div className="text-sm text-gray-500">
                    共 {data.pagination.total} 条记录
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page <= 1}
                      onClick={() => handleFilterChange('page', (filters.page - 1).toString())}
                    >
                      上一页
                    </Button>
                    
                    <span className="py-2 px-3 text-sm">
                      {filters.page} / {data.pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={filters.page >= data.pagination.totalPages}
                      onClick={() => handleFilterChange('page', (filters.page + 1).toString())}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 3.2 LLM统计图表页面

```tsx
// apps/web/app/admin/llm/stats/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function LLMStatsPage() {
  const [period, setPeriod] = useState('7d');

  const { data, isLoading } = useQuery({
    queryKey: ['llm-stats', period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/llm/stats?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json().then(res => res.data);
    },
  });

  const timelineChartData = {
    labels: data?.timeline?.map((item: any) => item.date) || [],
    datasets: [
      {
        label: 'LLM调用次数',
        data: data?.timeline?.map((item: any) => item.calls) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Token使用量',
        data: data?.timeline?.map((item: any) => item.tokens) || [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'LLM使用趋势',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (isLoading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">LLM使用统计</h1>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7天</SelectItem>
            <SelectItem value="30d">30天</SelectItem>
            <SelectItem value="90d">90天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 概览统计 */}
      {data?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总调用次数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.totalCalls}</div>
              <p className="text-xs text-muted-foreground">
                成功: {data.overview.successCalls} | 失败: {data.overview.failedCalls}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.successRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Token使用量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.overview.totalTokens.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">总成本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${data.overview.totalCost.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 趋势图表 */}
      <Card>
        <CardHeader>
          <CardTitle>使用趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <Line data={timelineChartData} options={chartOptions} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 用户排行 */}
        <Card>
          <CardHeader>
            <CardTitle>用户使用排行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.topUsers?.map((user: any, index: number) => (
                <div key={user.userId} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="font-medium">{user.userName}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div>{user.calls} 次调用</div>
                    <div className="text-gray-500">{user.tokens.toLocaleString()} tokens</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 服务商统计 */}
        <Card>
          <CardHeader>
            <CardTitle>服务商统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.providerStats?.map((stat: any) => (
                <div key={`${stat.provider}-${stat.model}`} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{stat.provider}</div>
                      <div className="text-sm text-gray-500">{stat.model}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{stat.calls} 次调用</div>
                      <div className="text-gray-500">{stat.avgDuration}ms avg</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.tokens.toLocaleString()} tokens • ${stat.cost.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## 4. 部署和配置

### 4.1 数据库迁移

```bash
# 添加新的数据库表
npx prisma migrate dev --name add_llm_call_logs

# 生成Prisma客户端
npx prisma generate
```

### 4.2 环境变量配置

```env
# .env
# LLM调用日志配置
LLM_LOGGING_ENABLED=true
LLM_LOG_RETENTION_DAYS=30
```

### 4.3 定时清理任务

```typescript
// server/src/jobs/cleanupLLMLogs.ts
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 每天凌晨3点清理过期的LLM调用日志
cron.schedule('0 3 * * *', async () => {
  try {
    const retentionDays = parseInt(process.env.LLM_LOG_RETENTION_DAYS || '30');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await prisma.llmCallLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Cleaned up ${deletedCount.count} old LLM call logs`);
  } catch (error) {
    console.error('Failed to cleanup LLM logs:', error);
  }
});
```

## 5. 监控和告警

### 5.1 关键指标监控

- LLM调用成功率
- 平均响应时间
- Token使用量
- 成本控制
- 错误率趋势

### 5.2 告警规则

```typescript
// 示例告警逻辑
const checkLLMHealth = async () => {
  const recentLogs = await prisma.llmCallLog.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // 最近1小时
      },
    },
  });

  const successRate = recentLogs.filter(log => log.isSuccess).length / recentLogs.length;
  
  if (successRate < 0.9) {
    // 发送告警：LLM成功率低于90%
    console.warn(`LLM success rate low: ${(successRate * 100).toFixed(1)}%`);
  }
};
```

这个实现指南提供了完整的LLM调用日志功能，包括数据记录、查询、统计和可视化展示。管理员可以通过这些工具有效监控和管理LLM服务的使用情况。 