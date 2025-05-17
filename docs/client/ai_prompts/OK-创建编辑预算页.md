# 创建/编辑预算页面开发提示词

我需要开发当前项目的"创建/编辑预算"页面，使用Next.js 14框架和现代React技术栈实现。请参考预览HTML文件：
- 创建预算页面: `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/预算添加页/index.html`
- 编辑预算页面: `/Users/jackson/Documents/VSCode/zhiweijz/docs/ui_preview/预算编辑页/index.html`

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

这是一个移动端创建/编辑预算的页面，具有以下核心功能：

1. 创建新预算或编辑现有预算
2. 选择预算所属账本（个人账本/家庭账本）
3. 设置预算基本信息（名称、金额、周期类型、日期范围）
4. 启用/禁用分类预算功能
5. 添加/编辑多个分类预算，并显示分配情况
6. 启用/禁用预算结转功能
7. 显示当前结转情况（编辑模式）

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 左侧返回按钮（箭头图标）
- 居中标题"添加预算"或"编辑预算"
- 右侧为空（保持标题居中）

### 表单区域：
- 分为多个表单区块，每个区块有明确的标题和内容

### 账本选择区块：
- 区块标题"选择账本"
- 两个选项卡：个人账本和家庭账本
- 每个选项卡包含图标和文本
- 当前选中的账本高亮显示

### 基本信息区块：
- 区块标题"基本信息"
- 预算名称输入框（带标签和占位符）
- 预算金额输入框（带货币符号）
- 预算周期选择器（月度/年度）
- 开始日期选择器（带日历图标）
- 结束日期选择器（带日历图标）

### 分类预算区块：
- 区块标题"分类预算"和启用/禁用开关
- 分类选择器（网格布局，显示图标和名称）
- 分类预算表单：
  - 当前选中的分类（图标和名称）
  - 分类预算金额输入框
  - 预算分配信息（总预算、已分配、剩余可分配）
  - 添加分类预算按钮
- 已添加的分类预算列表：
  - 每项显示分类图标、名称、金额
  - 删除按钮

### 结转设置区块：
- 区块标题"结转设置"和启用/禁用开关
- 结转说明信息（带图标）
- 当前结转情况（仅编辑模式）：
  - 上月结转金额
  - 本月预计结转金额

### 提交按钮：
- 大型全宽按钮
- 创建模式显示"保存预算"
- 编辑模式显示"保存修改"

## 交互逻辑

实现以下交互功能：

1. 页面初始化：
   - 创建模式：显示空表单，默认选择个人账本、月度周期和当月日期范围
   - 编辑模式：加载现有预算数据并填充表单，包括账本选择、基本信息、分类预算和结转设置

2. 账本选择：
   - 点击账本选项切换选中状态
   - 切换账本类型时可能需要重新加载相关数据（如分类列表）
   - 账本一旦选择后在编辑模式下不应更改

3. 基本信息输入：
   - 预算名称支持自由文本输入
   - 预算金额支持数字输入，自动格式化显示
   - 预算周期切换（月度/年度）会影响日期选择器的行为
   - 日期选择器支持选择开始和结束日期

4. 分类预算交互：
   - 启用/禁用分类预算开关控制整个分类预算区块的显示/隐藏
   - 点击分类选择器中的分类项选中该分类
   - 输入分类预算金额后点击添加按钮将其添加到列表
   - 实时显示总预算、已分配预算和剩余可分配金额
   - 点击分类预算列表中的删除按钮移除该分类预算

5. 结转设置交互：
   - 启用/禁用结转开关控制结转功能
   - 编辑模式下显示当前结转情况（上月结转和本月预计结转）
   - 结转信息区域提供结转功能的说明

6. 表单验证：
   - 预算名称为必填项
   - 预算金额必须大于0
   - 开始日期和结束日期必须有效，且结束日期必须晚于开始日期
   - 如果启用了分类预算，至少需要添加一个分类预算
   - 分类预算总和不能超过总预算金额

7. 表单提交：
   - 点击提交按钮时验证所有必填字段
   - 显示提交中状态（按钮禁用或加载指示器）
   - 成功后显示成功提示并返回预算列表页
   - 失败显示错误信息并保持在当前页面

## 状态管理

使用Zustand创建一个预算表单状态仓库，包含以下状态：

```typescript
interface BudgetFormStore {
  // 表单模式
  mode: 'create' | 'edit';
  budgetId: string | null; // 编辑模式下的预算ID

  // 账本选择
  accountBooks: AccountBook[];
  selectedAccountBookId: string | null;

  // 基本信息
  formData: {
    name: string;
    amount: number;
    periodType: 'MONTHLY' | 'YEARLY';
    startDate: string;
    endDate: string;
  };

  // 分类预算
  enableCategoryBudget: boolean;
  categories: Category[];
  selectedCategoryId: string | null;
  categoryBudgets: CategoryBudget[];
  categoryBudgetAmount: number;

  // 结转设置
  enableRollover: boolean;
  rolloverData: {
    previousRollover: number | null;
    estimatedRollover: number | null;
  };

  // UI状态
  isLoading: boolean;
  isSubmitting: boolean;
  errors: Record<string, string>;

  // 操作方法
  setMode: (mode: 'create' | 'edit') => void;
  setBudgetId: (id: string | null) => void;
  setSelectedAccountBook: (id: string) => void;
  updateFormData: (data: Partial<BudgetFormStore['formData']>) => void;
  toggleCategoryBudget: () => void;
  setSelectedCategory: (id: string | null) => void;
  setCategoryBudgetAmount: (amount: number) => void;
  addCategoryBudget: () => void;
  removeCategoryBudget: (id: string) => void;
  toggleRollover: () => void;
  resetForm: () => void;
  loadBudgetData: (budgetId: string) => Promise<void>;
  submitForm: () => Promise<void>;
}
```

## 数据模型和API集成

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

2. 分类模型：
```typescript
interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME';
}
```

3. 分类预算模型：
```typescript
interface CategoryBudget {
  id?: string; // 新建时可能没有ID
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
}
```

4. 预算模型：
```typescript
interface Budget {
  id: string;
  name: string;
  accountBookId: string;
  amount: number;
  periodType: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  enableCategoryBudget: boolean;
  enableRollover: boolean;
  categoryBudgets: CategoryBudget[];
  rolloverData?: {
    previousRollover: number;
    estimatedRollover: number;
  };
}
```

### API端点

1. 获取账本列表：
```
GET /api/account-books
```

2. 获取分类列表：
```
GET /api/categories?type=EXPENSE
```

3. 获取单个预算：
```
GET /api/budgets/:id
```

4. 创建预算：
```
POST /api/budgets
```

请求体：
```json
{
  "name": "餐饮月度预算",
  "accountBookId": "account_book_uuid",
  "amount": 1000,
  "periodType": "MONTHLY",
  "startDate": "2023-05-01",
  "endDate": "2023-05-31",
  "enableCategoryBudget": true,
  "enableRollover": true,
  "categoryBudgets": [
    {
      "categoryId": "category_uuid_1",
      "amount": 600
    },
    {
      "categoryId": "category_uuid_2",
      "amount": 400
    }
  ]
}
```

5. 更新预算：
```
PUT /api/budgets/:id
```

请求体与创建预算相同

### React Query集成

```typescript
// 获取账本列表
const { data: accountBooks, isLoading: isLoadingAccountBooks } = useQuery({
  queryKey: ['accountBooks'],
  queryFn: () => accountBookService.getAccountBooks()
});

// 获取分类列表
const { data: categories, isLoading: isLoadingCategories } = useQuery({
  queryKey: ['categories', 'EXPENSE'],
  queryFn: () => categoryService.getCategories({ type: 'EXPENSE' })
});

// 获取预算详情（编辑模式）
const { data: budget, isLoading: isLoadingBudget } = useQuery({
  queryKey: ['budget', budgetId],
  queryFn: () => budgetService.getBudget(budgetId as string),
  enabled: !!budgetId && mode === 'edit',
  onSuccess: (data) => {
    // 填充表单数据
    updateFormData({
      name: data.name,
      amount: data.amount,
      periodType: data.periodType,
      startDate: data.startDate,
      endDate: data.endDate
    });
    setSelectedAccountBook(data.accountBookId);
    setEnableCategoryBudget(data.enableCategoryBudget);
    setEnableRollover(data.enableRollover);
    setCategoryBudgets(data.categoryBudgets);
    setRolloverData(data.rolloverData);
  }
});

// 创建预算
const createMutation = useMutation({
  mutationFn: (data: CreateBudgetDto) => budgetService.createBudget(data),
  onSuccess: () => {
    toast.success('预算创建成功');
    router.push('/budgets');
  },
  onError: (error) => {
    toast.error('创建预算失败');
    console.error(error);
  }
});

// 更新预算
const updateMutation = useMutation({
  mutationFn: (data: UpdateBudgetDto) =>
    budgetService.updateBudget(budgetId as string, data),
  onSuccess: () => {
    toast.success('预算更新成功');
    router.push('/budgets');
  },
  onError: (error) => {
    toast.error('更新预算失败');
    console.error(error);
  }
});
```

## 组件结构

根据HTML示例页面，设计以下组件结构：

```
/pages/budgets/new.tsx (或 /app/budgets/new/page.tsx)
/pages/budgets/[id]/edit.tsx (或 /app/budgets/[id]/edit/page.tsx)
├── Header - 顶部导航栏
│   ├── BackButton - 返回按钮
│   └── PageTitle - 页面标题
├── BudgetForm - 预算表单
│   ├── AccountBookSection - 账本选择区块
│   │   ├── SectionTitle - 区块标题
│   │   └── AccountBookOptions - 账本选项
│   ├── BasicInfoSection - 基本信息区块
│   │   ├── SectionTitle - 区块标题
│   │   ├── NameInput - 预算名称输入
│   │   ├── AmountInput - 预算金额输入
│   │   ├── PeriodOptions - 预算周期选项
│   │   ├── StartDatePicker - 开始日期选择器
│   │   └── EndDatePicker - 结束日期选择器
│   ├── CategoryBudgetSection - 分类预算区块
│   │   ├── SectionHeader - 区块标题和开关
│   │   ├── CategorySelector - 分类选择器
│   │   ├── CategoryBudgetForm - 分类预算表单
│   │   │   ├── SelectedCategory - 当前选中分类
│   │   │   ├── CategoryBudgetAmountInput - 分类预算金额输入
│   │   │   ├── BudgetAllocationInfo - 预算分配信息
│   │   │   └── AddCategoryBudgetButton - 添加按钮
│   │   └── CategoryBudgetList - 分类预算列表
│   │       └── CategoryBudgetItem - 分类预算项
│   ├── RolloverSection - 结转设置区块
│   │   ├── SectionHeader - 区块标题和开关
│   │   ├── RolloverInfo - 结转说明信息
│   │   └── CurrentRollover - 当前结转情况（编辑模式）
│   └── SubmitButton - 提交按钮
```

## 具体组件实现

### 1. 账本选择区块

```tsx
const AccountBookSection = () => {
  const { accountBooks, selectedAccountBookId, setSelectedAccountBook } = useBudgetFormStore();

  return (
    <div className="form-section">
      <div className="section-title">选择账本</div>
      <div className="account-book-options">
        {accountBooks.map(book => (
          <div
            key={book.id}
            className={`account-book-option ${selectedAccountBookId === book.id ? 'active' : ''}`}
            onClick={() => setSelectedAccountBook(book.id)}
          >
            <i className={`fas fa-${book.type === 'PERSONAL' ? 'book' : 'users'}`}></i>
            <span>{book.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. 分类预算开关

```tsx
interface SectionHeaderProps {
  title: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
}

const SectionHeader = ({ title, enabled, onChange, label }: SectionHeaderProps) => {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      <div className="toggle-container">
        <span>{label}</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
    </div>
  );
};
```

### 3. 分类预算表单

```tsx
const CategoryBudgetForm = () => {
  const {
    selectedCategoryId,
    categories,
    categoryBudgetAmount,
    setCategoryBudgetAmount,
    addCategoryBudget,
    formData
  } = useBudgetFormStore();

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  // 计算预算分配情况
  const totalBudget = formData.amount;
  const allocatedBudget = useBudgetFormStore(state =>
    state.categoryBudgets.reduce((sum, cb) => sum + cb.amount, 0)
  );
  const remainingBudget = totalBudget - allocatedBudget;

  if (!selectedCategory) return null;

  return (
    <div className="category-budget-form">
      <div className="selected-category">
        <div
          className="category-icon"
          style={{ backgroundColor: selectedCategory.color }}
        >
          <i className={`fas fa-${selectedCategory.icon}`}></i>
        </div>
        <span>{selectedCategory.name}</span>
      </div>

      <div className="form-group">
        <label htmlFor="category-budget-amount">分类预算金额</label>
        <div className="amount-input">
          <span className="currency-symbol">¥</span>
          <input
            type="number"
            id="category-budget-amount"
            placeholder="0.00"
            value={categoryBudgetAmount || ''}
            onChange={(e) => setCategoryBudgetAmount(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="category-budget-info">
        <div className="info-item">
          <span className="info-label">总预算:</span>
          <span className="info-value">¥{totalBudget.toLocaleString()}</span>
        </div>
        <div className="info-item">
          <span className="info-label">已分配:</span>
          <span className="info-value">¥{allocatedBudget.toLocaleString()}</span>
        </div>
        <div className="info-item">
          <span className="info-label">剩余可分配:</span>
          <span className="info-value">¥{remainingBudget.toLocaleString()}</span>
        </div>
      </div>

      <button
        type="button"
        className="add-category-budget-button"
        onClick={addCategoryBudget}
        disabled={!categoryBudgetAmount || categoryBudgetAmount <= 0 || categoryBudgetAmount > remainingBudget}
      >
        添加分类预算
      </button>
    </div>
  );
};
```

### 4. 结转设置区块

```tsx
const RolloverSection = () => {
  const {
    enableRollover,
    toggleRollover,
    rolloverData,
    mode
  } = useBudgetFormStore();

  return (
    <div className="form-section">
      <SectionHeader
        title="结转设置"
        enabled={enableRollover}
        onChange={toggleRollover}
        label="启用结转"
      />

      <div className="rollover-info">
        <i className="fas fa-info-circle"></i>
        <p>启用结转后，当月未花完的预算将结转到下个月，超支的金额将从下个月扣除。</p>
      </div>

      {mode === 'edit' && enableRollover && rolloverData && (
        <div className="current-rollover">
          <div className="rollover-header">当前结转情况</div>
          <div className="rollover-data">
            {rolloverData.previousRollover !== null && (
              <div className="rollover-item">
                <span className="rollover-label">上月结转:</span>
                <span className={`rollover-value ${rolloverData.previousRollover >= 0 ? 'positive' : 'negative'}`}>
                  {rolloverData.previousRollover >= 0 ? '+' : ''}
                  ¥{Math.abs(rolloverData.previousRollover).toLocaleString()}
                </span>
              </div>
            )}
            {rolloverData.estimatedRollover !== null && (
              <div className="rollover-item">
                <span className="rollover-label">本月预计结转:</span>
                <span className={`rollover-value ${rolloverData.estimatedRollover >= 0 ? 'positive' : 'negative'}`}>
                  {rolloverData.estimatedRollover >= 0 ? '+' : ''}
                  ¥{Math.abs(rolloverData.estimatedRollover).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
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
    .form-section {
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .category-selector {
      grid-template-columns: repeat(6, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .form-container {
      max-width: 800px;
      margin-left: auto;
      margin-right: auto;
    }

    .account-book-options {
      display: flex;
      gap: 16px;
    }

    .account-book-option {
      flex: 1;
    }
  }
`}</style>
```

## 样式实现

使用Tailwind CSS实现关键组件样式：

```tsx
// 表单区块样式
<div className="form-section bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
  <div className="section-title text-base font-semibold mb-4">选择账本</div>
  {/* 区块内容 */}
</div>

// 账本选项样式
<div className="account-book-options grid grid-cols-2 gap-3">
  <div className="account-book-option flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-colors hover:border-blue-500 active:bg-blue-50 dark:active:bg-blue-900">
    <i className="fas fa-book text-2xl mb-2 text-gray-500"></i>
    <span className="text-sm">我的账本</span>
  </div>
  {/* 其他账本选项 */}
</div>

// 分类预算开关样式
<div className="section-header flex justify-between items-center mb-4">
  <div className="section-title text-base font-semibold">分类预算</div>
  <div className="toggle-container flex items-center">
    <span className="text-sm text-gray-500 mr-2">启用分类预算</span>
    <Switch checked={enableCategoryBudget} onCheckedChange={setEnableCategoryBudget} />
  </div>
</div>

// 分类选择器样式
<div className="category-selector grid grid-cols-4 gap-3 mb-4">
  <div className="category-option flex flex-col items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-colors hover:border-blue-500 active:bg-blue-50 dark:active:bg-blue-900">
    <div className="category-icon w-10 h-10 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
      <i className="fas fa-utensils"></i>
    </div>
    <span className="text-xs">餐饮</span>
  </div>
  {/* 其他分类选项 */}
</div>

// 提交按钮样式
<button
  type="submit"
  className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow transition-colors"
  disabled={isSubmitting}
>
  {isSubmitting ? (
    <div className="flex items-center justify-center">
      <Spinner className="mr-2" />
      <span>保存中...</span>
    </div>
  ) : (
    mode === 'create' ? '保存预算' : '保存修改'
  )}
</button>
```

## 表单验证

使用React Hook Form和Zod实现表单验证：

```tsx
// 定义验证规则
const budgetFormSchema = z.object({
  name: z.string().min(1, '预算名称不能为空'),
  amount: z.number().min(0.01, '预算金额必须大于0'),
  periodType: z.enum(['MONTHLY', 'YEARLY']),
  startDate: z.string().min(1, '开始日期不能为空'),
  endDate: z.string().min(1, '结束日期不能为空'),
  accountBookId: z.string().min(1, '请选择账本'),
  enableCategoryBudget: z.boolean(),
  enableRollover: z.boolean(),
  categoryBudgets: z.array(
    z.object({
      categoryId: z.string(),
      amount: z.number().min(0.01)
    })
  ).optional()
}).refine(data => {
  if (data.enableCategoryBudget && (!data.categoryBudgets || data.categoryBudgets.length === 0)) {
    return false;
  }
  return true;
}, {
  message: '启用分类预算时，至少需要添加一个分类预算',
  path: ['categoryBudgets']
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: '结束日期必须晚于或等于开始日期',
  path: ['endDate']
});

// 使用React Hook Form
const {
  register,
  handleSubmit,
  formState: { errors },
  setValue,
  watch
} = useForm<BudgetFormValues>({
  resolver: zodResolver(budgetFormSchema),
  defaultValues: {
    name: '',
    amount: 0,
    periodType: 'MONTHLY',
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    enableCategoryBudget: false,
    enableRollover: false,
    categoryBudgets: []
  }
});
```

## 无障碍性

确保页面符合基本无障碍性要求：

- 为所有表单元素添加关联的标签和ARIA属性：
  ```tsx
  <label htmlFor="budget-name" className="block text-sm font-medium mb-1">
    预算名称
  </label>
  <input
    id="budget-name"
    type="text"
    aria-invalid={!!errors.name}
    aria-describedby={errors.name ? "name-error" : undefined}
    {...register("name")}
    className="w-full px-3 py-2 border rounded-md"
  />
  {errors.name && (
    <p id="name-error" className="mt-1 text-sm text-red-600">
      {errors.name.message}
    </p>
  )}
  ```

- 确保开关组件支持键盘操作：
  ```tsx
  <Switch
    checked={enableCategoryBudget}
    onCheckedChange={setEnableCategoryBudget}
    aria-label="启用分类预算"
  />
  ```

- 为分类选择器添加键盘导航支持：
  ```tsx
  <div
    role="radiogroup"
    aria-label="选择分类"
    className="category-selector"
  >
    {categories.map(category => (
      <div
        key={category.id}
        role="radio"
        aria-checked={selectedCategoryId === category.id}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setSelectedCategory(category.id);
          }
        }}
        onClick={() => setSelectedCategory(category.id)}
        className="category-option"
      >
        {/* 分类内容 */}
      </div>
    ))}
  </div>
  ```

## 其他技术实现

### 1. 日期处理

使用dayjs处理日期和周期计算：

```typescript
// 设置月度预算的日期范围
const setMonthlyPeriod = (date = new Date()) => {
  const startDate = dayjs(date).startOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(date).endOf('month').format('YYYY-MM-DD');

  setValue('startDate', startDate);
  setValue('endDate', endDate);
  setValue('periodType', 'MONTHLY');
};

// 设置年度预算的日期范围
const setYearlyPeriod = (date = new Date()) => {
  const startDate = dayjs(date).startOf('year').format('YYYY-MM-DD');
  const endDate = dayjs(date).endOf('year').format('YYYY-MM-DD');

  setValue('startDate', startDate);
  setValue('endDate', endDate);
  setValue('periodType', 'YEARLY');
};
```

### 2. 表单数据本地存储

使用浏览器本地存储防止意外关闭：

```typescript
// 保存表单数据到本地存储
useEffect(() => {
  const formData = watch();
  if (mode === 'create') {
    localStorage.setItem('budget_form_draft', JSON.stringify(formData));
  }
}, [watch, mode]);

// 从本地存储加载表单数据
useEffect(() => {
  if (mode === 'create') {
    const savedData = localStorage.getItem('budget_form_draft');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        Object.entries(parsedData).forEach(([key, value]) => {
          setValue(key as any, value);
        });
      } catch (error) {
        console.error('Failed to parse saved form data', error);
      }
    }
  }
}, [mode, setValue]);

// 提交成功后清除本地存储
const onSubmitSuccess = () => {
  if (mode === 'create') {
    localStorage.removeItem('budget_form_draft');
  }
  // 其他成功处理逻辑...
};
```

## 附加功能(如时间允许)

1. **多分类预算批量创建**：添加批量创建功能，允许用户一次性为多个分类设置预算，提高效率。

2. **预算模板功能**：实现预算模板保存和应用功能，用户可以保存当前预算设置为模板，并在创建新预算时应用。

3. **重复预算设置**：添加重复选项，允许用户设置预算自动按月或按年重复创建。

4. **预算调整历史记录**：在编辑模式下显示预算的历史调整记录，帮助用户了解预算变化趋势。

5. **预算分配建议**：基于历史消费数据，提供智能的预算分配建议，帮助用户更合理地设置各分类预算。

6. **预算使用预测**：根据当前设置的预算和历史消费模式，预测预算使用情况和可能的结转金额。

7. **预算比较功能**：允许用户比较当前预算与上期预算的差异，或与推荐预算的差异。
