'use client';

import { createOnboardingStore } from '@zhiweijz/core';
import { createSimpleOnboardingStore } from '@zhiweijz/core';
import { LocalStorageAdapter } from '@zhiweijz/web';

// 创建存储适配器
const storage = new LocalStorageAdapter();

// 使用简单版本的 store（不使用 persist 中间件）
// 这个版本手动处理持久化，避免 Zustand persist 的函数丢失问题
export const useOnboardingStore = createSimpleOnboardingStore(storage);

// 如果需要使用原版本（带 persist 中间件），可以取消注释下面这行
// export const useOnboardingStore = createOnboardingStore(storage);
