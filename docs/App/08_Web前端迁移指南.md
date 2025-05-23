# 只为记账 - Web前端迁移指南

本文档提供了将现有Web前端代码迁移到Monorepo结构的详细步骤和最佳实践。

## 1. 迁移概述

将现有的Web前端代码从传统的单一项目结构迁移到Monorepo架构，主要目标是：

1. 将业务逻辑抽象为平台无关的核心包
2. 将UI层分离为Web特定包
3. 为移动端开发做好准备

## 2. 迁移前准备

### 2.1 代码分析

在开始迁移前，需要分析现有代码的结构和依赖关系：

1. **业务逻辑**：
   - API服务 (`src/lib/api.ts`, `src/lib/api/*.ts`)
   - 状态管理 (`src/store/*.ts`)
   - 工具函数 (`src/lib/utils/*.ts`)

2. **UI组件**：
   - 页面组件 (`src/app/**/*.tsx`)
   - 共享组件 (`src/components/**/*.tsx`)
   - UI库组件 (`src/components/ui/*.tsx`)

3. **类型定义**：
   - 数据模型 (`src/types/*.ts`)
   - API类型 (`src/types/index.ts`)

### 2.2 依赖分析

分析项目的依赖，确定哪些依赖应该放在哪个包中：

1. **核心包依赖**：
   - axios
   - zustand
   - zod
   - dayjs
   - react-query

2. **Web包依赖**：
   - next.js
   - react-dom
   - tailwindcss
   - shadcn/ui组件
   - chart.js

## 3. 迁移步骤

### 3.1 迁移类型定义

将类型定义迁移到核心包：

```bash
# 创建目标目录
mkdir -p packages/core/src/models

# 复制类型定义文件
cp client/src/types/index.ts packages/core/src/models/
cp client/src/types/budget.ts packages/core/src/models/budget.ts
cp client/src/types/theme.ts packages/core/src/models/theme.ts
```

需要调整的内容：

1. 移除Web特定类型
2. 调整导入路径
3. 确保类型定义不依赖于平台特定API

示例调整：

```typescript
// 原始代码 (client/src/types/index.ts)
export interface AuthResponse {
  token: string;
  user: User;
}

// 迁移后 (packages/core/src/models/auth.ts)
export interface AuthResponse {
  token: string;
  user: User;
}

// 导出
export * from './auth';
```

### 3.2 迁移API服务

将API服务迁移到核心包：

```bash
# 创建目标目录
mkdir -p packages/core/src/api

# 复制API服务文件
cp client/src/lib/api.ts packages/core/src/api/api-client.ts
cp -r client/src/lib/api/* packages/core/src/api/
```

需要调整的内容：

1. 创建平台无关的API客户端工厂
2. 替换localStorage为存储适配器
3. 调整导入路径

示例调整：

```typescript
// 原始代码 (client/src/lib/api.ts)
// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
    let token = localStorage.getItem("auth-token");
    // ...
  }
);

// 迁移后 (packages/core/src/api/create-api-client.ts)
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export const createApiClient = (options: {
  baseURL: string;
  storage: StorageAdapter;
}) => {
  const { baseURL, storage } = options;
  
  const api = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  
  // 请求拦截器
  api.interceptors.request.use(
    async (config) => {
      // 从存储适配器获取token
      const token = await storage.getItem("auth-token");
      // ...
    }
  );
  
  // ...
  
  return api;
};
```

### 3.3 迁移状态管理

将状态管理迁移到核心包：

```bash
# 创建目标目录
mkdir -p packages/core/src/store

# 复制状态管理文件
cp client/src/store/auth-store.ts packages/core/src/store/
cp client/src/store/account-book-store.ts packages/core/src/store/
# ... 复制其他状态管理文件
```

需要调整的内容：

1. 创建状态管理工厂函数
2. 替换localStorage为存储适配器
3. 调整导入路径

示例调整：

```typescript
// 原始代码 (client/src/store/auth-store.ts)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ...
      login: async (credentials: LoginCredentials) => {
        try {
          // ...
          localStorage.setItem("auth-token", response.token);
        } catch (error) {
          // ...
        }
      },
    }),
    {
      name: "auth-storage",
      // ...
    }
  )
);

// 迁移后 (packages/core/src/store/create-auth-store.ts)
export interface AuthStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onLoginSuccess?: () => void;
}

export const createAuthStore = (options: AuthStoreOptions) => {
  const { apiClient, storage, onLoginSuccess } = options;
  
  return create<AuthState>()(
    persist(
      (set, get) => ({
        // ...
        login: async (credentials: LoginCredentials) => {
          try {
            // ...
            await storage.setItem("auth-token", response.token);
            
            if (onLoginSuccess) {
              onLoginSuccess();
            }
          } catch (error) {
            // ...
          }
        },
      }),
      {
        name: "auth-storage",
        storage: {
          getItem: async (name) => {
            const value = await storage.getItem(name);
            return value ? JSON.parse(value) : null;
          },
          setItem: async (name, value) => {
            await storage.setItem(name, JSON.stringify(value));
          },
          removeItem: async (name) => {
            await storage.removeItem(name);
          },
        },
      }
    )
  );
};
```

### 3.4 迁移工具函数

将工具函数迁移到核心包：

```bash
# 创建目标目录
mkdir -p packages/core/src/utils

# 复制工具函数文件
cp client/src/lib/utils.ts packages/core/src/utils/
cp client/src/lib/utils/*.ts packages/core/src/utils/
```

需要调整的内容：

1. 确保工具函数不依赖于平台特定API
2. 调整导入路径

示例调整：

```typescript
// 原始代码 (client/src/lib/utils/date-utils.ts)
export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

// 迁移后 (packages/core/src/utils/date-utils.ts)
// 无需修改，因为这是平台无关的
export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};
```

### 3.5 迁移验证规则

将验证规则迁移到核心包：

```bash
# 创建目标目录
mkdir -p packages/core/src/validation

# 复制验证规则文件
cp client/src/lib/validations/*.ts packages/core/src/validation/
```

需要调整的内容：

1. 确保验证规则不依赖于平台特定API
2. 调整导入路径

## 4. 创建Web包适配器

### 4.1 创建存储适配器

```typescript
// packages/web/src/adapters/storage-adapter.ts
import { StorageAdapter } from '@zhiweijz/core';

export class LocalStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}
```

### 4.2 创建API客户端

```typescript
// packages/web/src/api/api-client.ts
import { createApiClient } from '@zhiweijz/core';
import { LocalStorageAdapter } from '../adapters/storage-adapter';

const storage = new LocalStorageAdapter();

export const apiClient = createApiClient({
  baseURL: '/api',
  storage,
});
```

### 4.3 创建状态管理

```typescript
// packages/web/src/store/auth-store.ts
import { createAuthStore } from '@zhiweijz/core';
import { apiClient } from '../api/api-client';
import { LocalStorageAdapter } from '../adapters/storage-adapter';
import { toast } from 'sonner';

const storage = new LocalStorageAdapter();

export const useAuthStore = createAuthStore({
  apiClient,
  storage,
  onLoginSuccess: () => {
    toast.success("登录成功");
  },
});
```

## 5. 迁移UI组件

UI组件需要保留在Web包中，因为它们是平台特定的：

```bash
# 创建目标目录
mkdir -p packages/web/src/components

# 复制组件文件
cp -r client/src/components/* packages/web/src/components/
```

需要调整的内容：

1. 更新导入路径，使用包名导入核心包代码
2. 使用Web包中的适配器和服务

示例调整：

```typescript
// 原始代码 (client/src/components/auth/login-form.tsx)
import { useAuthStore } from '@/store/auth-store';

// 迁移后 (packages/web/src/components/auth/login-form.tsx)
import { useAuthStore } from '../../store/auth-store';
```

## 6. 迁移页面组件

页面组件需要保留在Web应用中：

```bash
# 创建目标目录
mkdir -p apps/web/src/app

# 复制页面文件
cp -r client/src/app/* apps/web/src/app/
```

需要调整的内容：

1. 更新导入路径，使用包名导入核心包和Web包代码
2. 调整页面组件以适应新的项目结构

示例调整：

```typescript
// 原始代码 (client/src/app/page.tsx)
import { Button } from '@/components/ui/button';

// 迁移后 (apps/web/src/app/page.tsx)
import { Button } from '@zhiweijz/web/src/components/ui/button';
```

## 7. 测试与验证

完成迁移后，需要进行全面测试：

1. 构建核心包：
   ```bash
   yarn workspace @zhiweijz/core build
   ```

2. 构建Web包：
   ```bash
   yarn workspace @zhiweijz/web build
   ```

3. 运行Web应用：
   ```bash
   yarn workspace @zhiweijz/web-app dev
   ```

4. 测试所有功能，确保迁移没有引入问题

## 8. 常见问题与解决方案

### 8.1 导入路径问题

**问题**：迁移后导入路径错误，找不到模块

**解决方案**：
- 检查tsconfig.json中的路径映射
- 确保包名称正确
- 使用正确的相对路径

### 8.2 依赖问题

**问题**：包之间的依赖关系不正确

**解决方案**：
- 确保package.json中的依赖关系正确
- 使用yarn workspace添加依赖
- 避免循环依赖

### 8.3 平台特定代码

**问题**：核心包中包含平台特定代码

**解决方案**：
- 使用适配器模式隔离平台特定代码
- 将平台特定代码移到相应的平台包中
- 使用依赖注入传递平台特定实现
