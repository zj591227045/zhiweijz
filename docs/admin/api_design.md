# 管理系统API设计文档

## 1. 概述

本文档描述了"只为记账"管理系统的RESTful API设计。所有管理API都使用 `/api/admin` 前缀，并要求管理员身份验证。

## 2. 认证系统

### 2.1 管理员登录

**POST** `/api/admin/auth/login`

请求体：
```json
{
  "username": "admin",
  "password": "zhiweijz2025"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "admin": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN",
      "lastLoginAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 2.2 管理员登出

**POST** `/api/admin/auth/logout`

请求头：
```
Authorization: Bearer jwt_token
```

响应：
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 2.3 验证令牌

**GET** `/api/admin/auth/verify`

请求头：
```
Authorization: Bearer jwt_token
```

响应：
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "username": "admin",
      "role": "SUPER_ADMIN"
    }
  }
}
```

## 3. 仪表盘统计

### 3.1 获取仪表盘概览数据

**GET** `/api/admin/dashboard/overview`

响应：
```json
{
  "success": true,
  "data": {
    "userStats": {
      "totalUsers": 1000,
      "todayRegistrations": 5,
      "activeUsers": 150
    },
    "transactionStats": {
      "totalTransactions": 50000,
      "todayTransactions": 200
    },
    "systemStats": {
      "frontendVisits": 2000,
      "apiCalls": 15000,
      "uptime": "5 days"
    }
  }
}
```

### 3.2 获取图表数据

**GET** `/api/admin/dashboard/charts`

查询参数：
- `period`: `7d` | `30d` | `90d` (默认: `7d`)
- `metrics`: `users,transactions,visits` (逗号分隔)

响应：
```json
{
  "success": true,
  "data": {
    "users": [
      {"date": "2024-01-01", "value": 10},
      {"date": "2024-01-02", "value": 15}
    ],
    "transactions": [
      {"date": "2024-01-01", "value": 100},
      {"date": "2024-01-02", "value": 120}
    ]
  }
}
```

## 4. 用户管理

### 4.1 获取用户列表

**GET** `/api/admin/users`

查询参数：
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `search`: 搜索关键词
- `status`: `active` | `inactive`
- `sort`: `createdAt` | `name` | `email`
- `order`: `asc` | `desc`

响应：
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "name": "张三",
        "email": "zhang@example.com",
        "createdAt": "2024-01-01T00:00:00Z",
        "lastLoginAt": "2024-01-10T00:00:00Z",
        "transactionCount": 100,
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1000,
      "totalPages": 50
    }
  }
}
```

### 4.2 获取用户详情

**GET** `/api/admin/users/:id`

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "张三",
      "email": "zhang@example.com",
      "createdAt": "2024-01-01T00:00:00Z",
      "bio": "用户简介",
      "avatar": "avatar_url",
      "stats": {
        "transactionCount": 100,
        "totalAmount": 50000,
        "accountBookCount": 3
      }
    }
  }
}
```

### 4.3 创建用户

**POST** `/api/admin/users`

请求体：
```json
{
  "name": "新用户",
  "email": "newuser@example.com",
  "password": "temporary_password"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "新用户",
      "email": "newuser@example.com",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

### 4.4 更新用户

**PUT** `/api/admin/users/:id`

请求体：
```json
{
  "name": "更新后的名字",
  "email": "updated@example.com",
  "bio": "更新的简介"
}
```

### 4.5 重置用户密码

**POST** `/api/admin/users/:id/reset-password`

请求体：
```json
{
  "newPassword": "new_password"
}
```

### 4.6 禁用/启用用户

**PATCH** `/api/admin/users/:id/status`

请求体：
```json
{
  "isActive": false
}
```

### 4.7 删除用户

**DELETE** `/api/admin/users/:id`

## 5. 系统配置

### 5.1 获取系统配置

**GET** `/api/admin/configs`

查询参数：
- `category`: 配置分类 (可选)

响应：
```json
{
  "success": true,
  "data": {
    "configs": [
      {
        "id": "uuid",
        "key": "registration_enabled",
        "value": "true",
        "type": "BOOLEAN",
        "category": "user",
        "description": "是否允许用户注册",
        "isEditable": true
      }
    ]
  }
}
```

### 5.2 更新系统配置

**PUT** `/api/admin/configs/:id`

请求体：
```json
{
  "value": "false"
}
```

### 5.3 批量更新配置

**POST** `/api/admin/configs/batch`

请求体：
```json
{
  "configs": [
    {
      "key": "registration_enabled",
      "value": "false"
    },
    {
      "key": "llm_enabled",
      "value": "true"
    }
  ]
}
```

## 6. LLM服务管理

### 6.1 获取LLM配置

**GET** `/api/admin/llm/config`

响应：
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "config": {
      "provider": "openai",
      "apiKey": "sk-***",
      "model": "gpt-3.5-turbo",
      "baseURL": "https://api.openai.com/v1"
    }
  }
}
```

### 6.2 更新LLM配置

**PUT** `/api/admin/llm/config`

请求体：
```json
{
  "enabled": true,
  "config": {
    "provider": "openai",
    "apiKey": "sk-new-key",
    "model": "gpt-4",
    "baseURL": "https://api.openai.com/v1"
  }
}
```

### 6.3 测试LLM连接

**POST** `/api/admin/llm/test`

请求体：
```json
{
  "config": {
    "provider": "openai",
    "apiKey": "sk-test-key",
    "model": "gpt-3.5-turbo",
    "baseURL": "https://api.openai.com/v1"
  }
}
```

响应：
```json
{
  "success": true,
  "data": {
    "connected": true,
    "response": "测试响应内容",
    "latency": 1500
  }
}
```

### 6.4 获取LLM调用日志

**GET** `/api/admin/llm/logs`

查询参数：
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `userId`: 用户ID过滤
- `accountBookId`: 账本ID过滤
- `provider`: 服务提供商过滤
- `isSuccess`: 成功状态过滤 (`true` | `false`)
- `sort`: 排序字段 (`createdAt` | `duration` | `totalTokens`)
- `order`: 排序方向 (`asc` | `desc`)

响应：
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user_uuid",
        "userName": "张三",
        "accountBookId": "account_book_uuid",
        "accountBookName": "个人账本",
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "promptTokens": 150,
        "completionTokens": 200,
        "totalTokens": 350,
        "userMessage": "帮我分析一下这个月的支出情况",
        "assistantMessage": "根据您的数据分析...",
        "isSuccess": true,
        "duration": 2500,
        "cost": 0.0175,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 500,
      "totalPages": 25
    },
    "stats": {
      "totalCalls": 500,
      "successRate": 95.2,
      "totalTokens": 175000,
      "totalCost": 87.50,
      "avgDuration": 1800
    }
  }
}
```

### 6.5 获取LLM调用统计

**GET** `/api/admin/llm/stats`

查询参数：
- `period`: `7d` | `30d` | `90d` (默认: `7d`)
- `groupBy`: `day` | `hour` | `user` | `provider`

响应：
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCalls": 1500,
      "successCalls": 1428,
      "failedCalls": 72,
      "successRate": 95.2,
      "totalTokens": 520000,
      "totalCost": 260.00,
      "avgDuration": 1650
    },
    "timeline": [
      {
        "date": "2024-01-01",
        "calls": 150,
        "tokens": 52000,
        "cost": 26.00,
        "avgDuration": 1600
      }
    ],
    "topUsers": [
      {
        "userId": "user_uuid",
        "userName": "张三",
        "calls": 50,
        "tokens": 17500,
        "cost": 8.75
      }
    ],
    "providerStats": [
      {
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "calls": 800,
        "tokens": 280000,
        "cost": 140.00,
        "avgDuration": 1500
      }
    ]
  }
}
```

### 6.6 获取LLM调用详情

**GET** `/api/admin/llm/logs/:id`

响应：
```json
{
  "success": true,
  "data": {
    "log": {
      "id": "uuid",
      "userId": "user_uuid",
      "userName": "张三",
      "accountBookId": "account_book_uuid",
      "accountBookName": "个人账本",
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350,
      "userMessage": "帮我分析一下这个月的支出情况",
      "assistantMessage": "根据您的数据分析，本月总支出为...",
      "systemPrompt": "你是一个专业的记账助手...",
      "isSuccess": true,
      "errorMessage": null,
      "duration": 2500,
      "cost": 0.0175,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

## 7. 公告管理

### 7.1 获取公告列表

**GET** `/api/admin/announcements`

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `status`: `DRAFT` | `PUBLISHED` | `EXPIRED` | `ARCHIVED`
- `type`: `GENERAL` | `SYSTEM` | `FEATURE` | `MAINTENANCE`
- `search`: 搜索关键词

响应：
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "系统维护通知",
        "summary": "系统将于今晚进行维护",
        "type": "MAINTENANCE",
        "status": "PUBLISHED",
        "priority": 1,
        "publishedAt": "2024-01-01T00:00:00Z",
        "expiresAt": "2024-01-07T00:00:00Z",
        "readCount": 500,
        "totalUsers": 1000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

### 7.2 获取公告详情

**GET** `/api/admin/announcements/:id`

响应：
```json
{
  "success": true,
  "data": {
    "announcement": {
      "id": "uuid",
      "title": "系统维护通知",
      "content": "详细的公告内容...",
      "summary": "系统将于今晚进行维护",
      "type": "MAINTENANCE",
      "status": "PUBLISHED",
      "priority": 1,
      "publishedAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-07T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "stats": {
        "readCount": 500,
        "totalUsers": 1000,
        "readRate": 50.0
      }
    }
  }
}
```

### 7.3 创建公告

**POST** `/api/admin/announcements`

请求体：
```json
{
  "title": "新公告标题",
  "content": "详细内容",
  "summary": "简短摘要",
  "type": "GENERAL",
  "priority": 0,
  "expiresAt": "2024-01-07T00:00:00Z"
}
```

### 7.4 更新公告

**PUT** `/api/admin/announcements/:id`

请求体：
```json
{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "summary": "更新后的摘要",
  "priority": 1
}
```

### 7.5 发布公告

**POST** `/api/admin/announcements/:id/publish`

响应：
```json
{
  "success": true,
  "message": "公告发布成功",
  "data": {
    "publishedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 7.6 撤回公告

**POST** `/api/admin/announcements/:id/unpublish`

### 7.7 删除公告

**DELETE** `/api/admin/announcements/:id`

### 7.8 获取公告统计

**GET** `/api/admin/announcements/:id/stats`

响应：
```json
{
  "success": true,
  "data": {
    "readCount": 500,
    "totalUsers": 1000,
    "readRate": 50.0,
    "readTrend": [
      {"date": "2024-01-01", "count": 100},
      {"date": "2024-01-02", "count": 200}
    ]
  }
}
```

## 8. 系统日志

### 8.1 获取访问日志

**GET** `/api/admin/logs/access`

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `startDate`: 开始日期
- `endDate`: 结束日期
- `userId`: 用户ID
- `path`: 访问路径

响应：
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user_uuid",
        "userName": "张三",
        "path": "/dashboard",
        "method": "GET",
        "ip": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "duration": 500,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5000,
      "totalPages": 100
    }
  }
}
```

### 8.2 获取API调用日志

**GET** `/api/admin/logs/api`

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `startDate`: 开始日期
- `endDate`: 结束日期
- `endpoint`: API端点
- `statusCode`: HTTP状态码

响应：
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "endpoint": "/api/transactions",
        "method": "POST",
        "userId": "user_uuid",
        "userName": "张三",
        "statusCode": 200,
        "duration": 150,
        "requestSize": 1024,
        "responseSize": 512,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10000,
      "totalPages": 200
    }
  }
}
```

### 8.3 获取LLM调用日志

**GET** `/api/admin/logs/llm`

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `startDate`: 开始日期
- `endDate`: 结束日期
- `userId`: 用户ID
- `provider`: LLM服务提供商
- `isSuccess`: 调用成功状态

响应：
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "user_uuid",
        "userName": "张三",
        "accountBookId": "account_book_uuid",
        "accountBookName": "个人账本",
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "totalTokens": 350,
        "isSuccess": true,
        "duration": 2500,
        "cost": 0.0175,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 5000,
      "totalPages": 100
    }
  }
}
```

## 9. 用户端API扩展

### 9.1 获取系统配置 (用户端)

**GET** `/api/system/config`

响应：
```json
{
  "success": true,
  "data": {
    "registrationEnabled": true,
    "llmEnabled": false
  }
}
```

### 9.2 获取公告列表 (用户端)

**GET** `/api/announcements`

请求头：
```
Authorization: Bearer user_jwt_token
```

查询参数：
- `page`: 页码
- `limit`: 每页数量
- `unreadOnly`: `true` 只返回未读公告

响应：
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "uuid",
        "title": "系统维护通知",
        "summary": "系统将于今晚进行维护",
        "type": "MAINTENANCE",
        "priority": 1,
        "publishedAt": "2024-01-01T00:00:00Z",
        "isRead": false
      }
    ],
    "unreadCount": 3
  }
}
```

### 9.3 标记公告为已读

**POST** `/api/announcements/:id/read`

请求头：
```
Authorization: Bearer user_jwt_token
```

### 9.4 批量标记已读

**POST** `/api/announcements/read-batch`

请求体：
```json
{
  "announcementIds": ["uuid1", "uuid2", "uuid3"]
}
```

## 10. 错误处理

### 10.1 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未授权访问",
    "details": "JWT token无效或已过期"
  }
}
```

### 10.2 常见错误码

- `UNAUTHORIZED`: 未授权 (401)
- `FORBIDDEN`: 禁止访问 (403)
- `NOT_FOUND`: 资源不存在 (404)
- `VALIDATION_ERROR`: 请求参数验证失败 (400)
- `INTERNAL_ERROR`: 服务器内部错误 (500)
- `RATE_LIMIT_EXCEEDED`: 请求频率超限 (429)

## 11. 接口权限

### 11.1 权限等级

- **PUBLIC**: 无需认证
- **USER**: 需要用户认证
- **ADMIN**: 需要管理员认证
- **SUPER_ADMIN**: 需要超级管理员认证

### 11.2 权限矩阵

| 接口分类 | 普通管理员 | 超级管理员 |
|---------|-----------|-----------|
| 仪表盘统计 | ✅ | ✅ |
| 用户查看 | ✅ | ✅ |
| 用户编辑 | ❌ | ✅ |
| 用户删除 | ❌ | ✅ |
| 系统配置 | ❌ | ✅ |
| LLM管理 | ✅ | ✅ |
| LLM日志查看 | ✅ | ✅ |
| 公告管理 | ✅ | ✅ |
| 系统日志 | ✅ | ✅ |

## 12. 请求限制

### 12.1 频率限制

- 登录接口: 5次/分钟
- 管理接口: 100次/分钟
- 批量操作: 10次/分钟

### 12.2 数据限制

- 公告内容: 最大50KB
- 用户列表: 最大100条/页
- 日志查询: 最大1000条/页

## 13. 接口版本

当前API版本: `v1`

版本化策略：
- URL版本化: `/api/v1/admin/...`
- 向后兼容性: 至少支持一个旧版本
- 废弃通知: 提前30天通知版本废弃

---

本API设计遵循RESTful原则，支持JSON格式数据交换，所有日期时间均使用ISO 8601格式。建议在实际开发中根据具体需求进行调整和扩展。 