# 只为记账 - Monorepo架构技术规划

## 1. 架构概述

本项目采用Monorepo架构，使用Yarn Workspaces管理多个包，实现代码共享和项目隔离的平衡。这种架构使我们能够在Web端和移动端之间共享核心业务逻辑，同时为每个平台提供原生的用户体验。

### 1.1 项目结构

```
zhiweijz/
├── packages/                # 共享包
│   ├── core/                # 核心业务逻辑和类型定义
│   │   ├── src/
│   │   │   ├── api/         # API服务定义
│   │   │   ├── models/      # 数据模型和类型
│   │   │   ├── store/       # 状态管理
│   │   │   ├── utils/       # 工具函数
│   │   │   ├── hooks/       # 通用钩子
│   │   │   └── validation/  # 验证规则
│   ├── web/                 # Web端特定组件和功能
│   │   ├── src/
│   │   │   ├── adapters/    # Web适配器
│   │   │   ├── api/         # Web API客户端
│   │   │   ├── components/  # Web UI组件
│   │   │   ├── hooks/       # Web特定钩子
│   │   │   └── store/       # Web状态管理
│   └── mobile/              # 移动端特定组件和功能
│       ├── src/
│       │   ├── adapters/    # 移动端适配器
│       │   ├── api/         # 移动端API客户端
│       │   ├── components/  # 移动端UI组件
│       │   ├── hooks/       # 移动端特定钩子
│       │   ├── navigation/  # 导航配置
│       │   ├── offline/     # 离线功能
│       │   ├── screens/     # 屏幕组件
│       │   └── store/       # 移动端状态管理
├── apps/                    # 应用
│   ├── web/                 # Web应用
│   ├── android/             # Android应用
│   └── ios/                 # iOS应用
├── docs/                    # 项目文档
└── package.json             # 根配置
```

### 1.2 技术栈

| 领域 | 技术选择 | 说明 |
|------|---------|------|
| 项目管理 | Yarn Workspaces | 管理多包依赖和工作流 |
| 核心框架 | React 19 | 统一的UI框架 |
| Web框架 | Next.js 15 | 服务端渲染和路由 |
| 移动框架 | React Native 0.73+ | 原生移动应用开发 |
| 状态管理 | Zustand 5 | 轻量级状态管理，跨平台兼容 |
| API客户端 | Axios + React Query | 数据获取和缓存 |
| UI组件库(Web) | shadcn/ui + Tailwind CSS | 现代化Web UI |
| UI组件库(移动) | React Native Paper | Material Design风格移动UI |
| 表单处理 | React Hook Form + Zod | 表单验证和处理 |
| 类型系统 | TypeScript 5 | 静态类型检查 |
| 本地存储(Web) | localStorage | Web端存储 |
| 本地存储(移动) | AsyncStorage + SQLite | 移动端存储和离线数据库 |
| 导航(Web) | Next.js App Router | Web端路由 |
| 导航(移动) | React Navigation | 移动端导航 |

## 2. 代码共享策略

### 2.1 共享层次

我们将代码按照共享程度分为三个层次：

1. **完全共享层** (90-100%复用)：
   - 业务逻辑
   - API服务定义
   - 数据模型和类型
   - 验证规则
   - 工具函数

2. **部分共享层** (50-70%复用)：
   - 状态管理
   - 表单处理逻辑
   - 数据转换逻辑

3. **平台特定层** (需要重写)：
   - UI组件
   - 导航系统
   - 平台特定功能

### 2.2 核心包设计

核心包(`@zhiweijz/core`)是代码共享的基础，包含以下模块：

#### 2.2.1 API服务

API服务采用工厂模式，支持不同平台的适配：

```typescript
// packages/core/src/api/create-api-client.ts
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export interface ApiClientOptions {
  baseURL: string;
  storage: StorageAdapter;
  onUnauthorized?: () => void;
}

export const createApiClient = (options: ApiClientOptions) => {
  // 创建平台无关的API客户端
};
```

#### 2.2.2 状态管理

状态管理同样采用工厂模式，支持不同平台的存储适配：

```typescript
// packages/core/src/store/create-auth-store.ts
export interface AuthStoreOptions {
  apiClient: any;
  storage: StorageAdapter;
  onLoginSuccess?: () => void;
  onLogoutSuccess?: () => void;
}

export const createAuthStore = (options: AuthStoreOptions) => {
  // 创建平台无关的状态管理
};
```

#### 2.2.3 工具函数

工具函数应该是纯函数，不依赖于平台特定API：

```typescript
// packages/core/src/utils/date-utils.ts
export const formatDate = (date: Date | string, format: string): string => {
  // 平台无关的日期格式化
};

export const getDateRange = (period: 'day' | 'week' | 'month' | 'year'): { start: Date, end: Date } => {
  // 平台无关的日期范围计算
};
```

### 2.3 平台适配策略

#### 2.3.1 Web适配器

Web端需要实现以下适配器：

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

#### 2.3.2 移动端适配器

移动端需要实现以下适配器：

```typescript
// packages/mobile/src/adapters/storage-adapter.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from '@zhiweijz/core';

export class AsyncStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }
  
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }
  
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
}
```

## 3. 离线功能设计

### 3.1 离线架构

移动端的离线功能架构如下：

```
packages/mobile/src/offline/
├── storage/              # 本地存储管理
│   ├── local-database.ts # 使用SQLite实现本地数据库
│   └── sync-manager.ts   # 数据同步管理器
├── models/               # 离线数据模型
├── hooks/                # 离线功能钩子
│   ├── use-offline-mode.ts
│   └── use-offline-data.ts
├── services/             # 离线服务
│   ├── offline-api.ts    # 离线API模拟
│   └── sync-service.ts   # 同步服务
└── utils/                # 工具函数
    ├── conflict-resolver.ts
    └── network-monitor.ts
```

### 3.2 本地数据库设计

使用SQLite存储结构化数据：

```typescript
// packages/mobile/src/offline/storage/local-database.ts
import SQLite from 'react-native-sqlite-storage';

export class LocalDatabase {
  async initialize() {
    // 创建数据库表结构
    // 交易表、分类表、预算表、账本表等
  }
  
  // 交易相关操作
  async getTransactions(filters?: any) {}
  async saveTransaction(transaction: any) {}
  
  // 同步相关操作
  async getUnsyncedItems() {}
  async markAsSynced(ids: string[]) {}
  async saveServerData(data: any) {}
}
```

### 3.3 同步机制

实现增量同步和冲突解决：

```typescript
// packages/mobile/src/offline/services/sync-manager.ts
export class SyncManager {
  // 执行同步
  async syncData() {
    // 1. 获取未同步的本地数据
    // 2. 上传到服务器
    // 3. 处理冲突
    // 4. 标记已同步项
    // 5. 下载服务器新数据
  }
  
  // 处理同步结果
  handleSyncResults(results: any) {
    // 识别成功和冲突项
  }
}
```

### 3.4 网络状态监控

监控网络状态变化，自动触发同步：

```typescript
// packages/mobile/src/hooks/use-network-status.ts
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);
  
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });
    
    return () => unsubscribe();
  }, []);
  
  return { isConnected };
};
```

## 4. 迁移计划

### 4.1 迁移阶段

1. **阶段1：设置基础结构和迁移共享代码** (1-2周)
   - 设置Monorepo结构
   - 迁移类型定义
   - 迁移API服务
   - 迁移工具函数
   - 迁移验证规则

2. **阶段2：适配核心包代码** (1-2周)
   - 创建API客户端工厂
   - 创建存储适配器接口
   - 适配状态管理

3. **阶段3：创建Web包适配器** (1周)
   - 创建Web特定适配器
   - 创建Web特定API客户端
   - 创建Web特定状态管理

4. **阶段4：创建移动端适配器** (1-2周)
   - 创建移动端特定适配器
   - 创建移动端特定API客户端
   - 创建移动端特定状态管理

5. **阶段5：实现离线功能** (2-3周)
   - 创建本地数据库
   - 创建同步管理器
   - 创建离线API适配器

6. **阶段6：实现移动端UI** (3-4周)
   - 实现认证页面
   - 实现仪表盘页面
   - 实现交易管理页面
   - 实现其他功能页面

7. **阶段7：测试与优化** (2周)
   - 单元测试
   - 集成测试
   - 性能优化

### 4.2 迁移优先级

1. **P0 (必须实现)**:
   - 核心包基础结构
   - API服务和状态管理
   - 认证功能
   - 交易管理基本功能

2. **P1 (重要功能)**:
   - 离线数据访问
   - 仪表盘和统计
   - 分类和预算管理

3. **P2 (增强功能)**:
   - 离线数据创建和编辑
   - 数据同步机制
   - 高级统计和报表

## 5. 开发工作流

### 5.1 开发流程

1. **核心功能开发**:
   - 先在核心包中实现平台无关的业务逻辑
   - 编写单元测试验证逻辑
   - 发布核心包更新

2. **Web端开发**:
   - 导入核心包更新
   - 实现Web特定UI和交互
   - 测试Web端功能

3. **移动端开发**:
   - 导入核心包更新
   - 实现移动端特定UI和交互
   - 测试移动端功能

### 5.2 命令参考

```bash
# 安装所有依赖
yarn install

# 构建核心包
yarn workspace @zhiweijz/core build

# 开发核心包(监视模式)
yarn workspace @zhiweijz/core dev

# 运行Web应用
yarn workspace @zhiweijz/web-app dev

# 运行Android应用
yarn workspace @zhiweijz/android-app android

# 运行iOS应用
yarn workspace @zhiweijz/ios-app ios
```

## 6. AI IDE开发指南

AI IDE在开发过程中应遵循以下原则：

1. **代码位置**:
   - 共享业务逻辑放在`packages/core`
   - Web特定代码放在`packages/web`
   - 移动端特定代码放在`packages/mobile`
   - 应用入口放在`apps/`目录下

2. **导入路径**:
   - 使用包名导入共享代码: `import { xxx } from '@zhiweijz/core'`
   - 使用相对路径导入同包内代码: `import { xxx } from '../utils'`

3. **适配模式**:
   - 使用工厂函数和依赖注入
   - 使用接口定义平台无关行为
   - 在平台特定包中实现接口

4. **离线功能**:
   - 所有数据访问通过适配器进行
   - 实现乐观更新和冲突解决
   - 提供清晰的同步状态指示

通过遵循这些原则，AI IDE可以高效地生成符合项目架构的代码，确保代码质量和一致性。
