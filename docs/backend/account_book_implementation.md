# 只为记账 - 多账本功能实现文档

本文档详细描述了"只为记账"应用中多账本功能的实现方案，包括数据模型、业务逻辑、API接口和实现细节。

## 1. 功能概述

多账本功能允许用户创建和管理多个独立的账本，每个账本可以单独绑定AI LLM服务。主要功能包括：

1. 用户可以创建多个个人账本
2. 用户在初始化时自动创建一个默认账本
3. 用户可以设置任意账本为默认账本
4. 每个账本可以单独绑定AI LLM服务
5. 交易记录、预算和分类可以关联到特定账本

## 2. 数据模型

### 2.1 账本模型 (AccountBook)

```prisma
model AccountBook {
  id          String    @id @default(uuid())
  name        String
  description String?
  userId      String    @map("user_id")
  isDefault   Boolean   @default(false) @map("is_default")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  // 关系
  user         User               @relation(fields: [userId], references: [id])
  transactions Transaction[]
  categories   Category[]
  budgets      Budget[]
  llmSettings  AccountLLMSetting[]

  @@map("account_books")
}
```

### 2.2 账本LLM设置模型 (AccountLLMSetting)

```prisma
model AccountLLMSetting {
  id            String    @id @default(uuid())
  accountBookId String    @map("account_book_id")
  provider      String    @default("openai")
  model         String    @default("gpt-3.5-turbo")
  apiKey        String?   @map("api_key")
  temperature   Float     @default(0.3)
  maxTokens     Int       @default(1000) @map("max_tokens")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // 关系
  accountBook   AccountBook @relation(fields: [accountBookId], references: [id])

  @@map("account_llm_settings")
}
```

### 2.3 相关模型修改

为了支持多账本功能，我们对以下模型进行了修改，添加了 `accountBookId` 字段：

- Transaction (交易记录)
- Budget (预算)
- Category (分类)

## 3. 业务逻辑

### 3.1 账本管理

1. **创建账本**：用户可以创建新账本，指定名称、描述和是否为默认账本
2. **查询账本**：用户可以查询自己的所有账本，或获取单个账本详情
3. **更新账本**：用户可以更新账本的名称、描述和默认状态
4. **删除账本**：用户可以删除非默认账本
5. **设置默认账本**：用户可以将任意账本设置为默认账本，同时自动取消其他账本的默认状态

### 3.2 账本LLM设置管理

1. **设置LLM服务**：用户可以为每个账本单独设置LLM服务提供商、模型和参数
2. **查询LLM设置**：用户可以查询账本的LLM设置
3. **更新LLM设置**：用户可以更新账本的LLM设置

### 3.3 默认账本处理

1. **用户注册**：用户注册成功后，自动创建一个默认账本
2. **交易记录**：创建交易记录时，如果未指定账本，则使用用户的默认账本
3. **预算和分类**：创建预算和分类时，可以关联到特定账本

## 4. API接口

### 4.1 账本管理API

#### 创建账本

- **URL**: `/api/v1/account-books`
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
- **响应**: 201 Created
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

#### 获取账本列表

- **URL**: `/api/v1/account-books`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **查询参数**:
  - `page`: 页码，默认1
  - `limit`: 每页数量，默认20
  - `sortBy`: 排序字段，默认createdAt
  - `sortOrder`: 排序方向，asc或desc，默认desc
- **响应**: 200 OK
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

#### 获取默认账本

- **URL**: `/api/v1/account-books/default`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **响应**: 200 OK
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

#### 获取单个账本

- **URL**: `/api/v1/account-books/:id`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **响应**: 200 OK
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

#### 更新账本

- **URL**: `/api/v1/account-books/:id`
- **方法**: `PUT`
- **认证**: 需要JWT令牌
- **请求体**:
  ```json
  {
    "name": "更新后的账本名称",
    "description": "更新后的描述",
    "isDefault": false
  }
  ```
- **响应**: 200 OK
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

#### 删除账本

- **URL**: `/api/v1/account-books/:id`
- **方法**: `DELETE`
- **认证**: 需要JWT令牌
- **响应**: 204 No Content

#### 设置默认账本

- **URL**: `/api/v1/account-books/:id/set-default`
- **方法**: `POST`
- **认证**: 需要JWT令牌
- **响应**: 200 OK
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

### 4.2 账本LLM设置API

#### 获取账本LLM设置

- **URL**: `/api/v1/account-books/:id/llm-settings`
- **方法**: `GET`
- **认证**: 需要JWT令牌
- **响应**: 200 OK
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

#### 更新账本LLM设置

- **URL**: `/api/v1/account-books/:id/llm-settings`
- **方法**: `PUT`
- **认证**: 需要JWT令牌
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
- **响应**: 200 OK
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

## 5. 实现细节

### 5.1 账本仓库 (AccountBookRepository)

账本仓库负责处理账本的数据访问操作，包括：

1. 创建账本
2. 查询账本（按ID、按用户ID、查询默认账本）
3. 更新账本
4. 删除账本
5. 重置默认账本状态
6. 获取账本统计信息

### 5.2 账本LLM设置仓库 (AccountLLMSettingRepository)

账本LLM设置仓库负责处理账本LLM设置的数据访问操作，包括：

1. 创建或更新LLM设置
2. 查询LLM设置
3. 更新LLM设置
4. 删除LLM设置

### 5.3 账本服务 (AccountBookService)

账本服务实现了账本的业务逻辑，包括：

1. 创建账本
2. 查询账本列表和单个账本
3. 获取默认账本
4. 更新账本
5. 删除账本
6. 设置默认账本
7. 创建默认账本
8. 管理账本LLM设置

### 5.4 账本控制器 (AccountBookController)

账本控制器处理HTTP请求，调用账本服务，并返回响应，包括：

1. 处理创建账本请求
2. 处理查询账本请求
3. 处理更新账本请求
4. 处理删除账本请求
5. 处理设置默认账本请求
6. 处理LLM设置相关请求

### 5.5 与现有功能的集成

为了支持多账本功能，我们修改了以下服务：

1. **AuthService**：在用户注册成功后创建默认账本
2. **TransactionService**：支持按账本ID筛选交易，如果未指定账本ID则使用默认账本
3. **BudgetService**：支持按账本ID筛选预算
4. **CategoryService**：支持按账本ID筛选分类

## 6. 测试

### 6.1 单元测试

为账本服务编写了单元测试，测试以下功能：

1. 创建账本
2. 查询账本列表
3. 获取单个账本
4. 获取默认账本
5. 更新账本
6. 删除账本
7. 设置默认账本
8. 管理账本LLM设置

### 6.2 集成测试

为账本API编写了集成测试，测试以下功能：

1. 创建账本API
2. 获取账本列表API
3. 获取默认账本API
4. 获取单个账本API
5. 更新账本API
6. 删除账本API
7. 设置默认账本API
8. 获取和更新账本LLM设置API
