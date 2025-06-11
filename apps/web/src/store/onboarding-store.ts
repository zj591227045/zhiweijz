'use client';

import { createOnboardingStore } from '@zhiweijz/core';
import { LocalStorageAdapter } from '@zhiweijz/web';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 创建引导状态管理
export const useOnboardingStore = createOnboardingStore(storage);
