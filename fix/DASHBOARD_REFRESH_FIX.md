# 仪表盘自动刷新功能实现

## 问题描述

目前通过手动记账和智能记账2种方式添加记账，都无法触发仪表盘最近交易列表的自动刷新，只能手动刷新页面才能看到最新的交易记录。

**根本原因分析**：
1. **事件系统工作正常**：自定义事件和localStorage机制都能正确触发
2. **API缓存问题**：API层的缓存机制导致即使触发刷新，获取到的仍是缓存中的旧数据
3. **缓存失效逻辑错误**：POST请求后的缓存失效正则表达式不正确，无法清除相关缓存

## 解决方案

实现了一个**三重保障机制**，结合自定义事件、localStorage和缓存管理，确保在各种情况下都能可靠地触发仪表盘数据刷新。

### 1. 三重保障机制

#### 1.1 主要机制：自定义事件
- 使用浏览器原生的CustomEvent API
- 实时性好，延迟低
- 适用于同一页面内的组件通信

#### 1.2 备用机制：localStorage信号
- 使用localStorage存储刷新信号
- 支持跨页面、跨标签页同步
- 防止因页面跳转导致事件丢失

#### 1.3 缓存管理机制：强制缓存失效
- 修复API缓存失效逻辑
- 在数据刷新时强制清除相关缓存
- 确保获取到最新的数据

### 2. 核心实现

#### 2.1 触发函数增强 (`apps/web/src/store/dashboard-store.ts`)

```typescript
export const triggerTransactionChange = (accountBookId: string) => {
  // 确保在浏览器环境中
  if (typeof window === 'undefined') {
    console.warn("triggerTransactionChange: 不在浏览器环境中，跳过事件触发");
    return;
  }
  
  console.log("触发交易变化事件，账本ID:", accountBookId);
  
  // 方法1：使用自定义事件
  const event = new CustomEvent('transactionChanged', {
    detail: { accountBookId }
  });
  window.dispatchEvent(event);
  console.log("交易变化事件已触发");
  
  // 方法2：使用localStorage作为备用机制
  const refreshSignal = {
    accountBookId,
    timestamp: Date.now(),
    action: 'refresh_dashboard'
  };
  localStorage.setItem('dashboard_refresh_signal', JSON.stringify(refreshSignal));
  console.log("仪表盘刷新信号已写入localStorage");
};
```

#### 2.2 缓存失效逻辑修复 (`apps/web/src/lib/api.ts`)

```typescript
// POST请求，会使相关GET缓存失效
post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return api.post(url, data, config).then((res: AxiosResponse) => {
    // 使相关缓存失效 - 修复缓存失效逻辑
    const baseUrl = url.split('?')[0]; // 移除查询参数
    
    if (isDev) console.log('POST请求完成，清除相关缓存:', baseUrl);
    
    // 清除完全匹配的缓存
    apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    
    // 清除带参数的缓存（如 /transactions?accountBookId=xxx）
    apiCache.invalidate(new RegExp(`^${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?`));
    
    if (isDev) console.log('缓存清除完成');
    return res.data;
  });
},
```

#### 2.3 强制缓存清除 (`apps/web/src/store/dashboard-store.ts`)

```typescript
// 刷新仪表盘数据（不显示加载状态）
refreshDashboardData: async (accountBookId: string) => {
  try {
    set({ error: null });
    console.log(`开始刷新仪表盘数据，账本ID: ${accountBookId}`);

    // 强制清除相关缓存，确保获取最新数据
    console.log("强制清除仪表盘相关缓存...");
    apiClient.invalidateCache(new RegExp(`^/statistics`));
    apiClient.invalidateCache(new RegExp(`^/transactions`));
    console.log("缓存清除完成，开始获取最新数据...");

    // 并行请求数据
    const [monthlyStats, budgetData, transactions] = await Promise.all([
      fetchMonthlyStatistics(accountBookId),
      fetchBudgetStatistics(accountBookId),
      fetchRecentTransactions(accountBookId)
    ]);

    console.log("所有数据获取完成，更新状态...");
    set({ 
      monthlyStats,
      budgetCategories: budgetData.categories,
      totalBudget: budgetData.totalBudget,
      groupedTransactions: transactions
    });
    console.log("仪表盘状态更新完成");
  } catch (error) {
    console.error("刷新仪表盘数据失败:", error);
    set({ error: "刷新仪表盘数据失败" });
    throw error;
  }
},
```

### 3. 手动记账优化

#### 3.1 延迟跳转 (`apps/web/src/components/transactions/transaction-add-page.tsx`)

```typescript
// 提交成功
if (success) {
  toast.success("交易记录已添加");
  resetForm();
  
  console.log("手动记账成功，准备触发交易变化事件");
  
  // 触发交易变化事件，让仪表盘自动刷新
  triggerTransactionChange(currentAccountBook.id);
  
  // 延迟跳转，确保事件能够被处理
  setTimeout(() => {
    console.log("延迟跳转到仪表盘页面");
    router.push("/dashboard");
  }, 100);
}
```

### 4. 工作流程

#### 4.1 正常流程（事件机制）
1. 用户操作交易 → 2. 调用`triggerTransactionChange()` → 3. 触发CustomEvent → 4. 仪表盘监听器接收 → 5. 自动刷新数据

#### 4.2 备用流程（localStorage机制）
1. 用户操作交易 → 2. 调用`triggerTransactionChange()` → 3. 写入localStorage信号 → 4. 页面跳转到仪表盘 → 5. 检查localStorage信号 → 6. 自动刷新数据

#### 4.3 跨标签页流程（Storage事件）
1. 标签页A操作交易 → 2. 写入localStorage信号 → 3. 标签页B监听storage事件 → 4. 自动刷新数据

### 5. 技术特点

- **双重保障**：事件+localStorage，确保刷新不丢失
- **跨标签页同步**：支持多标签页实时同步
- **防重复处理**：时间戳机制防止重复刷新
- **自动清理**：过期信号自动清理，避免内存泄漏
- **详细日志**：完整的调试日志，便于问题排查

### 6. 测试方法

#### 6.1 浏览器控制台测试
```javascript
// 复制 test-dashboard-refresh.js 中的代码到控制台运行
```

#### 6.2 实际功能测试
1. **手动记账测试**：添加记账 → 自动跳转仪表盘 → 验证数据更新
2. **智能记账测试**：智能记账直接添加 → 验证仪表盘数据更新
3. **跨标签页测试**：标签页A操作 → 标签页B自动更新
4. **页面刷新测试**：操作后刷新页面 → 验证数据一致性

### 7. 故障排除

#### 7.1 检查控制台日志
```
触发交易变化事件，账本ID: xxx
交易变化事件已触发
仪表盘刷新信号已写入localStorage
监听到交易变化事件，账本ID: xxx
开始自动刷新仪表盘数据...
```

#### 7.2 检查localStorage
```javascript
// 在控制台运行
console.log(localStorage.getItem('dashboard_refresh_signal'));
```

#### 7.3 手动触发刷新
```javascript
// 在控制台运行
triggerTransactionChange('your-account-book-id');
```

## 总结

通过实现三重刷新机制，彻底解决了仪表盘数据不能实时更新的问题。无论是同页面操作、页面跳转还是跨标签页操作，都能确保仪表盘数据的实时性和一致性。 