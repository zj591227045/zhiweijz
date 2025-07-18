# 标签系统技术架构设计

## 项目概述

为只为记账系统设计并实现一个全新的标签系统功能，支持记账记录的多标签管理、账本级别标签共享、统计分析增强等功能。

## 核心功能需求

### 1. 记账记录标签管理
- 每条记账记录可以添加、移除多个标签
- 支持批量操作（批量添加/移除标签）
- 标签与记账记录的多对多关系

### 2. 标签共享机制
- 标签在账本级别共享
- 账本的所有成员（包括托管成员）都可以查看和使用标签
- 标签创建权限控制

### 3. 标签管理界面
- 设置页面：完整的标签管理功能（添加、编辑、删除、颜色设置）
- 记账详情页面：快捷添加标签功能
- 记账列表页面：显示标签信息

### 4. 统计分析增强
- 统计分析页面底部添加"按标签分析"功能按钮
- 页面顶部添加标签选择器，支持多选标签进行筛选
- 分析维度支持：预算维度、分类维度、时间维度的交叉分析
- 图表展示标签相关的收支统计数据

## 数据库设计

### 1. 标签表 (tags)

```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6', -- 十六进制颜色值
    description TEXT,
    account_book_id TEXT NOT NULL REFERENCES account_books(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT tags_name_account_book_unique UNIQUE (name, account_book_id)
);

-- 索引
CREATE INDEX idx_tags_account_book_id ON tags(account_book_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_created_by ON tags(created_by);
```

### 2. 记账标签关联表 (transaction_tags)

```sql
CREATE TABLE transaction_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 约束
    CONSTRAINT transaction_tags_unique UNIQUE (transaction_id, tag_id)
);

-- 索引
CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
```

### 3. 数据库迁移文件

**文件名**: `1.4.0-to-1.5.0.sql`
**版本**: 1.5.0
**描述**: 添加标签系统支持

## 后端API设计

### 1. 标签管理API

#### 获取账本标签列表
```
GET /api/tags?accountBookId={accountBookId}
```

#### 创建标签
```
POST /api/tags
Body: {
  name: string,
  color: string,
  description?: string,
  accountBookId: string
}
```

#### 更新标签
```
PUT /api/tags/{tagId}
Body: {
  name?: string,
  color?: string,
  description?: string
}
```

#### 删除标签
```
DELETE /api/tags/{tagId}
```

### 2. 记账标签关联API

#### 获取记账的标签
```
GET /api/transactions/{transactionId}/tags
```

#### 为记账添加标签
```
POST /api/transactions/{transactionId}/tags
Body: {
  tagIds: string[]
}
```

#### 移除记账标签
```
DELETE /api/transactions/{transactionId}/tags/{tagId}
```

#### 批量操作记账标签
```
POST /api/transactions/batch/tags
Body: {
  transactionIds: string[],
  action: 'add' | 'remove',
  tagIds: string[]
}
```

### 3. 统计分析API

#### 按标签统计
```
GET /api/statistics/by-tags?accountBookId={accountBookId}&startDate={date}&endDate={date}&tagIds={tagIds}
```

## 前端UI设计

### 1. 标签管理页面 (设置页面)

**路径**: `/settings/tags`

**功能**:
- 标签列表展示（名称、颜色、使用次数）
- 添加新标签（名称、颜色选择器、描述）
- 编辑标签（内联编辑或模态框）
- 删除标签（确认对话框）
- 搜索和筛选标签

**UI组件**:
- `TagManagementPage`: 主页面组件
- `TagList`: 标签列表组件
- `TagItem`: 单个标签项组件
- `TagEditModal`: 标签编辑模态框
- `ColorPicker`: 颜色选择器组件

### 2. 标签选择器组件

**组件名**: `TagSelector`

**功能**:
- 多选标签支持
- 搜索标签功能
- 快速创建新标签
- 标签颜色显示

**使用场景**:
- 记账记录编辑页面
- 统计分析筛选
- 批量操作

### 3. 标签显示组件

**组件名**: `TagDisplay`

**功能**:
- 标签徽章显示
- 颜色主题支持
- 点击交互（可选）
- 响应式布局

**使用场景**:
- 记账列表
- 记账详情
- 统计图表

### 4. 统计分析增强

**新增功能**:
- 页面顶部标签筛选器
- 底部"按标签分析"按钮
- 标签维度图表展示
- 标签交叉分析

## 技术实现细节

### 1. 权限控制

**标签管理权限**:
- 账本成员可以查看所有标签
- 账本成员可以使用所有标签
- 标签创建者和账本管理员可以编辑/删除标签

**实现方式**:
- 后端API权限验证
- 前端UI权限控制
- 数据库级别约束

### 2. 性能优化

**数据库优化**:
- 合理的索引设计
- 查询优化（JOIN优化）
- 分页加载

**前端优化**:
- 标签数据缓存
- 虚拟滚动（大量标签）
- 防抖搜索

### 3. 移动端适配

**响应式设计**:
- 标签选择器移动端优化
- 触摸友好的交互
- 适配小屏幕布局

**交互优化**:
- 长按操作支持
- 滑动手势
- 底部弹出选择器

## 开发计划

### 阶段1: 数据库设计与迁移 (1天)
- 设计数据库表结构
- 创建迁移文件
- 测试数据库迁移

### 阶段2: 后端API开发 (2天)
- 实现标签CRUD API
- 实现记账标签关联API
- 添加权限控制和验证

### 阶段3: 前端基础组件开发 (2天)
- 开发标签显示组件
- 开发标签选择器组件
- 开发颜色选择器组件

### 阶段4: 标签管理界面开发 (1天)
- 实现设置页面标签管理
- 集成CRUD操作
- 添加搜索和筛选功能

### 阶段5: 记账记录集成 (1天)
- 记账详情页面标签功能
- 记账列表标签显示
- 批量操作功能

### 阶段6: 统计分析增强 (1天)
- 添加标签筛选器
- 实现按标签分析功能
- 图表展示优化

### 阶段7: 移动端适配与测试 (1天)
- 移动端UI优化
- 交互体验改进
- 全面功能测试

## 风险评估与应对

### 1. 数据迁移风险
**风险**: 现有数据兼容性问题
**应对**: 充分测试，渐进式迁移

### 2. 性能风险
**风险**: 大量标签影响查询性能
**应对**: 索引优化，分页加载

### 3. 用户体验风险
**风险**: 复杂的标签操作影响易用性
**应对**: 简化交互，提供快捷操作

## 后续扩展计划

### 1. 高级功能
- 标签模板和预设
- 智能标签推荐
- 标签统计报表

### 2. 集成功能
- 导入导出标签
- 标签同步功能
- API开放接口

---

**文档版本**: v1.0
**创建时间**: 2024年
**负责团队**: zhiweijz-team
