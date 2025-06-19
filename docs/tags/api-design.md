# 标签系统API接口设计

## 概述

本文档详细描述了标签系统的RESTful API接口设计，包括标签管理、交易标签关联、权限控制和统计分析等功能。

## API设计原则

### 1. RESTful设计
- 使用标准HTTP方法（GET, POST, PUT, DELETE）
- 资源导向的URL设计
- 统一的响应格式

### 2. 权限控制
- 基于账本成员权限
- JWT Token认证
- 操作权限验证

### 3. 错误处理
- 统一的错误响应格式
- 详细的错误信息
- 适当的HTTP状态码

## 标签管理API

### 1. 获取账本标签列表

**接口**: `GET /api/tags`

**参数**:
```typescript
interface GetTagsQuery {
  accountBookId: string;
  search?: string;        // 搜索关键词
  isActive?: boolean;     // 是否只返回活跃标签
  sortBy?: 'name' | 'usage' | 'created'; // 排序方式
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

**响应**:
```typescript
interface GetTagsResponse {
  success: boolean;
  data: {
    tags: Tag[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  accountBookId: string;
  createdBy: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
  };
}
```

### 2. 创建标签

**接口**: `POST /api/tags`

**请求体**:
```typescript
interface CreateTagRequest {
  name: string;
  color: string;
  description?: string;
  accountBookId: string;
}
```

**响应**:
```typescript
interface CreateTagResponse {
  success: boolean;
  data: Tag;
  message: string;
}
```

**权限要求**: 账本成员

### 3. 更新标签

**接口**: `PUT /api/tags/{tagId}`

**请求体**:
```typescript
interface UpdateTagRequest {
  name?: string;
  color?: string;
  description?: string;
  isActive?: boolean;
}
```

**响应**:
```typescript
interface UpdateTagResponse {
  success: boolean;
  data: Tag;
  message: string;
}
```

**权限要求**: 标签创建者或账本管理员

### 4. 删除标签

**接口**: `DELETE /api/tags/{tagId}`

**响应**:
```typescript
interface DeleteTagResponse {
  success: boolean;
  message: string;
  data: {
    deletedTagId: string;
    affectedTransactions: number; // 受影响的交易记录数量
  };
}
```

**权限要求**: 标签创建者或账本管理员

### 5. 获取标签详情

**接口**: `GET /api/tags/{tagId}`

**响应**:
```typescript
interface GetTagResponse {
  success: boolean;
  data: Tag & {
    recentTransactions: Transaction[]; // 最近使用该标签的交易记录
    statistics: {
      totalAmount: number;
      transactionCount: number;
      categoryDistribution: Array<{
        categoryId: string;
        categoryName: string;
        count: number;
        amount: number;
      }>;
    };
  };
}
```

## 交易标签关联API

### 1. 获取交易的标签

**接口**: `GET /api/transactions/{transactionId}/tags`

**响应**:
```typescript
interface GetTransactionTagsResponse {
  success: boolean;
  data: Tag[];
}
```

### 2. 为交易添加标签

**接口**: `POST /api/transactions/{transactionId}/tags`

**请求体**:
```typescript
interface AddTransactionTagsRequest {
  tagIds: string[];
}
```

**响应**:
```typescript
interface AddTransactionTagsResponse {
  success: boolean;
  data: {
    addedTags: Tag[];
    skippedTags: string[]; // 已存在的标签ID
  };
  message: string;
}
```

### 3. 移除交易标签

**接口**: `DELETE /api/transactions/{transactionId}/tags/{tagId}`

**响应**:
```typescript
interface RemoveTransactionTagResponse {
  success: boolean;
  message: string;
}
```

### 4. 批量操作交易标签

**接口**: `POST /api/transactions/batch/tags`

**请求体**:
```typescript
interface BatchTransactionTagsRequest {
  transactionIds: string[];
  action: 'add' | 'remove' | 'replace';
  tagIds: string[];
}
```

**响应**:
```typescript
interface BatchTransactionTagsResponse {
  success: boolean;
  data: {
    processedTransactions: number;
    failedTransactions: string[];
    summary: {
      added: number;
      removed: number;
      skipped: number;
    };
  };
  message: string;
}
```

## 统计分析API

### 1. 按标签统计

**接口**: `GET /api/statistics/by-tags`

**参数**:
```typescript
interface TagStatisticsQuery {
  accountBookId: string;
  tagIds?: string[];      // 指定标签ID，为空则统计所有标签
  startDate: string;
  endDate: string;
  transactionType?: 'income' | 'expense';
  categoryIds?: string[];
  budgetIds?: string[];
}
```

**响应**:
```typescript
interface TagStatisticsResponse {
  success: boolean;
  data: {
    overview: {
      totalAmount: number;
      transactionCount: number;
      tagCount: number;
    };
    tagStatistics: Array<{
      tag: Tag;
      statistics: {
        totalAmount: number;
        transactionCount: number;
        averageAmount: number;
        incomeAmount: number;
        expenseAmount: number;
        categoryBreakdown: Array<{
          categoryId: string;
          categoryName: string;
          amount: number;
          count: number;
        }>;
        monthlyTrend: Array<{
          month: string;
          amount: number;
          count: number;
        }>;
      };
    }>;
    crossAnalysis: {
      tagCombinations: Array<{
        tags: Tag[];
        count: number;
        amount: number;
      }>;
    };
  };
}
```

### 2. 标签使用趋势

**接口**: `GET /api/statistics/tag-trends`

**参数**:
```typescript
interface TagTrendsQuery {
  accountBookId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  limit?: number; // 返回前N个标签
}
```

**响应**:
```typescript
interface TagTrendsResponse {
  success: boolean;
  data: Array<{
    tag: Tag;
    trend: Array<{
      period: string;
      count: number;
      amount: number;
    }>;
    growth: {
      percentage: number;
      direction: 'up' | 'down' | 'stable';
    };
  }>;
}
```

## 搜索和筛选API

### 1. 搜索交易记录（按标签）

**接口**: `GET /api/transactions/search`

**参数**:
```typescript
interface SearchTransactionsQuery {
  accountBookId: string;
  tagIds?: string[];
  tagOperator?: 'and' | 'or'; // 标签筛选逻辑
  // ... 其他现有筛选参数
}
```

### 2. 标签建议

**接口**: `GET /api/tags/suggestions`

**参数**:
```typescript
interface TagSuggestionsQuery {
  accountBookId: string;
  transactionId?: string;    // 基于交易记录推荐
  categoryId?: string;       // 基于分类推荐
  description?: string;      // 基于描述推荐
  limit?: number;
}
```

**响应**:
```typescript
interface TagSuggestionsResponse {
  success: boolean;
  data: Array<{
    tag: Tag;
    confidence: number;      // 推荐置信度 0-1
    reason: string;          // 推荐原因
  }>;
}
```

## 权限控制

### 1. 权限级别

| 操作 | 账本成员 | 标签创建者 | 账本管理员 |
|------|----------|------------|------------|
| 查看标签 | ✅ | ✅ | ✅ |
| 使用标签 | ✅ | ✅ | ✅ |
| 创建标签 | ✅ | ✅ | ✅ |
| 编辑标签 | ❌ | ✅ | ✅ |
| 删除标签 | ❌ | ✅ | ✅ |
| 批量操作 | ✅ | ✅ | ✅ |

### 2. 权限验证中间件

```typescript
// 验证账本访问权限
async function validateAccountBookAccess(req, res, next) {
  const { accountBookId } = req.query || req.body;
  const userId = req.user.id;
  
  // 验证用户是否为账本成员
  const hasAccess = await checkAccountBookMembership(userId, accountBookId);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: '无权访问该账本'
    });
  }
  
  next();
}

// 验证标签操作权限
async function validateTagPermission(req, res, next) {
  const { tagId } = req.params;
  const userId = req.user.id;
  
  const tag = await getTagById(tagId);
  if (!tag) {
    return res.status(404).json({
      success: false,
      message: '标签不存在'
    });
  }
  
  // 检查是否为创建者或账本管理员
  const hasPermission = await checkTagPermission(userId, tag);
  if (!hasPermission) {
    return res.status(403).json({
      success: false,
      message: '无权操作该标签'
    });
  }
  
  next();
}
```

## 错误处理

### 1. 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

### 2. 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| TAG_NOT_FOUND | 404 | 标签不存在 |
| TAG_NAME_EXISTS | 409 | 标签名称已存在 |
| INVALID_COLOR_FORMAT | 400 | 颜色格式无效 |
| TAG_IN_USE | 409 | 标签正在使用中，无法删除 |
| INSUFFICIENT_PERMISSION | 403 | 权限不足 |
| ACCOUNT_BOOK_NOT_FOUND | 404 | 账本不存在 |
| TRANSACTION_NOT_FOUND | 404 | 交易记录不存在 |
| BATCH_OPERATION_FAILED | 422 | 批量操作部分失败 |

## 性能优化

### 1. 缓存策略
- 标签列表缓存（按账本）
- 标签使用统计缓存
- 搜索结果缓存

### 2. 分页和限制
- 默认分页大小：20
- 最大分页大小：100
- 批量操作限制：500条记录

### 3. 查询优化
- 使用数据库索引
- 避免N+1查询问题
- 合理使用JOIN查询

---

**文档版本**: v1.0
**创建时间**: 2024年
**维护团队**: zhiweijz-team
