import { apiClient } from '../api-client';
import {
  Tag,
  TagResponseDto,
  CreateTagDto,
  UpdateTagDto,
  TagQueryParams,
  TagListResponse,
  TagDetailResponse,
  AddTransactionTagsDto,
  BatchTransactionTagsDto,
  BatchTransactionTagsResponse,
  TagStatisticsQuery,
  TagStatisticsResponse,
  TagTrendsQuery,
  TagTrendsResponse,
  TagSuggestionsQuery,
  TagSuggestionsResponse,
} from './types/tag.types';

/**
 * 标签API客户端
 */
export class TagApi {
  /**
   * 获取账本标签列表
   */
  async getTags(params: TagQueryParams): Promise<TagListResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get(`/tags?${queryParams.toString()}`);
  }

  /**
   * 获取标签详情
   */
  async getTagById(tagId: string): Promise<TagDetailResponse> {
    return apiClient.get(`/tags/${tagId}`);
  }

  /**
   * 创建标签
   */
  async createTag(data: CreateTagDto): Promise<{ success: boolean; data: TagResponseDto; message: string }> {
    return apiClient.post('/tags', data);
  }

  /**
   * 更新标签
   */
  async updateTag(tagId: string, data: UpdateTagDto): Promise<{ success: boolean; data: TagResponseDto; message: string }> {
    return apiClient.put(`/tags/${tagId}`, data);
  }

  /**
   * 删除标签
   */
  async deleteTag(tagId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/tags/${tagId}`);
  }

  /**
   * 获取交易记录的标签
   */
  async getTransactionTags(transactionId: string): Promise<{ success: boolean; data: TagResponseDto[] }> {
    return apiClient.get(`/transactions/${transactionId}/tags`);
  }

  /**
   * 为交易记录添加标签
   */
  async addTransactionTags(
    transactionId: string,
    data: AddTransactionTagsDto
  ): Promise<{
    success: boolean;
    data: { addedTags: TagResponseDto[]; skippedTags: string[] };
    message: string;
  }> {
    return apiClient.post(`/transactions/${transactionId}/tags`, data);
  }

  /**
   * 移除交易记录的标签
   */
  async removeTransactionTag(transactionId: string, tagId: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`/transactions/${transactionId}/tags/${tagId}`);
  }

  /**
   * 批量操作交易标签
   */
  async batchOperateTransactionTags(data: BatchTransactionTagsDto): Promise<BatchTransactionTagsResponse> {
    return apiClient.post('/transactions/batch/tags', data);
  }

  /**
   * 获取标签统计数据
   */
  async getTagStatistics(params: TagStatisticsQuery): Promise<TagStatisticsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => queryParams.append(key, String(item)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    return apiClient.get(`/statistics/by-tags?${queryParams.toString()}`);
  }

  /**
   * 获取标签使用趋势
   */
  async getTagTrends(params: TagTrendsQuery): Promise<TagTrendsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get(`/statistics/tag-trends?${queryParams.toString()}`);
  }

  /**
   * 获取标签建议
   */
  async getTagSuggestions(params: TagSuggestionsQuery): Promise<TagSuggestionsResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get(`/tags/suggestions?${queryParams.toString()}`);
  }

  /**
   * 获取标签推荐（别名方法，与 getTagSuggestions 功能相同）
   */
  async getTagRecommendations(params: TagSuggestionsQuery): Promise<TagSuggestionsResponse> {
    return this.getTagSuggestions(params);
  }
}

// 创建单例实例
export const tagApi = new TagApi();

// 导出默认实例
export default tagApi;
