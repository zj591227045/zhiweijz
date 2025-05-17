# 分类列表页面开发提示词

我需要开发当前项目的"分类列表"页面，使用Next.js 14框架和现代React技术栈实现。

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

这是一个移动端分类管理页面，具有以下核心功能：

1. 支出/收入分类类型切换
2. 分类网格/列表视图切换
3. 添加新分类功能
4. 编辑和删除现有分类
5. 分类排序功能

## UI设计详细说明

页面包含以下UI元素：

### 顶部导航栏：
- 返回按钮
- 居中标题"分类管理"
- 视图切换按钮（网格/列表）

### 类型切换：
- 支出/收入切换选项卡
- 当前选中类型高亮显示

### 分类展示区域：
- 网格视图：
  - 每个分类显示图标和名称
  - 每行4-5个分类项
  - 系统默认分类和用户自定义分类视觉区分
- 列表视图：
  - 每个分类显示图标、名称和操作按钮
  - 拖动手柄用于排序
  - 编辑/删除按钮

### 添加分类按钮：
- 固定在底部或右下角
- 点击跳转到添加分类页面

## 交互逻辑

实现以下交互功能：

1. 类型切换：
   - 点击支出/收入选项卡切换显示对应类型的分类
   - 保持当前选中状态

2. 视图切换：
   - 点击视图切换按钮在网格和列表视图间切换
   - 保存用户偏好设置

3. 分类操作：
   - 网格视图：长按分类项显示操作菜单
   - 列表视图：直接显示操作按钮
   - 点击分类项进入编辑页面
   - 确认后删除分类

4. 分类排序：
   - 列表视图下支持拖拽排序
   - 排序结果自动保存

5. 添加分类：
   - 点击添加按钮跳转到添加分类页面

## 状态管理

使用Zustand创建一个分类管理状态仓库，包含以下状态：

- 当前选中的分类类型（支出/收入）
- 当前视图模式（网格/列表）
- 分类列表数据
- 排序状态
- 操作状态（编辑中、删除中）

## 数据模型和API集成

获取分类列表的API端点为GET /api/categories，支持查询参数：

```
{
  "type": "EXPENSE" // 或 "INCOME"
}
```

响应数据结构：

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "餐饮",
      "icon": "utensils",
      "color": "#FF5722",
      "type": "EXPENSE",
      "isDefault": true,
      "order": 1
    }
  ]
}
```

更新分类排序的API端点为PUT /api/categories/order，请求体：

```json
{
  "categoryIds": ["id1", "id2", "id3"]
}
```

删除分类的API端点为DELETE /api/categories/:id

使用React Query处理API请求，包括：
- 使用useQuery获取分类列表
- 使用useMutation处理排序更新
- 使用useMutation处理删除操作

## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 `PageContainer` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 `<div className="app-container">` 等

2. **PageContainer 组件的正确使用**：
   ```tsx
   import { PageContainer } from "@/components/layout/page-container";

   export default function CategoryListPage() {
     // 右侧操作按钮示例
     const rightActions = (
       <button className="icon-button" onClick={toggleViewMode}>
         <i className={`fas fa-${viewMode === 'grid' ? 'list' : 'th'}`}></i>
       </button>
     );

     return (
       <PageContainer
         title="分类管理"
         rightActions={rightActions}
         showBackButton={true}
         activeNavItem="profile" // 因为分类管理通常在设置/个人资料中
       >
         {/* 页面内容 */}
         <CategoryTypeToggle />
         {viewMode === 'grid' ? <CategoryGrid /> : <CategoryList />}
         <AddCategoryButton />
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

设计以下组件结构：

- `CategoryListPage` - 主页面（使用PageContainer）
- `CategoryTypeToggle` - 类型切换组件
- `ViewToggle` - 视图切换组件
- `CategoryGrid` - 网格视图组件
  - `CategoryGridItem` - 网格项组件
- `CategoryList` - 列表视图组件
  - `CategoryListItem` - 列表项组件
  - `DragHandle` - 拖动手柄组件
- `CategoryActions` - 操作菜单组件
- `AddCategoryButton` - 添加分类按钮
- `DeleteConfirmDialog` - 删除确认对话框

## 响应式设计

实现移动优先的响应式设计：

- 移动端：
  - 网格视图：每行3-4个分类
  - 列表视图：紧凑布局
- 平板/桌面端：
  - 网格视图：每行5-6个分类
  - 列表视图：宽松布局，更多信息

## 无障碍性

确保页面符合基本无障碍性要求：

- 所有交互元素有合适的aria标签
- 颜色对比度符合WCAG标准
- 支持键盘导航
- 拖拽排序有键盘替代方案

## 其他技术要求

- 使用Tailwind CSS实现所有样式
- 使用React DnD或类似库实现拖拽排序
- 区分系统默认分类和用户自定义分类
- 默认分类不可删除，只能编辑图标和颜色
- 分类数据的本地缓存

## 附加功能(如时间允许)

- 分类使用统计（每个分类的交易数量和总额）
- 分类搜索/筛选功能
- 批量编辑模式
- 分类导入/导出功能
- 分类归档功能（隐藏不常用分类）
