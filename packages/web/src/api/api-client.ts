'use client';

import { createApiClient } from '@zhiweijz/core';
import { LocalStorageAdapter } from '../adapters/storage-adapter';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// API基础URL - 使用相对路径
const API_BASE_URL = '/api'; // 使用相对路径，会自动使用当前域名

// 创建API客户端
export const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  storage,
  debug: isDev,
});

export default apiClient;
