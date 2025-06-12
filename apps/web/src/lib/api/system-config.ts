'use client';

import { apiClient } from '@/lib/api-client';

// 全局AI配置接口
export interface GlobalAIConfig {
  enabled: boolean;
  provider?: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  dailyTokenLimit: number;
}

// AI服务状态接口
export interface AIServiceStatus {
  isOnline: boolean;
  responseTime?: number;
  lastChecked: string;
  version?: string;
}

// TOKEN使用量统计接口
export interface TokenUsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageTokensPerCall: number;
  dailyUsage: Array<{
    date: string;
    tokens: number;
    calls: number;
  }>;
}

// 今日TOKEN使用量接口
export interface TodayTokenUsage {
  usedTokens: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  dailyLimit: number;
  remainingTokens: number;
  usagePercentage: number;
}

// TOKEN使用量查询参数
export interface TokenUsageParams {
  startDate?: string;
  endDate?: string;
}

// 系统配置API服务
export const systemConfigApi = {
  /**
   * 获取全局AI配置
   */
  async getGlobalAIConfig(): Promise<GlobalAIConfig> {
    try {
      console.log('发送获取全局AI配置请求: /system-config/global-ai');
      const response = await apiClient.get<{
        success: boolean;
        data: GlobalAIConfig;
      }>('/system-config/global-ai');
      console.log('全局AI配置响应数据:', response);
      return response.data;
    } catch (error) {
      console.error('获取全局AI配置失败:', error);
      throw new Error('获取全局AI配置失败');
    }
  },

  /**
   * 获取AI服务状态
   */
  async getAIServiceStatus(): Promise<AIServiceStatus> {
    try {
      console.log('发送获取AI服务状态请求: /system-config/ai-status');
      const response = await apiClient.get<{
        success: boolean;
        data: AIServiceStatus;
      }>('/system-config/ai-status');
      console.log('AI服务状态响应数据:', response);
      return response.data;
    } catch (error) {
      console.error('获取AI服务状态失败:', error);
      throw new Error('获取AI服务状态失败');
    }
  },

  /**
   * 获取TOKEN使用量统计
   */
  async getTokenUsage(params?: TokenUsageParams): Promise<TokenUsageStats> {
    try {
      console.log('发送获取TOKEN使用量请求: /system-config/token-usage', params);
      const response = await apiClient.get<{
        success: boolean;
        data: TokenUsageStats;
      }>('/system-config/token-usage', { params });
      console.log('TOKEN使用量响应数据:', response);
      return response.data;
    } catch (error) {
      console.error('获取TOKEN使用量失败:', error);
      throw new Error('获取TOKEN使用量失败');
    }
  },

  /**
   * 获取今日TOKEN使用量
   */
  async getTodayTokenUsage(): Promise<TodayTokenUsage> {
    try {
      console.log('发送获取今日TOKEN使用量请求: /system-config/token-usage/today');
      const response = await apiClient.get<{
        success: boolean;
        data: TodayTokenUsage;
      }>('/system-config/token-usage/today');
      console.log('今日TOKEN使用量响应数据:', response);
      return response.data;
    } catch (error) {
      console.error('获取今日TOKEN使用量失败:', error);
      throw new Error('获取今日TOKEN使用量失败');
    }
  },

  /**
   * 更新全局AI配置
   */
  async updateGlobalAIConfig(config: Partial<GlobalAIConfig>): Promise<GlobalAIConfig> {
    try {
      console.log('发送更新全局AI配置请求: /system-config/global-ai', config);
      const response = await apiClient.put<{
        success: boolean;
        data: GlobalAIConfig;
      }>('/system-config/global-ai', config);
      console.log('更新全局AI配置响应数据:', response);
      return response.data;
    } catch (error) {
      console.error('更新全局AI配置失败:', error);
      throw new Error('更新全局AI配置失败');
    }
  },

  /**
   * 切换AI服务类型（官方/自定义）
   */
  async switchAIServiceType(serviceType: 'official' | 'custom', serviceId?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      console.log('发送切换AI服务类型请求: /system-config/ai-service/switch', { serviceType, serviceId });
      const response = await apiClient.post<{
        success: boolean;
        message: string;
      }>('/system-config/ai-service/switch', { serviceType, serviceId });
      console.log('切换AI服务类型响应数据:', response);
      return response;
    } catch (error) {
      console.error('切换AI服务类型失败:', error);
      throw new Error('切换AI服务类型失败');
    }
  },

  /**
   * 测试AI服务连接
   */
  async testAIServiceConnection(serviceType: 'official' | 'custom', serviceId?: string): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
  }> {
    try {
      console.log('发送测试AI服务连接请求: /system-config/ai-service/test', { serviceType, serviceId });
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        responseTime?: number;
      }>('/system-config/ai-service/test', { serviceType, serviceId });
      console.log('测试AI服务连接响应数据:', response);
      return response;
    } catch (error) {
      console.error('测试AI服务连接失败:', error);
      throw new Error('测试AI服务连接失败');
    }
  }
};
