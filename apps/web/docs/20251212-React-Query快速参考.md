# React Query 快速参考

## 一分钟上手

### 1. 导入hooks

```typescript
import {
  useFullTransaction,
  useBudgetsByDate,
  useTags,
  useUpdateTransaction,
} from '@/hooks/queries';
```

### 2. 获取数据

```typescript
// 获取单个资源
const { data, isLoading, error } = useFullTransaction(id);

// 获取列表
const { data: budgets = [] } = useBudgetsByDate(date, accountBookId);

// 条件查询
const { data } = useTags(
  accountBookId,
  { isActive: true },
  isModalOpen // enabled参数
);
```

### 3. 更新数据

```typescript
const updateMutation = useUpdateTransaction();

const handleSave = async () => {
  await updateMutation.mutateAsync({ id, data });
  // ✅ 相关缓存自动刷新
};
```

---

## 常用Hooks速查

### 交易相关

```typescript
// 获取完整交易数据（推荐）
const { data, isLoading, error } = useFullTransaction(
  transactionId,
  initialData?, // 可选的初始数据
  enabled? // 是否启用查询
);
// 返回: { transaction, tags, attachments }

// 更新交易
const mutation = useUpdateTransaction();
await mutation.mutateAsync({ id, data });

// 删除交易
const mutation = useDeleteTransaction();
await mutation.mutateAsync(id);
```

### 预算相关

```typescript
// 根据日期获取预算
const { data: budgets = [] } = useBudgetsByDate(
  date, // YYYY-MM-DD
  accountBookId,
  enabled?
);

// 获取活跃预算
const { data: budgets = [] } = useActiveBudgets(
  accountBookId,
  enabled?
);

// 预加载预算
const { prefetchByDate } = usePrefetchBudgets();
prefetchByDate(date, accountBookId);
```

### 标签相关

```typescript
// 获取标签列表
const { data: tags = [] } = useTags(
  accountBookId,
  {
    isActive: true,
    sortBy: 'usage',
    sortOrder: 'desc',
    limit: 100,
  },
  enabled?
);

// 获取标签建议
const { data: suggestions = [] } = useTagSuggestions(
  accountBookId,
  {
    categoryId,
    description,
    limit: 4,
  },
  enabled?
);

// 批量更新交易标签
const { mutateAsync } = useUpdateTransactionTags();
await mutateAsync(transactionId, newTagIds, currentTagIds);
```

---

## 返回值速查

### Query返回值

```typescript
const {
  data,              // 查询数据
  error,             // 错误对象
  isLoading,         // 首次加载中
  isFetching,        // 获取中（包括后台刷新）
  isSuccess,         // 成功状态
  isError,           // 错误状态
  refetch,           // 手动刷新
  dataUpdatedAt,     // 数据更新时间
} = useQuery(...);
```

### Mutation返回值

```typescript
const {
  mutate,            // 触发mutation（不返回Promise）
  mutateAsync,       // 触发mutation（返回Promise）
  isPending,         // 执行中
  isSuccess,         // 成功
  isError,           // 失败
  error,             // 错误对象
  reset,             // 重置状态
} = useMutation(...);
```

---

## 常见模式

### 模式1：带初始数据的查询

```typescript
// 避免首次请求，但保持数据新鲜
const { data } = useFullTransaction(
  id,
  propsData ? {
    transaction: propsData,
    tags: propsData.tags || [],
    attachments: propsData.attachments || [],
  } : undefined
);
```

### 模式2：依赖查询

```typescript
// 等第一个查询完成后再执行第二个
const { data: user } = useUser();
const { data: posts } = usePosts(
  user?.id,
  !!user // enabled
);
```

### 模式3：并行查询

```typescript
// 多个查询同时执行
const query1 = useTransactionDetail(id1);
const query2 = useTransactionDetail(id2);
const query3 = useTransactionDetail(id3);

// 等待所有查询完成
const isLoading = query1.isLoading || query2.isLoading || query3.isLoading;
```

### 模式4：条件查询

```typescript
// 只在满足条件时查询
const { data } = useFullTransaction(
  transactionId,
  undefined,
  isModalOpen && !!transactionId // enabled
);
```

### 模式5：轮询

```typescript
const { data } = useTransactionDetail(id, {
  refetchInterval: 5000, // 每5秒刷新一次
  refetchIntervalInBackground: true, // 后台也刷新
});
```

### 模式6：手动刷新

```typescript
const { data, refetch } = useFullTransaction(id);

// 用户下拉刷新
const handleRefresh = () => {
  refetch();
};
```

### 模式7：乐观更新

```typescript
const queryClient = useQueryClient();
const mutation = useUpdateTransaction();

await mutation.mutateAsync(
  { id, data },
  {
    onMutate: async (variables) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ 
        queryKey: transactionKeys.detail(id) 
      });
      
      // 保存当前数据
      const previous = queryClient.getQueryData(
        transactionKeys.detail(id)
      );
      
      // 乐观更新
      queryClient.setQueryData(
        transactionKeys.detail(id),
        (old: any) => ({ ...old, ...data })
      );
      
      return { previous };
    },
    onError: (err, variables, context) => {
      // 回滚
      if (context?.previous) {
        queryClient.setQueryData(
          transactionKeys.detail(id),
          context.previous
        );
      }
    },
  }
);
```

---

## 配置选项速查

### Query选项

```typescript
{
  enabled: true,                    // 是否启用查询
  staleTime: 5 * 60 * 1000,        // 数据新鲜时间（5分钟）
  gcTime: 10 * 60 * 1000,          // 缓存时间（10分钟）
  retry: 1,                         // 失败重试次数
  retryDelay: 1000,                 // 重试延迟
  refetchOnMount: true,             // 组件挂载时刷新
  refetchOnWindowFocus: false,      // 窗口聚焦时刷新
  refetchOnReconnect: true,         // 网络重连时刷新
  refetchInterval: false,           // 轮询间隔
  initialData: undefined,           // 初始数据
  placeholderData: undefined,       // 占位数据
}
```

### Mutation选项

```typescript
{
  onMutate: (variables) => {},      // 执行前
  onSuccess: (data, variables) => {}, // 成功后
  onError: (error, variables) => {},  // 失败后
  onSettled: (data, error) => {},     // 完成后（无论成功失败）
  retry: 0,                           // 失败重试次数
}
```

---

## 调试技巧

### 1. 查看所有缓存

```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log(queryClient.getQueryCache().getAll());
```

### 2. 查看特定缓存

```typescript
const data = queryClient.getQueryData(transactionKeys.detail(id));
console.log('缓存数据:', data);
```

### 3. 手动设置缓存

```typescript
queryClient.setQueryData(
  transactionKeys.detail(id),
  newData
);
```

### 4. 使缓存失效

```typescript
// 使特定查询失效
queryClient.invalidateQueries({ 
  queryKey: transactionKeys.detail(id) 
});

// 使所有交易查询失效
queryClient.invalidateQueries({ 
  queryKey: transactionKeys.all 
});
```

### 5. 清除缓存

```typescript
// 清除特定查询
queryClient.removeQueries({ 
  queryKey: transactionKeys.detail(id) 
});

// 清除所有缓存
queryClient.clear();
```

---

## 性能优化

### 1. 延长缓存时间

```typescript
// 对于不常变化的数据
const { data } = useTags(accountBookId, filters, {
  staleTime: 10 * 60 * 1000, // 10分钟
  gcTime: 30 * 60 * 1000,    // 30分钟
});
```

### 2. 预加载数据

```typescript
const { prefetchByDate } = usePrefetchBudgets();

// 用户可能需要的数据提前加载
const handleDateChange = (date: string) => {
  setDate(date);
  // 预加载明天的数据
  prefetchByDate(addDays(date, 1), accountBookId);
};
```

### 3. 禁用不必要的刷新

```typescript
const { data } = useFullTransaction(id, undefined, {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});
```

### 4. 使用占位数据

```typescript
const { data } = useFullTransaction(id, {
  placeholderData: {
    transaction: { id, amount: 0, ... },
    tags: [],
    attachments: [],
  },
});
```

---

## 错误处理

### 1. 组件级错误处理

```typescript
const { data, error, isError } = useFullTransaction(id);

if (isError) {
  return <div>加载失败: {error.message}</div>;
}
```

### 2. 全局错误处理

```typescript
// apps/web/src/app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        console.error('Query错误:', error);
        toast.error('数据加载失败');
      },
    },
    mutations: {
      onError: (error) => {
        console.error('Mutation错误:', error);
        toast.error('操作失败');
      },
    },
  },
});
```

### 3. Mutation错误处理

```typescript
const mutation = useUpdateTransaction();

try {
  await mutation.mutateAsync({ id, data });
  toast.success('保存成功');
} catch (error) {
  toast.error('保存失败');
  console.error(error);
}
```

---

## 最佳实践

### ✅ 推荐

```typescript
// 1. 使用统一的hooks
import { useFullTransaction } from '@/hooks/queries';

// 2. 使用解构获取数据
const { data, isLoading, error } = useFullTransaction(id);

// 3. 提供默认值
const { data: tags = [] } = useTags(accountBookId);

// 4. 使用enabled控制查询时机
const { data } = useTags(accountBookId, filters, !!accountBookId);

// 5. 使用mutateAsync处理异步操作
await mutation.mutateAsync(data);
```

### ❌ 避免

```typescript
// 1. 不要在useEffect中调用API
useEffect(() => {
  fetchData().then(setData); // ❌
}, []);

// 2. 不要手动管理loading状态
const [loading, setLoading] = useState(false); // ❌

// 3. 不要重复定义queryKey
const key = ['transactions', id]; // ❌
// 使用统一的 transactionKeys.detail(id)

// 4. 不要忘记处理loading和error
const { data } = useQuery(...); // ❌ 没有处理loading
return <div>{data.name}</div>; // 可能报错

// 5. 不要在mutation中手动刷新数据
await updateTransaction(id, data);
await fetchTransaction(id); // ❌ React Query会自动刷新
```

---

## 迁移检查清单

- [ ] 移除所有useEffect中的数据获取
- [ ] 移除所有手动的loading状态
- [ ] 移除所有手动的error状态
- [ ] 使用统一的hooks替代直接API调用
- [ ] 确保queryKey使用统一的keys对象
- [ ] 测试数据缓存是否生效
- [ ] 测试mutation后数据是否自动刷新
- [ ] 测试错误处理是否正常
- [ ] 检查网络请求是否减少
- [ ] 检查是否有重复请求

---

## 常见问题

### Q: 数据没有自动刷新？

检查mutation的onSuccess中是否调用了invalidateQueries：

```typescript
onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ 
    queryKey: transactionKeys.detail(variables.id) 
  });
}
```

### Q: 如何强制刷新数据？

```typescript
const { refetch } = useFullTransaction(id);
refetch(); // 强制刷新
```

### Q: 如何清除所有缓存？

```typescript
import { queryClient } from '@/app/providers';
queryClient.clear();
```

### Q: 如何在非组件中使用？

```typescript
import { queryClient } from '@/app/providers';

// 手动获取数据
const data = queryClient.getQueryData(transactionKeys.detail(id));

// 手动触发查询
await queryClient.fetchQuery({
  queryKey: transactionKeys.detail(id),
  queryFn: () => fetchTransactionDetail(id),
});
```

### Q: 数据更新后其他页面没有刷新？

确保使用相同的queryKey：

```typescript
// ✅ 正确：使用统一的keys
import { transactionKeys } from '@/hooks/queries';
queryKey: transactionKeys.detail(id)

// ❌ 错误：自定义key
queryKey: ['transaction', id]
```

---

## 总结

React Query让数据管理变得简单：

1. **零配置** - 开箱即用
2. **自动缓存** - 避免重复请求
3. **自动刷新** - mutation后自动更新
4. **类型安全** - 完整TypeScript支持
5. **开发体验** - 代码量减少50%+

记住这三个核心概念：
- **Query** - 获取数据
- **Mutation** - 修改数据
- **Cache** - 自动管理

其他的，React Query都帮你搞定了！
