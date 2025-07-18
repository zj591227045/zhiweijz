# 只为记账 - 后端模块详细设计

本文档详细描述了"只为记账"应用后端的各个模块设计，包括每个模块的职责、业务逻辑、数据模型和API接口。

**注意**: 由于文档长度限制，本文档只包含部分模块的详细设计。完整的模块设计分布在以下文件中：
- `module_design.md`: 用户认证、用户管理、记账记录模块
- `module_design_part2.md`: 分类管理、预算管理模块
- `module_design_part3.md`: 家庭账本、统计分析、AI功能模块

## 1. 用户认证模块 (Auth Module)

### 职责
- 用户注册和账户创建
- 用户登录和身份验证
- 密码重置和恢复
- JWT令牌管理
- 会话控制

### 业务逻辑

#### 用户注册
1. 验证注册信息（邮箱格式、密码强度）
2. 检查邮箱是否已被注册
3. 密码加密（使用bcrypt）
4. 创建用户记录
5. 生成JWT令牌
6. 返回用户信息和令牌

#### 用户登录
1. 验证登录凭证（邮箱和密码）
2. 检查用户是否存在
3. 验证密码
4. 生成JWT令牌
5. 返回用户信息和令牌

#### 密码重置
1. 验证用户邮箱
2. 生成密码重置令牌
3. 发送重置链接到用户邮箱
4. 验证重置令牌
5. 更新用户密码

### 数据模型
使用User表存储用户认证信息：
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  // 关系字段...
}
```

### API接口

#### POST /api/auth/register
- 功能：注册新用户
- 请求体：
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "用户名"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "用户名",
    "createdAt": "2023-05-15T10:00:00Z",
    "token": "jwt_token"
  }
  ```

#### POST /api/auth/login
- 功能：用户登录
- 请求体：
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- 响应：
  ```json
  {
    "token": "jwt_token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "用户名"
    }
  }
  ```

#### POST /api/auth/forgot-password
- 功能：请求密码重置
- 请求体：
  ```json
  {
    "email": "user@example.com"
  }
  ```
- 响应：
  ```json
  {
    "message": "如果该邮箱存在，我们已发送密码重置链接"
  }
  ```

#### POST /api/auth/reset-password
- 功能：重置密码
- 请求体：
  ```json
  {
    "token": "reset_token",
    "password": "newpassword"
  }
  ```
- 响应：
  ```json
  {
    "message": "密码已成功重置"
  }
  ```

#### POST /api/auth/change-password
- 功能：修改密码
- 请求体：
  ```json
  {
    "currentPassword": "oldpassword",
    "newPassword": "newpassword"
  }
  ```
- 响应：
  ```json
  {
    "message": "密码已成功更新"
  }
  ```

### 依赖关系
- 依赖于User模块提供的用户数据访问
- 被其他所有需要认证的模块依赖

## 2. 用户管理模块 (User Module)

### 职责
- 用户个人资料管理
- 用户设置和偏好管理
- 用户数据访问控制

### 业务逻辑

#### 获取用户信息
1. 验证用户身份
2. 获取用户详细信息
3. 返回用户数据

#### 更新用户信息
1. 验证用户身份
2. 验证更新数据
3. 更新用户记录
4. 返回更新后的用户数据

### 数据模型
使用与Auth模块相同的User表，但关注不同的字段和关系。

### API接口

#### GET /api/users/me
- 功能：获取当前用户信息
- 响应：
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "用户名",
    "createdAt": "2023-05-15T10:00:00Z"
  }
  ```

#### PATCH /api/users/me
- 功能：更新用户信息
- 请求体：
  ```json
  {
    "name": "新用户名"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "新用户名",
    "updatedAt": "2023-05-15T11:00:00Z"
  }
  ```

### 依赖关系
- 被Auth模块依赖用于用户数据访问
- 被其他模块依赖用于获取用户信息

## 3. 记账记录模块 (Transaction Module)

### 职责
- 管理收入和支出记录
- 提供记账记录的CRUD操作
- 支持记账记录的搜索和筛选
- 处理记账与分类、用户、家庭的关联

### 业务逻辑

#### 创建记账记录
1. 验证记账数据
2. 检查分类是否存在
3. 检查家庭和家庭成员（如果提供）
4. 创建记账记录
5. 更新相关预算数据
6. 返回创建的记账记录

#### 获取记账记录列表
1. 验证查询参数
2. 应用筛选条件（日期范围、类型、分类等）
3. 分页处理
4. 返回记账记录列表

#### 更新记账记录
1. 验证用户权限
2. 验证更新数据
3. 更新记账记录
4. 更新相关预算数据
5. 返回更新后的记账记录

#### 删除记账记录
1. 验证用户权限
2. 删除记账记录
3. 更新相关预算数据

### 数据模型
```prisma
model Transaction {
  id             String          @id @default(uuid())
  amount         Decimal         @db.Decimal(10, 2)
  type           TransactionType
  categoryId     String          @map("category_id")
  description    String?
  date           DateTime
  userId         String          @map("user_id")
  familyId       String?         @map("family_id")
  familyMemberId String?         @map("family_member_id")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  // 关系
  user         User          @relation(fields: [userId], references: [id])
  family       Family?       @relation(fields: [familyId], references: [id])
  familyMember FamilyMember? @relation(fields: [familyMemberId], references: [id])
  category     Category      @relation(fields: [categoryId], references: [id])
}

enum TransactionType {
  INCOME
  EXPENSE
}
```

### API接口

#### POST /api/transactions
- 功能：创建记账记录
- 请求体：
  ```json
  {
    "amount": 100.50,
    "type": "EXPENSE",
    "categoryId": "category_uuid",
    "description": "午餐费用",
    "date": "2023-05-15T12:30:00Z",
    "familyId": "family_uuid",
    "familyMemberId": "member_uuid"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "amount": 100.50,
    "type": "EXPENSE",
    "categoryId": "category_uuid",
    "description": "午餐费用",
    "date": "2023-05-15T12:30:00Z",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "familyMemberId": "member_uuid",
    "createdAt": "2023-05-15T12:35:00Z"
  }
  ```

#### GET /api/transactions
- 功能：获取记账记录列表
- 查询参数：
  - `type`: 记账类型 (INCOME, EXPENSE)
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `categoryId`: 分类ID
  - `familyId`: 家庭ID
  - `page`: 页码 (默认1)
  - `limit`: 每页数量 (默认20)
- 响应：
  ```json
  {
    "total": 100,
    "page": 1,
    "limit": 20,
    "data": [
      {
        "id": "uuid",
        "amount": 100.50,
        "type": "EXPENSE",
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "description": "午餐费用",
        "date": "2023-05-15T12:30:00Z",
        "userId": "user_uuid",
        "familyId": "family_uuid",
        "familyMember": {
          "id": "uuid",
          "name": "家庭成员名"
        },
        "createdAt": "2023-05-15T12:35:00Z"
      },
      // ...更多记账记录
    ]
  }
  ```

#### GET /api/transactions/:id
- 功能：获取单个记账记录
- 响应：
  ```json
  {
    "id": "uuid",
    "amount": 100.50,
    "type": "EXPENSE",
    "category": {
      "id": "uuid",
      "name": "餐饮",
      "icon": "food"
    },
    "description": "午餐费用",
    "date": "2023-05-15T12:30:00Z",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "familyMember": {
      "id": "uuid",
      "name": "家庭成员名"
    },
    "createdAt": "2023-05-15T12:35:00Z",
    "updatedAt": "2023-05-15T12:35:00Z"
  }
  ```

#### PATCH /api/transactions/:id
- 功能：更新记账记录
- 请求体：
  ```json
  {
    "amount": 120.50,
    "description": "更新的午餐费用"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "amount": 120.50,
    "type": "EXPENSE",
    "categoryId": "category_uuid",
    "description": "更新的午餐费用",
    "date": "2023-05-15T12:30:00Z",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "familyMemberId": "member_uuid",
    "updatedAt": "2023-05-15T13:00:00Z"
  }
  ```

#### DELETE /api/transactions/:id
- 功能：删除记账记录
- 响应：204 No Content

### 依赖关系
- 依赖于User模块获取用户信息
- 依赖于Category模块获取分类信息
- 依赖于Family模块获取家庭和成员信息
- 被Statistics模块依赖用于数据分析
- 被Budget模块依赖用于预算计算
