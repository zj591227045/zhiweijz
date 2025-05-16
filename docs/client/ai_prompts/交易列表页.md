# 交易列表页面开发提示词

我需要开发当前项目的"交易列表"页面，使用Next.js 14框架和现代React技术栈实现。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 表单处理: React Hook Form + Zod验证
- HTTP请求: Axios + React Query
- 工具库:
  - dayjs (日期处理)
  - lucide-react (图标)
  - clsx/tailwind-merge (类名合并)

## 页面功能说明

这是一个移动端交易记录列表页面，具有以下核心功能：

1. 顶部筛选栏：时间范围、交易类型、分类筛选
2. 按日期分组的交易记录列表
3. 悬浮添加按钮
4. 下拉刷新和上拉加载更多
5. 点击交易项查看/编辑详情

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"交易记录"
- 筛选按钮

### 筛选区域：
- 时间范围选择（本月、上月、自定义）
- 交易类型筛选（全部、支出、收入）
- 分类筛选（多选）

### 交易列表：
- 按日期分组，每组显示日期和当日总额
- 每个交易项显示：
  - 分类图标和名称
  - 交易描述
  - 交易金额（支出为红色，收入为绿色）
  - 时间
- 列表项支持左滑操作（编辑/删除）

### 悬浮添加按钮：
- 固定在右下角
- 点击跳转到添加交易页面

## 交互逻辑

实现以下交互功能：

1. 筛选功能：
   - 点击筛选按钮展开/收起筛选面板
   - 选择时间范围后自动刷新列表
   - 选择交易类型后自动刷新列表
   - 选择分类后自动刷新列表

2. 列表交互：
   - 支持下拉刷新获取最新数据
   - 支持上拉加载更多历史数据
   - 点击交易项跳转到详情页
   - 左滑显示编辑/删除操作按钮

3. 添加交易：
   - 点击悬浮按钮跳转到添加交易页面

## 状态管理

使用Zustand创建一个交易列表状态仓库，包含以下状态：

- 筛选条件（时间范围、类型、分类）
- 交易列表数据
- 分页信息（当前页码、是否有更多）
- 加载状态（初始加载、刷新、加载更多）

## 数据模型和API集成

获取交易列表的API端点为GET /api/transactions，支持以下查询参数：

```
{
  "startDate": "2023-05-01",
  "endDate": "2023-05-31",
  "type": "EXPENSE", // 或 "INCOME"
  "categoryIds": ["id1", "id2"],
  "page": 1,
  "limit": 20
}
```

响应数据结构：

```json
{
  "transactions": [
    {
      "id": "uuid",
      "amount": 100.50,
      "type": "EXPENSE",
      "categoryId": "category_uuid",
      "categoryName": "餐饮",
      "categoryIcon": "utensils",
      "description": "午餐费用",
      "date": "2023-05-15T12:30:00Z"
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "hasMore": true
  }
}
```

使用React Query处理API请求，包括：
- 使用useInfiniteQuery实现无限滚动
- 实现下拉刷新功能
- 缓存和预取数据优化

## 组件结构

设计以下组件结构：

- `TransactionListPage` - 主页面容器
- `TransactionFilters` - 筛选条件组件
  - `DateRangeFilter` - 日期范围选择
  - `TypeFilter` - 交易类型选择
  - `CategoryFilter` - 分类多选组件
- `GroupedTransactionList` - 分组交易列表
  - `DateGroup` - 日期分组标题
  - `TransactionItem` - 单个交易项
  - `SwipeActions` - 滑动操作组件
- `FloatingActionButton` - 悬浮添加按钮

## 响应式设计

实现移动优先的响应式设计：

- 移动端：单列布局，筛选条件可折叠
- 平板/桌面端：双列布局，筛选条件固定在侧边

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 实现虚拟滚动优化长列表性能
- 使用骨架屏优化加载体验
- 筛选条件与URL参数同步，支持分享和书签
- 实现交易数据的本地缓存

## 附加功能(如时间允许)

- 交易数据的导出功能（CSV/Excel）
- 高级搜索功能（金额范围、关键词）
- 列表视图/卡片视图切换
- 交易趋势简报（顶部卡片）
