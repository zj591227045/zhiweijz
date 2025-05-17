# 预算列表页面开发提示词

我需要开发当前项目的"预算列表"页面，使用Next.js 14框架和现代React技术栈实现。参考HTML示例页面：`/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/预算列表页/index_new.html`。

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

## 页面功能说明

这是一个移动端预算管理页面，具有以下核心功能：

1. 账本选择（个人账本/家庭账本）
2. 预算类型切换（月度/年度）
3. 预算周期选择（当月、上月、自定义）
4. 总体预算进度展示（含结转金额）
5. 分类预算卡片列表（根据账本类型显示不同内容）
6. 添加新预算功能
7. 预算超支警告
8. 预算结转显示（正值为结余，负值为超支）

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 居中标题"预算管理"
- 右侧添加按钮（加号图标）

### 账本选择器：
- 居中显示当前选中的账本
- 账本图标 + 账本名称 + 下拉箭头
- 点击展开账本列表

### 预算类型切换：
- 水平排列的两个按钮（月度预算/年度预算）
- 当前选中的类型高亮显示（蓝色背景白色文字）

### 月份选择器：
- 左右箭头用于切换月份
- 中间显示当前选中的月份（如"2023年5月"）

### 总体预算概览卡片：
- 卡片标题"月度预算"
- 右上角显示"剩余XX天"
- 三个金额显示：总预算、已支出、剩余
- 水平进度条显示预算使用百分比
- 结转信息显示（如"本月结转: +¥200"）
- 日均可用金额显示

### 分类预算列表：
- 标题"分类预算"
- 右侧筛选选项（全部/超支/结转）
- 预算卡片列表，每个卡片包含：
  - 左侧分类图标和名称
  - 右侧预算进度条和金额信息
  - 进度条颜色根据使用情况变化（正常/警告/超支）
  - 结转标识（如适用，显示结转金额）

### 家庭成员预算（仅家庭账本）：
- 标题"家庭成员预算"
- 右侧筛选选项
- 按家庭成员分组显示预算
- 每个成员区块可展开/折叠
- 成员预算卡片与个人预算卡片样式一致

### 底部导航栏：
- 五个导航项：首页、统计、添加（中间大按钮）、预算（当前选中）、我的
- 每个导航项包含图标和文字
- 当前页面对应的导航项高亮显示

## 交互逻辑

实现以下交互功能：

1. 账本选择：
   - 点击账本选择器显示用户的所有账本
   - 选择账本后刷新预算数据
   - 根据账本类型（个人/家庭）显示不同的预算列表
   - 个人账本不显示家庭成员预算区块
   - 家庭账本显示家庭成员预算区块

2. 预算类型切换：
   - 点击"月度预算"/"年度预算"按钮切换预算类型
   - 切换后刷新预算数据和UI显示
   - 当前选中类型按钮高亮显示

3. 月份选择：
   - 点击左右箭头切换上个月/下个月
   - 切换月份后刷新预算数据
   - 支持点击当前月份打开月份选择器

4. 家庭成员预算交互（仅家庭账本）：
   - 点击成员区块的展开/折叠按钮切换显示状态
   - 支持筛选特定成员的预算
   - 支持按预算状态筛选（全部/超支）

5. 预算卡片交互：
   - 点击预算卡片进入预算详情页
   - 长按显示快捷操作菜单（编辑、删除）
   - 超支预算进度条显示红色警告效果
   - 有结转金额的预算显示结转标识（绿色为正值，红色为负值）

6. 添加预算：
   - 点击顶部导航栏的添加按钮跳转到添加预算页面
   - 如果所有分类都已有预算，显示提示

7. 下拉刷新：
   - 支持下拉刷新获取最新预算数据

8. 底部导航：
   - 点击底部导航栏的其他项目可跳转到对应页面
   - 中间的大号添加按钮用于快速添加交易

## 状态管理

使用Zustand创建一个预算管理状态仓库，包含以下状态：

```typescript
interface BudgetStore {
  // 账本相关
  accountBooks: AccountBook[];
  selectedAccountBook: AccountBook | null;

  // 预算类型和周期
  budgetType: 'MONTHLY' | 'YEARLY';
  currentPeriod: {
    startDate: Date;
    endDate: Date;
    displayText: string;
  };

  // 家庭成员（仅家庭账本）
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string | null;

  // 预算数据
  totalBudget: TotalBudget | null;
  budgets: Budget[];
  familyBudgets: Record<string, Budget[]>; // 按成员ID分组的预算

  // UI状态
  isLoading: boolean;
  isRefreshing: boolean;
  isDeleting: boolean;
  activeFilter: 'all' | 'overspent' | 'rollover';

  // 操作方法
  setSelectedAccountBook: (accountBook: AccountBook) => void;
  setBudgetType: (type: 'MONTHLY' | 'YEARLY') => void;
  setCurrentPeriod: (period: { startDate: Date; endDate: Date }) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  setSelectedFamilyMember: (memberId: string | null) => void;
  setActiveFilter: (filter: 'all' | 'overspent' | 'rollover') => void;
  refreshBudgets: () => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
}
```

## 数据模型和API集成

### API端点

1. 获取账本列表：
   ```
   GET /api/account-books
   ```

2. 获取预算列表：
   ```
   GET /api/budgets?accountBookId={accountBookId}&period={period}&startDate={startDate}&endDate={endDate}&familyMemberId={familyMemberId}
   ```

3. 获取家庭成员列表：
   ```
   GET /api/families/:familyId/members
   ```

4. 删除预算：
   ```
   DELETE /api/budgets/:id
   ```

### 数据模型

1. 账本模型：
   ```typescript
   interface AccountBook {
     id: string;
     name: string;
     type: 'PERSONAL' | 'FAMILY';
     familyId?: string;
   }
   ```

2. 家庭成员模型：
   ```typescript
   interface FamilyMember {
     id: string;
     name: string;
     avatar?: string;
   }
   ```

3. 总体预算模型：
   ```typescript
   interface TotalBudget {
     amount: number;
     spent: number;
     remaining: number;
     percentage: number;
     daysRemaining: number;
     rolloverAmount?: number;
     dailyAvailable: number;
   }
   ```

4. 预算模型：
   ```typescript
   interface Budget {
     id: string;
     name: string;
     categoryId?: string;
     categoryName?: string;
     categoryIcon?: string;
     amount: number;
     spent: number;
     remaining: number;
     percentage: number;
     isOverspent: boolean;
     rollover: boolean;
     rolloverAmount?: number;
     enableCategoryBudget: boolean;
     userId: string;
     familyMemberId?: string;
   }
   ```

### API响应示例

获取预算列表的响应：

```json
{
  "totalBudget": {
    "amount": 8000,
    "spent": 5320,
    "remaining": 2680,
    "percentage": 66.5,
    "daysRemaining": 15,
    "rolloverAmount": 200,
    "dailyAvailable": 178.67
  },
  "budgets": [
    {
      "id": "uuid-1",
      "name": "餐饮预算",
      "categoryId": "cat-1",
      "categoryName": "餐饮",
      "categoryIcon": "utensils",
      "amount": 2000,
      "spent": 1200,
      "remaining": 800,
      "percentage": 60,
      "isOverspent": false,
      "rollover": true,
      "rolloverAmount": 100,
      "enableCategoryBudget": true,
      "userId": "user-1"
    },
    {
      "id": "uuid-2",
      "name": "购物预算",
      "categoryId": "cat-2",
      "categoryName": "购物",
      "categoryIcon": "shopping-bag",
      "amount": 1500,
      "spent": 1800,
      "remaining": -300,
      "percentage": 120,
      "isOverspent": true,
      "rollover": true,
      "rolloverAmount": -300,
      "enableCategoryBudget": true,
      "userId": "user-1"
    }
  ]
}
```

### React Query集成

使用React Query处理API请求：

```typescript
// 获取账本列表
const { data: accountBooks, isLoading: isLoadingAccountBooks } = useQuery({
  queryKey: ['accountBooks'],
  queryFn: () => accountBookService.getAccountBooks()
});

// 获取预算列表
const { data: budgetData, isLoading: isLoadingBudgets, refetch } = useQuery({
  queryKey: ['budgets', selectedAccountBook?.id, budgetType, currentPeriod, selectedFamilyMemberId],
  queryFn: () => budgetService.getBudgets({
    accountBookId: selectedAccountBook?.id,
    period: budgetType,
    startDate: currentPeriod.startDate,
    endDate: currentPeriod.endDate,
    familyMemberId: selectedFamilyMemberId
  }),
  enabled: !!selectedAccountBook
});

// 获取家庭成员列表（仅家庭账本）
const { data: familyMembers } = useQuery({
  queryKey: ['familyMembers', selectedAccountBook?.familyId],
  queryFn: () => familyService.getFamilyMembers(selectedAccountBook?.familyId as string),
  enabled: !!selectedAccountBook?.familyId
});

// 删除预算
const deleteMutation = useMutation({
  mutationFn: (budgetId: string) => budgetService.deleteBudget(budgetId),
  onSuccess: () => {
    refetch();
    toast.success('预算已删除');
  }
});
```

## 组件结构

根据HTML示例页面，设计以下组件结构：

```
/pages/budgets/index.tsx (或 /app/budgets/page.tsx)
├── Header - 顶部导航栏
├── AccountBookSelector - 账本选择器
├── BudgetTypeSelector - 预算类型切换（月度/年度）
├── MonthSelector - 月份选择器
├── BudgetOverview - 预算概览卡片
│   ├── BudgetHeader - 标题和剩余天数
│   ├── BudgetAmounts - 金额信息（总预算/已支出/剩余）
│   ├── BudgetProgressBar - 进度条
│   ├── RolloverInfo - 结转信息
│   └── DailyBudget - 日均可用金额
├── CategoryBudgets - 分类预算区块
│   ├── SectionHeader - 区块标题和筛选选项
│   └── BudgetList - 预算卡片列表
│       └── BudgetCard - 预算卡片
│           ├── CategoryInfo - 分类图标和名称
│           ├── BudgetDetails - 预算详情
│           │   ├── BudgetProgressBar - 进度条
│           │   ├── BudgetAmounts - 金额信息
│           │   └── RolloverBadge - 结转标识（如适用）
├── FamilyBudgets - 家庭成员预算区块（仅家庭账本）
│   ├── SectionHeader - 区块标题和筛选选项
│   └── FamilyMemberList - 家庭成员列表
│       └── FamilyMemberSection - 家庭成员区块
│           ├── MemberHeader - 成员信息和展开/折叠按钮
│           └── MemberBudgets - 成员预算列表
│               └── BudgetCard - 预算卡片（同上）
└── BottomNavigation - 底部导航栏
```

## 具体组件实现

### 1. 账本选择器

```tsx
const AccountBookSelector = () => {
  const { accountBooks, selectedAccountBook, setSelectedAccountBook } = useBudgetStore();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="account-book-selector">
      <div
        className="selected-account-book"
        onClick={() => setIsOpen(true)}
      >
        <i className="fas fa-book"></i>
        <span>{selectedAccountBook?.name || '选择账本'}</span>
        <i className="fas fa-chevron-down"></i>
      </div>

      {isOpen && (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>选择账本</SheetTitle>
            </SheetHeader>
            <div className="account-book-list">
              {accountBooks.map(book => (
                <div
                  key={book.id}
                  className={`account-book-item ${selectedAccountBook?.id === book.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedAccountBook(book);
                    setIsOpen(false);
                  }}
                >
                  <i className={`fas fa-${book.type === 'PERSONAL' ? 'book' : 'users'}`}></i>
                  <span>{book.name}</span>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};
```

### 2. 预算卡片

```tsx
interface BudgetCardProps {
  budget: Budget;
  onPress: (budget: Budget) => void;
  onLongPress: (budget: Budget) => void;
}

const BudgetCard = ({ budget, onPress, onLongPress }: BudgetCardProps) => {
  // 根据进度确定颜色
  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 80) return 'bg-orange-500';
    if (percentage > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div
      className={`budget-item ${budget.isOverspent ? 'warning' : ''}`}
      onClick={() => onPress(budget)}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress(budget);
      }}
    >
      <div className="budget-category">
        <i className={`fas fa-${budget.categoryIcon || 'circle'} category-icon`}></i>
        <span>{budget.categoryName || budget.name}</span>
      </div>
      <div className="budget-details">
        <div className="budget-progress">
          <div className="progress-bar">
            <div
              className={`progress ${getProgressColor(budget.percentage)}`}
              style={{ width: `${Math.min(budget.percentage, 100)}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{budget.percentage}%</div>
        </div>
        <div className="budget-amounts">
          <span className="spent">¥{budget.spent.toLocaleString()}</span>
          <span className="separator">/</span>
          <span className="total">¥{budget.amount.toLocaleString()}</span>
        </div>
        {budget.rollover && budget.rolloverAmount !== 0 && (
          <div className={`rollover-badge ${budget.rolloverAmount > 0 ? 'positive' : 'negative'}`}>
            <i className="fas fa-exchange-alt"></i>
            <span>{budget.rolloverAmount > 0 ? '+' : ''}¥{Math.abs(budget.rolloverAmount).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
```

## 样式实现

使用Tailwind CSS实现样式，参考HTML示例页面的样式：

```tsx
// 预算类型选择器样式
<div className="flex justify-center mb-4 bg-white dark:bg-gray-800 rounded-full p-1 shadow">
  <button
    className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
      budgetType === 'MONTHLY'
        ? 'bg-blue-500 text-white'
        : 'text-gray-500 dark:text-gray-400'
    }`}
    onClick={() => setBudgetType('MONTHLY')}
  >
    月度预算
  </button>
  <button
    className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
      budgetType === 'YEARLY'
        ? 'bg-blue-500 text-white'
        : 'text-gray-500 dark:text-gray-400'
    }`}
    onClick={() => setBudgetType('YEARLY')}
  >
    年度预算
  </button>
</div>

// 月份选择器样式
<div className="flex items-center justify-between mb-4">
  <button className="w-8 h-8 flex items-center justify-center" onClick={prevMonth}>
    <i className="fas fa-chevron-left text-gray-500"></i>
  </button>
  <div className="text-base font-medium">{currentPeriod.displayText}</div>
  <button className="w-8 h-8 flex items-center justify-center" onClick={nextMonth}>
    <i className="fas fa-chevron-right text-gray-500"></i>
  </button>
</div>

// 预算概览卡片样式
<div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
  <div className="flex justify-between items-center mb-2">
    <h2 className="text-lg font-semibold">月度预算</h2>
    <div className="text-sm text-gray-500">剩余15天</div>
  </div>

  <div className="grid grid-cols-3 gap-2 mb-4">
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">总预算</div>
      <div className="text-base font-semibold">¥8,000</div>
    </div>
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">已支出</div>
      <div className="text-base font-semibold">¥5,320</div>
    </div>
    <div className="text-center">
      <div className="text-xs text-gray-500 mb-1">剩余</div>
      <div className="text-base font-semibold">¥2,680</div>
    </div>
  </div>

  <div className="mb-2">
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: '66.5%' }}></div>
    </div>
    <div className="text-right text-xs mt-1">66.5%</div>
  </div>

  <div className="flex justify-center items-center text-sm mb-2">
    <span className="text-gray-500">本月结转: </span>
    <span className="text-green-500 font-medium mx-1">+¥200</span>
    <i className="fas fa-info-circle text-gray-400 text-xs"></i>
  </div>

  <div className="flex justify-center items-center text-sm">
    <span className="text-gray-500">日均可用: </span>
    <span className="font-medium">¥178.67</span>
  </div>
</div>
```

## 响应式设计

实现移动优先的响应式设计：

```tsx
// 移动端基础样式
<div className="px-4 pb-16 pt-2">
  {/* 组件内容 */}
</div>

// 平板/桌面端响应式调整
<style jsx>{`
  @media (min-width: 768px) {
    .budget-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
  }

  @media (min-width: 1024px) {
    .budget-list {
      grid-template-columns: repeat(3, 1fr);
    }

    .layout-container {
      display: grid;
      grid-template-columns: 250px 1fr;
      gap: 24px;
    }

    .sidebar {
      position: sticky;
      top: 24px;
      height: calc(100vh - 48px);
    }
  }
`}</style>
```

## 其他技术实现

### 1. 预算进度条颜色逻辑

```tsx
const getProgressColor = (percentage: number) => {
  if (percentage > 100) return 'bg-red-500'; // 红色
  if (percentage > 80) return 'bg-orange-500'; // 橙色
  if (percentage > 50) return 'bg-yellow-500'; // 黄色
  return 'bg-green-500'; // 绿色
};
```

### 2. 结转金额显示逻辑

```tsx
{budget.rolloverAmount && (
  <div
    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
      budget.rolloverAmount > 0
        ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
        : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
    }`}
  >
    <i className="fas fa-exchange-alt mr-1 text-xs"></i>
    <span>
      {budget.rolloverAmount > 0 ? '+' : ''}
      ¥{Math.abs(budget.rolloverAmount).toLocaleString()}
    </span>
  </div>
)}
```

### 3. 骨架屏加载状态

```tsx
const BudgetListSkeleton = () => (
  <>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow animate-pulse">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-1/3"></div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mx-auto"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mx-auto"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mx-auto"></div>
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-2"></div>
    </div>

    {[1, 2, 3].map(i => (
      <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 shadow animate-pulse">
        <div className="flex justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full mr-3"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-32"></div>
          </div>
        </div>
      </div>
    ))}
  </>
);
```

## 附加功能(如时间允许)

1. **预算使用趋势分析**：添加一个趋势图表，显示当前月份每天的预算使用情况，帮助用户了解消费模式。

2. **智能预算调整建议**：基于历史数据分析用户的消费模式，提供个性化的预算调整建议。

3. **预算模板功能**：允许用户创建和应用预算模板，快速设置常用的预算配置。

4. **预算复制功能**：提供"复制上月预算"按钮，一键创建与上月相同的预算设置。

5. **预算导出/分享功能**：允许用户导出预算报告或分享预算执行情况。

6. **家庭预算比较视图**：在家庭账本中，提供成员间预算执行情况的比较视图。

7. **预算结转历史查看**：显示预算结转的历史记录，帮助用户了解长期预算执行情况。
