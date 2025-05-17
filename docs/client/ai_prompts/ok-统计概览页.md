# 统计概览页面开发提示词

我需要开发当前项目的"统计概览"页面，使用Next.js 14框架和现代React技术栈实现。

## 技术栈要求

- 核心框架: Next.js 14 (App Router)
- 状态管理: Zustand
- UI组件: shadcn/ui + Tailwind CSS
- 图表库: Chart.js + react-chartjs-2
- HTTP请求: Axios + React Query
- 工具库:
  - dayjs (日期处理)
  - lucide-react (图标)
  - clsx/tailwind-merge (类名合并)

## 页面功能说明

这是一个移动端财务统计概览页面，具有以下核心功能：

1. 时间范围选择（本月、上月、自定义）
2. 收支概览统计
3. 分类占比饼图
4. 收支趋势折线图
5. 详细统计入口（分类分析、预算执行分析）

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"统计分析"
- 时间范围选择器

### 收支概览卡片：
- 总收入金额
- 总支出金额
- 结余金额
- 环比变化百分比（带上升/下降指示）

### 分类占比图表区：
- 支出/收入切换选项卡
- 饼图显示各分类占比
- 图例显示分类名称和金额
- 点击分类可查看详情

### 趋势图表区：
- 收支趋势折线图
- 日/周/月视图切换
- 双线显示收入和支出
- 点击数据点查看详情

### 详细分析入口：
- 分类分析入口卡片
- 预算执行分析入口卡片
- 每个入口显示简要统计和图标

## 交互逻辑

实现以下交互功能：

1. 时间范围选择：
   - 点击时间范围选择器显示选项
   - 选择自定义时显示日期范围选择器
   - 切换时间范围后刷新所有统计数据

2. 分类占比交互：
   - 切换支出/收入选项卡显示对应数据
   - 点击饼图扇区突出显示该分类
   - 点击分类跳转到分类详情分析

3. 趋势图表交互：
   - 切换日/周/月视图重新聚合数据
   - 点击图表上的点显示具体日期数据
   - 支持缩放和平移查看不同时间范围

4. 详细分析导航：
   - 点击分类分析入口跳转到分类分析页
   - 点击预算执行分析入口跳转到预算分析页

## 状态管理

使用Zustand创建一个统计概览状态仓库，包含以下状态：

- 当前选中的时间范围
- 收支概览数据
- 分类占比数据（支出/收入）
- 趋势图表数据
- 图表视图模式（日/周/月）
- 加载状态（各数据模块）

## 数据模型和API集成

获取统计概览的API端点为GET /api/statistics/overview，支持查询参数：

```
{
  "startDate": "2023-05-01",
  "endDate": "2023-05-31"
}
```

响应数据结构：

```json
{
  "summary": {
    "income": 8000,
    "expense": 5000,
    "balance": 3000,
    "incomeChange": 5,
    "expenseChange": -3,
    "balanceChange": 10
  },
  "categoryDistribution": {
    "expense": [
      {
        "categoryId": "category_uuid",
        "categoryName": "餐饮",
        "categoryIcon": "utensils",
        "amount": 1500,
        "percentage": 30
      }
    ],
    "income": [
      {
        "categoryId": "category_uuid",
        "categoryName": "工资",
        "categoryIcon": "money-bill-wave",
        "amount": 6000,
        "percentage": 75
      }
    ]
  },
  "trends": {
    "daily": [
      {
        "date": "2023-05-01",
        "income": 0,
        "expense": 200
      }
    ],
    "weekly": [
      {
        "week": "W1",
        "income": 2000,
        "expense": 1200
      }
    ],
    "monthly": [
      {
        "month": "2023-04",
        "income": 7500,
        "expense": 5200
      }
    ]
  }
}
```

使用React Query处理API请求，包括：
- 使用useQuery获取统计概览数据
- 实现数据缓存和重新获取策略

## 组件结构

设计以下组件结构：

- `StatisticsOverviewPage` - 主页面容器
- `DateRangePicker` - 时间范围选择器
- `StatsSummaryCard` - 统计概览卡片
  - `ChangeIndicator` - 变化指示器组件
- `CategoryDistribution` - 分类分布组件
  - `TypeToggle` - 支出/收入切换组件
  - `PieChart` - 饼图组件
  - `CategoryLegend` - 分类图例组件
- `TrendChart` - 趋势图表组件
  - `ViewToggle` - 视图切换组件
  - `LineChart` - 折线图组件
  - `ChartTooltip` - 图表提示组件
- `AnalysisNavigation` - 详细分析导航
  - `AnalysisCard` - 分析入口卡片

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 垂直布局，信息分块展示
  - 图表适应屏幕宽度
  - 简化的图例和标签
- 平板/桌面端：
  - 多列布局，更多信息并排展示
  - 更大的图表区域
  - 更详细的图例和标签

## 无障碍性

确保页面符合基本无障碍性要求：

- 图表有文本替代说明
- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 图表颜色选择考虑色盲友好

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用Chart.js创建响应式图表
- 使用dayjs处理日期和时间范围
- 优化数据加载体验（骨架屏、加载指示器）
- 实现统计数据的缓存策略
- 确保图表颜色与分类颜色一致

## 附加功能(如时间允许)

- 数据导出功能（CSV/Excel）
- 高级筛选（排除特定分类）
- 自定义图表配置（颜色、显示选项）
- 统计数据分享功能
- 同比/环比分析切换
