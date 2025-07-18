# 只为记账 - 多账本功能API接口文档

本文档详细描述了"只为记账"应用中多账本功能的API接口，包括请求参数、响应格式和错误处理。

## 1. 基本信息

- **基础URL**: `/api/v1`
- **认证方式**: JWT令牌，在请求头中添加 `Authorization: Bearer {token}`
- **响应格式**: JSON
- **错误响应格式**:
  ```json
  {
    "message": "错误信息"
  }
  ```

## 2. 账本管理API

### 2.1 创建账本

创建一个新的账本。

- **URL**: `/account-books`
- **方法**: `POST`
- **认证**: 需要JWT令牌
- **请求体**:
  ```json
  {
    "name": "我的账本",
    "description": "这是我的个人账本",
    "isDefault": false
  }
  ```
  | 字段 | 类型 | 必填 | 描述 |
  |------|------|------|------|
  | name | string | 是 | 账本名称 |
  | description | string | 否 | 账本描述 |
  | isDefault | boolean | 否 | 是否为默认账本，默认为false |

- **成功响应**: 201 Created
  ```json
  {
    "id": "uuid",
    "name": "我的账本",
    "description": "这是我的个人账本",
    "userId": "user_uuid",
    "isDefault": false,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:00:00Z",
    "transactionCount": 0,
    "categoryCount": 0,
    "budgetCount": 0
  }
  ```

- **错误响应**:
  - 400 Bad Request: 请求参数错误
  - 401 Unauthorized: 未授权
  - 500 Internal Server Error: 服务器错误

### 2.2 获取账本列表

获取当前用户的所有账本。

- **URL**: `/account-books`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **查询参数**:
  | 参数 | 类型 | 必填 | 描述 |
  |------|------|------|------|
  | page | number | 否 | 页码，默认1 |
  | limit | number | 否 | 每页数量，默认20 |
  | sortBy | string | 否 | 排序字段，默认createdAt |
  | sortOrder | string | 否 | 排序方向，asc或desc，默认desc |

- **成功响应**: 200 OK
  ```json
  {
    "total": 2,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "id": "uuid1",
        "name": "默认账本",
        "description": "系统自动创建的默认账本",
        "userId": "user_uuid",
        "isDefault": true,
        "createdAt": "2023-05-15T16:00:00Z",
        "updatedAt": "2023-05-15T16:00:00Z",
        "transactionCount": 10,
        "categoryCount": 5,
        "budgetCount": 2
      },
      {
        "id": "uuid2",
        "name": "旅行账本",
        "description": "记录旅行相关支出",
        "userId": "user_uuid",
        "isDefault": false,
        "createdAt": "2023-05-16T16:00:00Z",
        "updatedAt": "2023-05-16T16:00:00Z",
        "transactionCount": 5,
        "categoryCount": 3,
        "budgetCount": 1
      }
    ]
  }
  ```

- **错误响应**:
  - 401 Unauthorized: 未授权
  - 500 Internal Server Error: 服务器错误

### 2.3 获取默认账本

获取当前用户的默认账本。

- **URL**: `/account-books/default`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid1",
    "name": "默认账本",
    "description": "系统自动创建的默认账本",
    "userId": "user_uuid",
    "isDefault": true,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:00:00Z",
    "transactionCount": 10,
    "categoryCount": 5,
    "budgetCount": 2
  }
  ```

- **错误响应**:
  - 401 Unauthorized: 未授权
  - 404 Not Found: 未找到默认账本
  - 500 Internal Server Error: 服务器错误

### 2.4 获取单个账本

获取指定ID的账本详情。

- **URL**: `/account-books/:id`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid",
    "name": "我的账本",
    "description": "这是我的个人账本",
    "userId": "user_uuid",
    "isDefault": false,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:00:00Z",
    "transactionCount": 0,
    "categoryCount": 0,
    "budgetCount": 0
  }
  ```

- **错误响应**:
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在
  - 500 Internal Server Error: 服务器错误

### 2.5 更新账本

更新指定ID的账本信息。

- **URL**: `/account-books/:id`
- **方法**: `PUT`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **请求体**:
  ```json
  {
    "name": "更新后的账本名称",
    "description": "更新后的描述",
    "isDefault": false
  }
  ```
  | 字段 | 类型 | 必填 | 描述 |
  |------|------|------|------|
  | name | string | 否 | 账本名称 |
  | description | string | 否 | 账本描述 |
  | isDefault | boolean | 否 | 是否为默认账本 |

- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid",
    "name": "更新后的账本名称",
    "description": "更新后的描述",
    "userId": "user_uuid",
    "isDefault": false,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:30:00Z",
    "transactionCount": 0,
    "categoryCount": 0,
    "budgetCount": 0
  }
  ```

- **错误响应**:
  - 400 Bad Request: 请求参数错误
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在
  - 500 Internal Server Error: 服务器错误

### 2.6 删除账本

删除指定ID的账本。注意：不能删除默认账本。

- **URL**: `/account-books/:id`
- **方法**: `DELETE`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **成功响应**: 204 No Content

- **错误响应**:
  - 400 Bad Request: 不能删除默认账本
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在
  - 500 Internal Server Error: 服务器错误

### 2.7 设置默认账本

将指定ID的账本设置为默认账本。

- **URL**: `/account-books/:id/set-default`
- **方法**: `POST`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid",
    "name": "我的账本",
    "description": "这是我的个人账本",
    "userId": "user_uuid",
    "isDefault": true,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:40:00Z",
    "transactionCount": 0,
    "categoryCount": 0,
    "budgetCount": 0
  }
  ```

- **错误响应**:
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在
  - 500 Internal Server Error: 服务器错误

## 3. 账本LLM设置API

### 3.1 获取账本LLM设置

获取指定账本的LLM设置。

- **URL**: `/account-books/:id/llm-settings`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid",
    "accountBookId": "account_book_uuid",
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "temperature": 0.3,
    "maxTokens": 1000,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:00:00Z"
  }
  ```

- **错误响应**:
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在或未找到LLM设置
  - 500 Internal Server Error: 服务器错误

### 3.2 更新账本LLM设置

更新指定账本的LLM设置。

- **URL**: `/account-books/:id/llm-settings`
- **方法**: `PUT`
- **认证**: 需要JWT令牌
- **路径参数**:
  | 参数 | 类型 | 描述 |
  |------|------|------|
  | id | string | 账本ID |

- **请求体**:
  ```json
  {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "sk-...",
    "temperature": 0.7,
    "maxTokens": 2000
  }
  ```
  | 字段 | 类型 | 必填 | 描述 |
  |------|------|------|------|
  | provider | string | 是 | LLM服务提供商，如openai |
  | model | string | 是 | 模型名称，如gpt-3.5-turbo, gpt-4 |
  | apiKey | string | 否 | API密钥 |
  | temperature | number | 否 | 温度参数，控制随机性，默认0.3 |
  | maxTokens | number | 否 | 最大令牌数，默认1000 |

- **成功响应**: 200 OK
  ```json
  {
    "id": "uuid",
    "accountBookId": "account_book_uuid",
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:50:00Z"
  }
  ```

- **错误响应**:
  - 400 Bad Request: 请求参数错误
  - 401 Unauthorized: 未授权
  - 404 Not Found: 账本不存在
  - 500 Internal Server Error: 服务器错误

## 4. 与其他API的集成

### 4.1 记账记录API

在创建和查询记账记录时，可以指定账本ID：

- **创建记账记录**:
  ```json
  {
    "amount": 100,
    "type": "EXPENSE",
    "categoryId": "category_uuid",
    "description": "午餐",
    "date": "2023-05-15T12:00:00Z",
    "accountBookId": "account_book_uuid"
  }
  ```

- **查询记账记录**:
  ```
  GET /transactions?accountBookId=account_book_uuid
  ```

### 4.2 预算API

在创建和查询预算时，可以指定账本ID：

- **创建预算**:
  ```json
  {
    "name": "月度餐饮预算",
    "amount": 1000,
    "period": "MONTHLY",
    "startDate": "2023-05-01T00:00:00Z",
    "endDate": "2023-05-31T23:59:59Z",
    "categoryId": "category_uuid",
    "accountBookId": "account_book_uuid"
  }
  ```

- **查询预算**:
  ```
  GET /budgets?accountBookId=account_book_uuid
  ```

### 4.3 分类API

在创建和查询分类时，可以指定账本ID：

- **创建分类**:
  ```json
  {
    "name": "餐饮",
    "type": "EXPENSE",
    "icon": "food",
    "accountBookId": "account_book_uuid"
  }
  ```

- **查询分类**:
  ```
  GET /categories?accountBookId=account_book_uuid
  ```

## 5. 错误码和错误处理

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权 |
| 403 | Forbidden | 无权访问 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Server Error | 服务器错误 |

常见错误消息：

- "账本不存在"
- "无权访问此账本"
- "不能删除默认账本"
- "未找到默认账本"
- "未找到LLM设置"
