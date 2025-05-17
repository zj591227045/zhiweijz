# 预算详情页面开发提示词

我需要开发当前项目的"预算详情"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件 `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/预算详情页/index_new.html` 中的元素、布局和风格来实现页面。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 表单处理: React Hook Form + Zod验证
- HTTP请求: Axios + React Query
- 工具库:
  - dayjs (日期处理)
  - Font Awesome 图标 (替代lucide-react)
  - clsx/tailwind-merge (类名合并)
  - Chart.js + react-chartjs-2 (图表)

## 页面功能说明

这是一个移动端预算详情页面，具有以下核心功能：

1. 显示预算基本信息和使用情况
2. 显示预算关联的账本信息
3. 显示分类预算启用/禁用状态和分类预算详情
4. 显示预算结转情况（包括结转历史查看功能）
5. 预算使用趋势图表（支持显示/隐藏结转影响）
6. 相关交易列表（可查看全部）
7. 编辑和删除预算功能

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 左侧返回按钮（箭头图标）
- 居中标题"预算详情"
- 右侧三点菜单图标（操作菜单）

### 账本信息卡片：
- 账本图标（书本图标）
- 账本名称（如"我的账本"）
- 卡片式设计，位于页面顶部

### 预算基本信息卡片：
- 预算名称（如"餐饮月度预算"）
- 分类图标和名称（如餐饮图标和"餐饮"文字）
- 预算周期（如"2023年5月1日 - 2023年5月31日"）
- 预算金额（大字体显示，如"¥1,000.00"）
- 结转信息区域：
  - 结转标识（带有交换图标）
  - 结转金额（正值为绿色，负值为红色）
  - 结转历史按钮（带有历史图标）
- 预算进度容器：
  - 已用金额和百分比（如"已用: ¥650.00 (65%)"）
  - 剩余金额（如"剩余: ¥450.00"）
  - 进度条（颜色根据使用情况变化）
- 预算统计信息：
  - 剩余天数（如"15天"）
  - 日均消费（如"¥23.33"）
  - 日均可用（如"¥43.33"）

### 分类预算状态区域：
- 区域标题"分类预算状态"
- 分类预算开关（启用/禁用）
- 分类预算列表：
  - 分类图标和名称
  - 分类预算金额
  - 分类进度条
  - 已用金额和百分比

### 预算趋势图表：
- 区域标题"预算使用趋势"
- 图表视图切换（日/周/月）
- 结转影响显示开关
- 趋势图表区域（显示预算使用趋势）

### 相关交易列表：
- 区域标题"相关交易"
- 交易项目列表：
  - 交易图标（与分类对应）
  - 交易标题
  - 交易日期/时间
  - 交易金额
- 查看全部按钮

### 底部操作区：
- 编辑预算按钮（主要按钮，蓝色）
- 删除按钮（次要按钮，红色边框）

## 交互逻辑

实现以下交互功能：

1. 页面加载：
   - 根据URL参数获取预算ID
   - 加载预算详情数据
   - 加载预算趋势数据
   - 加载相关交易数据
   - 加载账本信息
   - 显示加载状态（骨架屏）

2. 账本信息显示：
   - 显示当前预算所属的账本信息
   - 账本图标根据账本类型显示不同图标（个人/家庭）

3. 结转信息交互：
   - 如果预算启用了结转，显示结转标识和金额
   - 结转金额根据正负值显示不同颜色（正值绿色，负值红色）
   - 点击结转历史按钮打开结转历史弹窗
   - 结转历史弹窗显示历史结转记录

4. 分类预算状态交互：
   - 显示分类预算开关状态（启用/禁用）
   - 如果启用了分类预算，显示分类预算列表
   - 分类预算列表显示每个分类的预算使用情况
   - 分类预算进度条根据使用百分比显示不同颜色

5. 图表交互：
   - 点击图表视图切换按钮（日/周/月）切换不同时间维度
   - 切换结转影响显示开关，显示/隐藏结转对预算的影响
   - 点击图表上的数据点显示详细信息
   - 图表显示预算使用趋势和预测

6. 交易列表交互：
   - 显示与当前预算相关的交易记录
   - 点击交易项跳转到交易详情页
   - 点击"查看全部"按钮跳转到交易列表页（带预算筛选）
   - 支持下拉加载更多交易

7. 编辑操作：
   - 点击编辑按钮跳转到预算编辑页面
   - 编辑完成后返回并刷新详情
   - 支持修改预算的基本信息、分类预算和结转设置

8. 删除操作：
   - 点击删除按钮显示确认对话框
   - 确认后执行删除并返回预算列表页
   - 显示操作结果反馈（成功/失败）

## 状态管理

使用Zustand创建一个预算详情状态仓库，包含以下状态：

```typescript
interface BudgetDetailStore {
  // 数据状态
  budget: Budget | null;
  accountBook: AccountBook | null;
  categoryBudgets: CategoryBudget[];
  rolloverHistory: RolloverRecord[];
  trendData: {
    daily: TrendPoint[];
    weekly: TrendPoint[];
    monthly: TrendPoint[];
  };
  transactions: Transaction[];

  // UI状态
  isLoading: boolean;
  isRolloverHistoryOpen: boolean;
  chartViewMode: 'daily' | 'weekly' | 'monthly';
  showRolloverImpact: boolean;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;

  // 操作方法
  fetchBudgetDetail: (budgetId: string) => Promise<void>;
  fetchRolloverHistory: () => Promise<void>;
  fetchTrendData: () => Promise<void>;
  fetchTransactions: (page?: number) => Promise<void>;
  setChartViewMode: (mode: 'daily' | 'weekly' | 'monthly') => void;
  toggleRolloverImpact: () => void;
  toggleRolloverHistory: () => void;
  deleteBudget: () => Promise<void>;
  toggleDeleteDialog: () => void;
}
```

## 数据模型和API集成

### 数据模型

1. 预算模型：
```typescript
interface Budget {
  id: string;
  name: string;
  accountBookId: string;
  accountBookName: string;
  accountBookType: 'PERSONAL' | 'FAMILY';
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  enableCategoryBudget: boolean;
  startDate: string;
  endDate: string;
  period: 'MONTHLY' | 'YEARLY';
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysTotal: number;
  daysRemaining: number;
  dailySpent: number;
  dailyAvailable: number;
  rollover: boolean;
  rolloverAmount?: number;
}
```

2. 账本模型：
```typescript
interface AccountBook {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  familyId?: string;
}
```

3. 分类预算模型：
```typescript
interface CategoryBudget {
  id: string;
  budgetId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
}
```

4. 结转记录模型：
```typescript
interface RolloverRecord {
  id: string;
  budgetId: string;
  period: string;
  amount: number;
  type: 'SURPLUS' | 'DEFICIT';
  createdAt: string;
}
```

5. 趋势数据点模型：
```typescript
interface TrendPoint {
  date: string; // 或 week/month 标识
  amount: number;
  rolloverImpact: number;
  total: number;
}
```

6. 交易模型：
```typescript
interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  time: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  budgetId: string;
}
```

### API端点

1. 获取预算详情：
```
GET /api/budgets/:id
```

2. 获取分类预算：
```
GET /api/budgets/:id/categories
```

3. 获取预算趋势：
```
GET /api/budgets/:id/trends?viewMode=daily|weekly|monthly
```

4. 获取预算结转历史：
```
GET /api/budgets/:id/rollover-history
```

5. 获取相关交易：
```
GET /api/budgets/:id/transactions?page=1&limit=10
```

6. 删除预算：
```
DELETE /api/budgets/:id
```

### React Query集成

```typescript
// 获取预算详情
const { data: budget, isLoading } = useQuery({
  queryKey: ['budget', budgetId],
  queryFn: () => budgetService.getBudgetDetail(budgetId),
  enabled: !!budgetId
});

// 获取分类预算
const { data: categoryBudgets } = useQuery({
  queryKey: ['categoryBudgets', budgetId],
  queryFn: () => budgetService.getCategoryBudgets(budgetId),
  enabled: !!budgetId && !!budget?.enableCategoryBudget
});

// 获取预算趋势
const { data: trendData } = useQuery({
  queryKey: ['budgetTrends', budgetId, chartViewMode],
  queryFn: () => budgetService.getBudgetTrends(budgetId, chartViewMode),
  enabled: !!budgetId
});

// 获取结转历史
const { data: rolloverHistory } = useQuery({
  queryKey: ['rolloverHistory', budgetId],
  queryFn: () => budgetService.getRolloverHistory(budgetId),
  enabled: !!budgetId && !!budget?.rollover
});

// 获取相关交易
const {
  data: transactionsData,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['budgetTransactions', budgetId],
  queryFn: ({ pageParam = 1 }) =>
    budgetService.getBudgetTransactions(budgetId, pageParam),
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.nextPage : undefined,
  enabled: !!budgetId
});

// 删除预算
const deleteMutation = useMutation({
  mutationFn: () => budgetService.deleteBudget(budgetId),
  onSuccess: () => {
    toast.success('预算已删除');
    router.push('/budgets');
  }
});
```

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function BudgetDetailPage() {
     // 右侧操作按钮示例
     const rightActions = (
       <OptionsMenu
         onEdit={handleEdit}
         onDelete={() => setIsDeleteDialogOpen(true)}
       />
     );

     return (
       <PageContainer
         title={budget?.name || "预算详情"}
         rightActions={rightActions}
         showBackButton={true}
         activeNavItem="budget"
       >
         {/* 页面内容 */}
         <AccountBookInfo accountBook={accountBook} />
         <BudgetHeader budget={budget} />
         {budget?.enableCategoryBudget && (
           <CategoryBudgetStatus categoryBudgets={categoryBudgets} />
         )}
         <BudgetTrendChart
           data={trendData}
           showRolloverImpact={showRolloverImpact}
         />
         <RelatedTransactions transactions={transactions} />
         <BottomActions onEdit={handleEdit} onDelete={handleDelete} />

         {/* 对话框 */}
         {isRolloverHistoryOpen && (
           <RolloverHistoryDialog
             history={rolloverHistory}
             onClose={() => setIsRolloverHistoryOpen(false)}
           />
         )}
         {isDeleteDialogOpen && (
           <DeleteConfirmDialog
             onConfirm={handleDelete}
             onCancel={() => setIsDeleteDialogOpen(false)}
             isDeleting={isDeleting}
           />
         )}
       </PageContainer>
     );
   }
   ```

3. **参考文档**：
   - 详细了解 PageContainer 组件的使用方法，请参考 `docs/page_layout_guidelines.md` 文档
   - 该文档包含了组件的所有属性、使用示例和最佳实践

4. **移动端优先**：
   - 所有页面应保持移动端的固定宽度（最大宽度480px）
   - 即使在宽屏上也不应扩展到整个屏幕宽度
   - PageContainer 组件已经实现了这一限制，请不要覆盖这些样式

5. **代码审查检查点**：
   - 确保页面使用了 PageContainer 组件作为最外层容器
   - 确保没有使用自定义的容器结构覆盖全局样式
   - 确保为页面指定了正确的 activeNavItem
   - 确保页面内容结构符合移动端优先的设计原则

## 组件结构

根据HTML示例页面，设计以下组件结构：

```
/pages/budgets/[id].tsx (或 /app/budgets/[id]/page.tsx)
├── BudgetDetailPage - 主页面（使用PageContainer）
├── OptionsMenu - 操作菜单
├── AccountBookInfo - 账本信息卡片
├── BudgetHeader - 预算基本信息卡片
│   ├── BudgetName - 预算名称
│   ├── CategoryInfo - 分类图标和名称
│   ├── BudgetPeriod - 预算周期
│   ├── BudgetAmount - 预算金额
│   ├── RolloverInfo - 结转信息区域
│   │   ├── RolloverBadge - 结转标识
│   │   └── RolloverHistoryButton - 结转历史按钮
│   ├── BudgetProgress - 预算进度容器
│   │   ├── BudgetProgressInfo - 进度信息
│   │   └── ProgressBar - 进度条
│   └── BudgetStats - 预算统计信息
├── CategoryBudgetStatus - 分类预算状态区域
│   ├── SectionHeader - 区域标题和开关
│   └── CategoryBudgetList - 分类预算列表
│       └── CategoryBudgetItem - 分类预算项
│           ├── CategoryIcon - 分类图标
│           ├── CategoryBudgetHeader - 分类预算标题
│           ├── CategoryProgressBar - 分类进度条
│           └── CategoryProgressInfo - 分类进度信息
├── BudgetTrendChart - 预算趋势图表区域
│   ├── SectionTitle - 区域标题
│   ├── ChartTabs - 图表视图切换
│   ├── RolloverToggle - 结转影响显示开关
│   └── TrendChart - 趋势图表
├── RelatedTransactions - 相关交易列表
│   ├── SectionTitle - 区域标题
│   ├── TransactionList - 交易列表
│   │   └── TransactionItem - 交易项
│   └── ViewAllButton - 查看全部按钮
├── BottomActions - 底部操作区
│   ├── EditButton - 编辑预算按钮
│   └── DeleteButton - 删除预算按钮
└── Dialogs - 对话框组件
    ├── RolloverHistoryDialog - 结转历史对话框
    └── DeleteConfirmDialog - 删除确认对话框
```

## 具体组件实现

### 1. 账本信息卡片

```tsx
const AccountBookInfo = ({ accountBook }: { accountBook: AccountBook }) => {
  return (
    <div className="account-book-info">
      <i className={`fas fa-${accountBook.type === 'PERSONAL' ? 'book' : 'users'}`}></i>
      <span>{accountBook.name}</span>
    </div>
  );
};
```

### 2. 预算进度条

```tsx
interface ProgressBarProps {
  percentage: number;
  isOverspent?: boolean;
}

const ProgressBar = ({ percentage, isOverspent }: ProgressBarProps) => {
  // 根据进度确定颜色
  const getProgressColor = () => {
    if (isOverspent || percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-orange-500';
    if (percentage > 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <div className="progress-bar">
      <div
        className={`progress-fill ${getProgressColor()}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  );
};
```

### 3. 结转标识

```tsx
interface RolloverBadgeProps {
  amount: number;
}

const RolloverBadge = ({ amount }: RolloverBadgeProps) => {
  const isPositive = amount > 0;

  return (
    <div className={`rollover-badge ${isPositive ? 'positive' : 'negative'}`}>
      <i className="fas fa-exchange-alt"></i>
      <span>
        {isPositive ? '+' : ''}¥{Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );
};
```

### 4. 分类预算开关

```tsx
interface CategoryBudgetToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const CategoryBudgetToggle = ({ enabled, onChange }: CategoryBudgetToggleProps) => {
  return (
    <div className="category-budget-toggle">
      <span>启用分类预算</span>
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        className="ml-2"
      />
    </div>
  );
};
```

### 5. 趋势图表

```tsx
interface TrendChartProps {
  data: TrendPoint[];
  showRolloverImpact: boolean;
}

const TrendChart = ({ data, showRolloverImpact }: TrendChartProps) => {
  const chartData = {
    labels: data.map(point => point.date),
    datasets: [
      {
        label: '支出',
        data: data.map(point => point.amount),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
      ...(showRolloverImpact ? [
        {
          label: '结转影响',
          data: data.map(point => point.total),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.5)',
          borderDash: [5, 5],
          tension: 0.3,
        }
      ] : [])
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `¥${context.parsed.y.toLocaleString()}`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return `¥${value}`;
          }
        }
      }
    }
  };

  return (
    <div className="trend-chart">
      <Line data={chartData} options={options} />
    </div>
  );
};
```

## 响应式设计

使用Tailwind CSS实现移动优先的响应式设计：

```tsx
// 移动端基础样式
<div className="px-4 pb-16 pt-2">
  {/* 组件内容 */}
</div>

// 平板/桌面端响应式调整
<style jsx>{`
  @media (min-width: 768px) {
    .budget-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .budget-stats {
      grid-column: span 2;
    }

    .chart-section {
      margin-top: 24px;
    }
  }

  @media (min-width: 1024px) {
    .main-layout {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }

    .transactions-section {
      grid-column: 2;
      grid-row: span 2;
    }

    .chart-section {
      grid-column: 1;
    }
  }
`}</style>
```

## 样式实现

使用Tailwind CSS实现关键组件样式：

```tsx
// 账本信息卡片样式
<div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
  <i className="fas fa-book text-blue-500 mr-2"></i>
  <span className="font-medium">我的账本</span>
</div>

// 预算基本信息卡片样式
<div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-4 shadow">
  <div className="text-lg font-semibold mb-3">餐饮月度预算</div>

  <div className="flex items-center mb-4">
    <div className="w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center mr-3">
      <i className="fas fa-utensils"></i>
    </div>
    <div className="font-medium">餐饮</div>
  </div>

  <div className="text-sm text-gray-500 mb-3">2023年5月1日 - 2023年5月31日</div>

  <div className="text-2xl font-bold mb-4">¥1,000.00</div>

  <div className="flex justify-between items-center mb-4">
    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-600">
      <i className="fas fa-exchange-alt mr-1 text-xs"></i>
      <span>本月结转: +¥100.00</span>
    </div>
    <button className="flex items-center text-blue-500 text-sm">
      <i className="fas fa-history mr-1"></i>
      <span>结转历史</span>
    </button>
  </div>

  <div className="mb-4">
    <div className="flex justify-between mb-2">
      <div className="text-gray-700">已用: ¥650.00 (65%)</div>
      <div className="text-green-600">剩余: ¥450.00</div>
    </div>
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: '65%' }}></div>
    </div>
  </div>

  <div className="grid grid-cols-3 gap-2">
    <div className="text-center">
      <div className="text-base font-semibold">15天</div>
      <div className="text-xs text-gray-500">剩余天数</div>
    </div>
    <div className="text-center">
      <div className="text-base font-semibold">¥23.33</div>
      <div className="text-xs text-gray-500">日均消费</div>
    </div>
    <div className="text-center">
      <div className="text-base font-semibold">¥43.33</div>
      <div className="text-xs text-gray-500">日均可用</div>
    </div>
  </div>
</div>

// 分类预算开关样式
<div className="flex justify-between items-center mb-4">
  <h2 className="text-base font-semibold">分类预算状态</h2>
  <div className="flex items-center">
    <span className="text-sm text-gray-500 mr-2">启用分类预算</span>
    <Switch checked={enableCategoryBudget} onCheckedChange={setEnableCategoryBudget} />
  </div>
</div>

// 底部操作按钮样式
<div className="fixed bottom-0 left-0 right-0 flex gap-3 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
  <Button className="flex-1 bg-blue-500 hover:bg-blue-600">编辑预算</Button>
  <Button
    variant="outline"
    className="flex-1 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900"
  >
    删除
  </Button>
</div>
```

## 无障碍性

确保页面符合基本无障碍性要求：

- 为所有图表添加`aria-label`和描述性文本
- 为交互元素添加适当的ARIA属性：
  ```tsx
  <button
    aria-label="查看结转历史"
    className="rollover-history-button"
  >
    <i className="fas fa-history"></i>
    <span>结转历史</span>
  </button>
  ```
- 确保颜色对比度符合WCAG标准
- 支持键盘导航和焦点管理
- 为删除操作添加确认机制：
  ```tsx
  <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>确认删除</AlertDialogTitle>
        <AlertDialogDescription>
          您确定要删除此预算吗？此操作无法撤销。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>取消</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDelete}
          className="bg-red-500 hover:bg-red-600"
        >
          删除
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```

## 其他技术实现

### 1. 骨架屏加载状态

```tsx
const BudgetDetailSkeleton = () => (
  <>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow animate-pulse">
      <div className="flex items-center">
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full mr-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 mb-4 shadow animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"></div>

      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
      </div>

      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>

      <div className="flex justify-between items-center mb-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-12 mb-1"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mx-auto w-16"></div>
          </div>
        ))}
      </div>
    </div>
  </>
);
```

### 2. 结转历史对话框

```tsx
const RolloverHistoryDialog = ({
  open,
  onOpenChange,
  history
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: RolloverRecord[]
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>结转历史</DialogTitle>
          <DialogDescription>
            查看预算结转的历史记录
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[300px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              暂无结转历史记录
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(record => (
                <div
                  key={record.id}
                  className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{record.period}</div>
                    <div className="text-sm text-gray-500">
                      {record.type === 'SURPLUS' ? '结余' : '超支'}
                    </div>
                  </div>
                  <div className={`font-semibold ${
                    record.type === 'SURPLUS' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'SURPLUS' ? '+' : '-'}
                    ¥{Math.abs(record.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

## 附加功能(如时间允许)

1. **预算结转历史详细查看**：添加结转历史详情页，显示每个月的结转记录和影响。

2. **预算调整功能**：允许用户在详情页直接调整预算金额，无需进入编辑页面。

3. **预算分享功能**：添加分享按钮，生成预算执行情况的分享图片或链接。

4. **预算复制功能**：添加"复制到下月"按钮，快速创建下月相同设置的预算。

5. **高级分析**：添加消费模式分析和异常检测功能，帮助用户发现消费异常。

6. **预算结转模拟器**：添加工具，模拟不同结转策略对预算执行的影响。

7. **预算执行预测**：基于历史数据，预测当前预算周期的执行情况和可能的结果。
