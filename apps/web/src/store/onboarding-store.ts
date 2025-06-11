'use client';

import { createOnboardingStore } from '@zhiweijz/core';
import { LocalStorageAdapter } from '@zhiweijz/web';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 使用标准版本的 store
export const useOnboardingStore = createOnboardingStore(storage);
