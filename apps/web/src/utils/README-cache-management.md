# 缓存管理系统

## 概述

为了解决用户切换账号时出现的缓存问题，我们实现了一套完整的缓存管理系统。该系统确保在用户登出或认证失败时，能够彻底清除所有相关的缓存数据，避免数据混乱和API错误。

## 问题背景

在用户切换账号时，前端可能存在以下缓存问题：

1. **认证状态缓存**：zustand persist 持久化的用户信息和token
2. **业务数据缓存**：账本、交易、预算等业务数据的本地缓存
3. **API响应缓存**：内存中的API响应缓存
4. **localStorage数据**：直接存储的认证和业务数据

这些缓存如果不及时清理，会导致新账号看到旧账号的数据，从而引发500错误。

## 解决方案

### 1. 缓存清理工具 (`cache-utils.ts`)

提供了以下核心函数：

- `clearLocalStorageCache()`: 清除localStorage中的所有业务相关数据
- `clearApiCache()`: 清除API响应缓存
- `clearAllCache()`: 清除所有缓存（localStorage + API缓存）
- `clearAuthCache()`: 清除认证相关缓存（保留用户偏好设置）
- `performLogoutCleanup()`: 完整的登出清理流程

### 2. 认证状态管理优化 (`auth-store.ts`)

- **登录时**：清除旧的API缓存，确保新用户不会看到旧数据
- **登出时**：执行完整的缓存清理流程，包括页面跳转
- **认证失败时**：自动清理相关缓存

### 3. API客户端优化 (`api.ts`)

- **响应拦截器**：在token刷新失败时自动清理认证缓存
- **缓存管理**：提供全局缓存清理功能
- **错误处理**：统一的认证失败处理逻辑

### 4. 认证初始化器优化 (`auth-initializer.tsx`)

- **token验证失败**：自动清理认证缓存
- **数据解析错误**：清理缓存并重置状态

### 5. 路由守卫 (`route-guard.tsx`)

- **路由变化检查**：在路由变化时检查认证状态
- **异常状态处理**：发现认证状态异常时自动清理缓存
- **页面级认证**：提供页面级别的认证检查Hook

## 使用方法

### 基本使用

```typescript
import { clearAllCache, clearAuthCache, performLogoutCleanup } from '@/utils/cache-utils';

// 清除所有缓存
clearAllCache();

// 只清除认证相关缓存（保留主题设置等）
clearAuthCache();

// 完整的登出流程（清理缓存 + 跳转登录页）
performLogoutCleanup();
```

### 在组件中使用

```typescript
import { useAuthGuard } from '@/components/auth/route-guard';

function MyComponent() {
  const { requireAuth, isAuthenticated } = useAuthGuard();

  useEffect(() => {
    // 检查是否需要认证
    if (!requireAuth()) {
      return; // 会自动跳转到登录页
    }
    
    // 继续执行需要认证的逻辑
  }, []);
}
```

## 缓存清理策略

### 登录时
- 清除API缓存，确保获取最新数据
- 保留主题设置等用户偏好

### 登出时
- 清除所有认证相关数据
- 清除所有业务数据缓存
- 清除API缓存
- 跳转到登录页

### 认证失败时
- 清除认证状态
- 清除业务数据缓存
- 保留主题设置（可选）

## 测试

访问 `/test-cache` 页面可以测试缓存清理功能：

1. 添加测试数据到localStorage
2. 创建API缓存
3. 测试不同的清理功能
4. 验证缓存是否被正确清除

## 注意事项

1. **主题设置**：默认情况下会保留用户的主题偏好设置，如需完全清理可使用 `clearAllCache()`
2. **性能考虑**：缓存清理操作是同步的，在大量数据时可能有轻微延迟
3. **浏览器兼容性**：使用了现代浏览器的localStorage API，IE11+支持
4. **错误处理**：所有缓存操作都有错误处理，不会影响应用正常运行

## 监控和调试

在开发环境中，缓存操作会输出详细的控制台日志，包括：

- 清理的缓存项名称
- 清理操作的结果
- 错误信息（如果有）

生产环境中只会输出关键的错误信息。
