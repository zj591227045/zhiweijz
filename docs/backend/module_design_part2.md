# 只为记账 - 后端模块详细设计 (第2部分)

本文档是"只为记账"应用后端模块设计的第2部分，包含分类管理和预算管理模块的详细设计。

## 4. 分类管理模块 (Category Module)

### 职责
- 管理交易分类的CRUD操作
- 提供默认分类和自定义分类
- 处理分类与用户、家庭的关联

### 业务逻辑

#### 初始化默认分类
1. 系统启动时检查默认分类是否存在
2. 如果不存在，创建默认收入和支出分类
3. 默认分类对所有用户可见

#### 创建自定义分类
1. 验证分类数据
2. 检查用户或家庭是否有权限创建
3. 创建分类记录
4. 返回创建的分类

#### 获取分类列表
1. 验证查询参数
2. 获取系统默认分类
3. 获取用户自定义分类
4. 如果提供了家庭ID，获取家庭自定义分类
5. 合并并返回分类列表

#### 更新分类
1. 验证用户权限
2. 验证更新数据
3. 更新分类记录
4. 返回更新后的分类

#### 删除分类
1. 验证用户权限
2. 检查分类是否被交易记录使用
3. 如果被使用，提示用户先修改相关交易记录
4. 删除分类记录

### 数据模型
```prisma
model Category {
  id         String       @id @default(uuid())
  name       String
  type       TransactionType
  icon       String?
  userId     String?      @map("user_id")
  familyId   String?      @map("family_id")
  isDefault  Boolean      @default(false) @map("is_default")
  createdAt  DateTime     @default(now()) @map("created_at")
  updatedAt  DateTime     @updatedAt @map("updated_at")

  // 关系
  user         User?         @relation(fields: [userId], references: [id])
  family       Family?       @relation(fields: [familyId], references: [id])
  transactions Transaction[]
  budgets      Budget[]
}
```

### API接口

#### GET /api/categories
- 功能：获取分类列表
- 查询参数：
  - `type`: 分类类型 (INCOME, EXPENSE)
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  [
    {
      "id": "uuid",
      "name": "餐饮",
      "type": "EXPENSE",
      "icon": "food",
      "isDefault": true
    },
    {
      "id": "uuid",
      "name": "工资",
      "type": "INCOME",
      "icon": "salary",
      "isDefault": true
    },
    // ...更多分类
  ]
  ```

#### POST /api/categories
- 功能：创建自定义分类
- 请求体：
  ```json
  {
    "name": "娱乐",
    "type": "EXPENSE",
    "icon": "entertainment",
    "familyId": "family_uuid"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "娱乐",
    "type": "EXPENSE",
    "icon": "entertainment",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "isDefault": false,
    "createdAt": "2023-05-15T14:00:00Z"
  }
  ```

#### PATCH /api/categories/:id
- 功能：更新分类
- 请求体：
  ```json
  {
    "name": "休闲娱乐",
    "icon": "leisure"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "休闲娱乐",
    "type": "EXPENSE",
    "icon": "leisure",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "isDefault": false,
    "updatedAt": "2023-05-15T14:30:00Z"
  }
  ```

#### DELETE /api/categories/:id
- 功能：删除分类
- 响应：204 No Content

### 依赖关系
- 依赖于User模块获取用户信息
- 依赖于Family模块获取家庭信息
- 被Transaction模块依赖用于分类交易
- 被Budget模块依赖用于分类预算

## 5. 预算管理模块 (Budget Module)

### 职责
- 管理预算的CRUD操作
- 计算预算执行情况
- 处理预算结转（月度结余或超支）
- 提供预算分析和建议
- 支持基于账本的预算管理
- 支持分类预算的启用/禁用

### 业务逻辑

#### 创建预算
1. 验证预算数据
2. 检查用户或家庭是否有权限创建
3. 检查账本是否存在
4. 检查分类是否存在（如果启用分类预算）
5. 创建预算记录
6. 返回创建的预算

#### 获取预算列表
1. 验证查询参数
2. 应用筛选条件（账本ID、周期、日期范围等）
3. 计算每个预算的执行情况
   - 获取相关时间段内的交易记录
   - 计算已支出金额和剩余金额
   - 计算执行百分比
   - 计算结转金额（如果启用）
4. 返回预算列表及执行情况

#### 获取账本预算列表
1. 验证账本ID和查询参数
2. 获取指定账本下的预算
3. 如果是家庭账本，获取所有家庭成员的预算
4. 计算每个预算的执行情况
5. 返回预算列表及执行情况

#### 更新预算
1. 验证用户权限
2. 验证更新数据
3. 更新预算记录
4. 返回更新后的预算

#### 删除预算
1. 验证用户权限
2. 删除预算记录

#### 处理预算结转
1. 在月度预算结束时检查结余或超支情况
2. 如果启用了结转功能：
   - 计算结转金额（结余或超支）
   - 更新当前预算的结转金额
   - 在下个月预算中应用结转金额（增加或减少）
3. 返回更新后的预算信息

#### 获取预算余额
1. 验证预算ID
2. 计算预算已使用金额
3. 计算预算剩余金额（考虑结转）
4. 返回预算余额信息

### 数据模型
```prisma
model Budget {
  id                  String       @id @default(uuid())
  name                String       // 预算名称
  amount              Decimal      @db.Decimal(10, 2)
  period              BudgetPeriod
  startDate           DateTime     @map("start_date")
  endDate             DateTime     @map("end_date")
  categoryId          String?      @map("category_id")
  userId              String?      @map("user_id")
  familyId            String?      @map("family_id")
  accountBookId       String?      @map("account_book_id")
  rollover            Boolean      @default(false)
  enableCategoryBudget Boolean     @default(true) @map("enable_category_budget")
  rolloverAmount      Decimal?     @db.Decimal(10, 2) @map("rollover_amount")
  createdAt           DateTime     @default(now()) @map("created_at")
  updatedAt           DateTime     @updatedAt @map("updated_at")

  // 关系
  user        User?        @relation(fields: [userId], references: [id])
  family      Family?      @relation(fields: [familyId], references: [id])
  category    Category?    @relation(fields: [categoryId], references: [id])
  accountBook AccountBook? @relation(fields: [accountBookId], references: [id])
  transactions Transaction[]
}

enum BudgetPeriod {
  MONTHLY
  YEARLY
}
```

### API接口

#### POST /api/budgets
- 功能：创建预算
- 请求体：
  ```json
  {
    "name": "餐饮预算",
    "amount": 3000,
    "period": "MONTHLY",
    "startDate": "2023-05-01T00:00:00Z",
    "endDate": "2023-05-31T23:59:59Z",
    "categoryId": "category_uuid",
    "accountBookId": "account_book_uuid",
    "familyId": "family_uuid",
    "rollover": true,
    "enableCategoryBudget": true
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "餐饮预算",
    "amount": 3000,
    "period": "MONTHLY",
    "startDate": "2023-05-01T00:00:00Z",
    "endDate": "2023-05-31T23:59:59Z",
    "categoryId": "category_uuid",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "accountBookId": "account_book_uuid",
    "rollover": true,
    "enableCategoryBudget": true,
    "rolloverAmount": null,
    "createdAt": "2023-05-15T15:00:00Z"
  }
  ```

#### GET /api/budgets
- 功能：获取预算列表
- 查询参数：
  - `period`: 预算周期 (MONTHLY, YEARLY)
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `accountBookId`: 账本ID
  - `familyId`: 家庭ID (可选)
  - `familyMemberId`: 家庭成员ID (可选，仅家庭账本)
- 响应：
  ```json
  [
    {
      "id": "uuid",
      "name": "餐饮预算",
      "amount": 3000,
      "period": "MONTHLY",
      "startDate": "2023-05-01T00:00:00Z",
      "endDate": "2023-05-31T23:59:59Z",
      "category": {
        "id": "uuid",
        "name": "餐饮",
        "icon": "food"
      },
      "userId": "user_uuid",
      "familyId": "family_uuid",
      "accountBookId": "account_book_uuid",
      "rollover": true,
      "enableCategoryBudget": true,
      "rolloverAmount": 200,
      "spent": 1500,
      "remaining": 1700,
      "percentage": 50
    },
    // ...更多预算
  ]
  ```

#### GET /api/account-book/:accountBookId/budgets
- 功能：获取账本下的预算列表
- 查询参数：
  - `period`: 预算周期 (MONTHLY, YEARLY)
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `familyMemberId`: 家庭成员ID (可选，仅家庭账本)
- 响应：与GET /api/budgets相同

#### PATCH /api/budgets/:id
- 功能：更新预算
- 请求体：
  ```json
  {
    "name": "餐饮月度预算",
    "amount": 3500,
    "rollover": true,
    "enableCategoryBudget": false
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "餐饮月度预算",
    "amount": 3500,
    "period": "MONTHLY",
    "startDate": "2023-05-01T00:00:00Z",
    "endDate": "2023-05-31T23:59:59Z",
    "categoryId": "category_uuid",
    "userId": "user_uuid",
    "familyId": "family_uuid",
    "accountBookId": "account_book_uuid",
    "rollover": true,
    "enableCategoryBudget": false,
    "rolloverAmount": 200,
    "updatedAt": "2023-05-15T15:30:00Z"
  }
  ```

#### POST /api/budgets/:id/rollover
- 功能：处理预算结转
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "餐饮月度预算",
    "rolloverAmount": 200,
    "previousAmount": 3500,
    "newAmount": 3700,
    "rolloverType": "SURPLUS",
    "nextPeriodStart": "2023-06-01T00:00:00Z",
    "nextPeriodEnd": "2023-06-30T23:59:59Z"
  }
  ```

#### GET /api/budgets/:id/balance
- 功能：获取预算余额
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "餐饮月度预算",
    "amount": 3500,
    "spent": 1500,
    "remaining": 2000,
    "percentage": 42.86,
    "rolloverAmount": 200,
    "adjustedRemaining": 2200
  }
  ```

#### DELETE /api/budgets/:id
- 功能：删除预算
- 响应：204 No Content

### 依赖关系
- 依赖于User模块获取用户信息
- 依赖于Family模块获取家庭信息
- 依赖于Category模块获取分类信息
- 依赖于AccountBook模块获取账本信息
- 依赖于Transaction模块获取交易数据
- 被Statistics模块依赖用于预算分析
