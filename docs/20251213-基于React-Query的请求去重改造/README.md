# 20251213-基于React Query的请求去重改造

## 项目概述

将现有的Zustand状态管理逐步迁移到React Query，实现自动请求去重、缓存和错误处理，同时保持零破坏性。

## 当前架构分析

### 现状问题
- **重复请求**：多个组件同时调用相同API导致重复请求
- **手动状态管理**：大量样板代码处理loading/error状态
- **缓存缺失**：每次组件重新挂载都会重新请求数据
- **错误处理复杂**：每个组件都需要单独处理错误状态

### 依赖范围
通过代码分析发现，`useAccountBookStore` 被50+个文件使用：
- Web应用：30+个页面和组件
- Mobile应用：15+个屏幕
- 共享组件：5+个通用组件

## 迁移策略

### 阶段1：兼容层建立 ✅
**目标**：保持现有功能正常运行
**状态**：已完成

- ✅ 创建兼容层 `apps/web/src/store/account-book-store.ts`
- ✅ 保持Zustand接口不变
- ✅ 添加迁移警告日志
- ✅ 恢复所有包导出

### 阶段2：React Query基础设施 ✅
**目标**：建立React Query查询系统
**状态**：已完成

- ✅ `hooks/queries/useAccountBookQueries.ts` - 基础查询hooks
- ✅ `hooks/useAccountBooks.ts` - 兼容接口封装
- ✅ `lib/account-book-global.ts` - 全局状态访问器

### 阶段3：核心组件迁移 🔄
**目标**：迁移最重要的组件
**优先级**：高频使用组件优先

#### 3.1 仪表盘相关 ✅
- ✅ `hooks/useDashboardData.ts` - 已迁移到React Query
- ✅ `lib/shortcuts-deep-link-handler.ts` - 已使用全局访问器

#### 3.2 待迁移组件（按优先级）
1. **高优先级**（核心功能）
   - `app/dashboard/page.tsx` - 仪表盘主页
   - `components/share/share-image-handler.tsx` - 分享功能
   - `app/settings/page.tsx` - 设置页面

2. **中优先级**（常用功能）
   - `app/transactions/edit/[id]/transaction-edit-client.tsx` - 交易编辑
   - `app/settings/categories/new/page.tsx` - 分类管理
   - `app/settings/books/page.tsx` - 账本管理

3. **低优先级**（辅助功能）
   - `components/onboarding/` - 引导流程
   - `app/settings/export/page.tsx` - 数据导出
   - 其他设置页面

### 阶段4：移动端迁移 📋
**目标**：迁移移动端组件
**状态**：待开始

- `packages/mobile/src/screens/dashboard/` - 移动端仪表盘
- `packages/mobile/src/screens/transactions/` - 移动端交易
- 其他移动端屏幕

### 阶段5：清理和优化 📋
**目标**：移除兼容层，完成迁移
**状态**：待开始

- 验证所有组件已迁移
- 移除兼容层代码
- 更新文档和类型定义
- 性能测试和优化

## 迁移指南

### 单个组件迁移步骤

#### 1. 识别使用模式
```typescript
// 旧代码（Zustand）
const { currentAccountBook, fetchAccountBooks, isLoading } = useAccountBookStore();
```

#### 2. 替换为React Query版本
```typescript
// 新代码（React Query）
const { currentAccountBook, fetchAccountBooks, isLoading } = useAccountBooks();
```

#### 3. 处理特殊情况
如果组件使用了 `.getState()` 方法（非React上下文）：
```typescript
// 旧代码
const accountId = useAccountBookStore.getState().currentAccountBook?.id;

// 新代码
import { getCurrentAccountBookId } from '@/lib/account-book-global';
const accountId = getCurrentAccountBookId();
```

#### 4. 测试验证
- 功能测试：确保所有功能正常工作
- 性能测试：验证请求去重效果
- 错误处理：测试网络错误场景

### 迁移检查清单

每个组件迁移完成后，检查以下项目：

- [ ] 功能完全正常
- [ ] 无控制台错误或警告
- [ ] 请求去重生效（网络面板验证）
- [ ] 加载状态正确显示
- [ ] 错误处理正常工作
- [ ] 缓存机制生效

## 技术细节

### React Query优势

1. **自动请求去重**
   ```typescript
   // 多个组件同时调用，只发送一次请求
   const { data } = useAccountBooks();
   ```

2. **智能缓存**
   ```typescript
   // 5分钟内数据被认为是新鲜的
   staleTime: 5 * 60 * 1000
   ```

3. **自动重试**
   ```typescript
   // 失败时自动重试2次
   retry: 2,
   retryDelay: 1000
   ```

4. **后台更新**
   ```typescript
   // 窗口聚焦时自动刷新数据
   refetchOnWindowFocus: true
   ```

### 性能监控

使用React Query DevTools监控：
- 查询状态和缓存
- 请求时间线
- 重复请求检测

```typescript
// 开发环境启用DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

## 风险控制

### 回滚策略
如果迁移过程中出现问题：

1. **单组件回滚**：恢复组件的Zustand使用
2. **功能回滚**：临时禁用有问题的功能
3. **完全回滚**：恢复到兼容层状态

### 监控指标
- 页面加载时间
- API请求数量
- 错误率
- 用户体验指标

## 进度跟踪

### 已完成 ✅
- [x] 兼容层建立
- [x] React Query基础设施
- [x] 仪表盘核心组件迁移

### 进行中 🔄
- [ ] Web端核心组件迁移（3/30）

### 待开始 📋
- [ ] 移动端组件迁移
- [ ] 最终清理和优化

## 预期收益

### 性能提升
- **请求减少**：去重机制减少50%+重复请求
- **加载速度**：缓存机制提升页面切换速度
- **用户体验**：更流畅的数据加载体验

### 开发效率
- **代码减少**：消除手动状态管理样板代码
- **错误处理**：统一的错误处理机制
- **维护性**：声明式查询更易维护

### 系统稳定性
- **自动重试**：网络错误自动恢复
- **缓存一致性**：统一的数据缓存策略
- **类型安全**：完整的TypeScript支持

---

**注意**：这是一个长期项目，预计需要2-3个迭代周期完成。每个阶段都要确保系统稳定运行，遵循"Never break userspace"原则。