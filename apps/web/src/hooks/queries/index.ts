/**
 * React Query Hooks 统一导出
 * 
 * 使用指南：
 * 1. 优先使用这些hooks替代直接的API调用
 * 2. React Query会自动处理缓存、重复请求去重、错误重试
 * 3. 相同的queryKey会共享缓存，避免重复请求
 * 
 * 示例：
 * ```tsx
 * // ❌ 旧方式：手动管理状态和请求
 * const [data, setData] = useState(null);
 * const [loading, setLoading] = useState(false);
 * useEffect(() => {
 *   setLoading(true);
 *   fetchData().then(setData).finally(() => setLoading(false));
 * }, []);
 * 
 * // ✅ 新方式：使用React Query
 * const { data, isLoading } = useTransactionDetail(id);
 * ```
 */

// 交易相关
export {
  useTransactionDetail,
  useTransactionTags,
  useTransactionAttachments,
  useFullTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  transactionKeys,
} from './useTransactionQueries';

// 预算相关
export {
  useActiveBudgets,
  useBudgetsByDate,
  usePrefetchBudgets,
  budgetKeys,
  type BudgetDisplay,
} from './useBudgetQueries';

// 标签相关
export {
  useTags,
  useTagSuggestions,
  useAddTransactionTags,
  useRemoveTransactionTag,
  useUpdateTransactionTags,
  tagKeys,
} from './useTagQueries';
