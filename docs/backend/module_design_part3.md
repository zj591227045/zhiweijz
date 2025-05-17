# 只为记账 - 后端模块详细设计 (第3部分)

本文档是"只为记账"应用后端模块设计的第3部分，包含家庭账本、统计分析和AI功能模块的详细设计。

## 6. 家庭账本模块 (Family Module)

### 职责
- 管理家庭的创建和设置
- 处理家庭成员的添加、删除和权限管理
- 生成和验证邀请链接
- 管理未注册用户（如孩子）的记录

### 业务逻辑

#### 创建家庭
1. 验证家庭数据
2. 创建家庭记录
3. 将创建者添加为管理员成员
4. 返回创建的家庭信息

#### 获取用户的家庭列表
1. 验证用户身份
2. 获取用户所属的所有家庭
3. 返回家庭列表

#### 获取家庭详情
1. 验证用户是否为家庭成员
2. 获取家庭详细信息和成员列表
3. 返回家庭详情

#### 添加家庭成员
1. 验证用户是否为家庭管理员
2. 验证成员数据
3. 创建家庭成员记录
4. 返回创建的成员信息

#### 创建邀请链接
1. 验证用户是否为家庭管理员
2. 生成唯一的邀请码
3. 设置邀请过期时间
4. 返回邀请链接

#### 接受邀请
1. 验证邀请码是否有效
2. 检查邀请是否过期
3. 将用户添加为家庭成员
4. 返回家庭信息

### 数据模型
```prisma
model Family {
  id        String   @id @default(uuid())
  name      String
  createdBy String   @map("created_by")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // 关系
  creator       User           @relation("FamilyCreator", fields: [createdBy], references: [id])
  members       FamilyMember[]
  transactions  Transaction[]
  categories    Category[]
  budgets       Budget[]
  invitations   Invitation[]
}

model FamilyMember {
  id           String   @id @default(uuid())
  familyId     String   @map("family_id")
  userId       String?  @map("user_id")
  name         String
  role         Role     @default(MEMBER)
  isRegistered Boolean  @default(true) @map("is_registered")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // 关系
  family       Family        @relation(fields: [familyId], references: [id])
  user         User?         @relation(fields: [userId], references: [id])
  transactions Transaction[]
}

model Invitation {
  id             String   @id @default(uuid())
  familyId       String   @map("family_id")
  invitationCode String   @unique @map("invitation_code")
  expiresAt      DateTime @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")

  // 关系
  family Family @relation(fields: [familyId], references: [id])
}

enum Role {
  ADMIN
  MEMBER
}
```

### API接口

#### POST /api/families
- 功能：创建家庭
- 请求体：
  ```json
  {
    "name": "我的家庭"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "我的家庭",
    "createdBy": "user_uuid",
    "createdAt": "2023-05-15T16:00:00Z"
  }
  ```

#### GET /api/families
- 功能：获取用户的家庭列表
- 响应：
  ```json
  [
    {
      "id": "uuid",
      "name": "我的家庭",
      "createdBy": "user_uuid",
      "memberCount": 3,
      "createdAt": "2023-05-15T16:00:00Z"
    },
    // ...更多家庭
  ]
  ```

#### GET /api/families/:id
- 功能：获取家庭详情
- 响应：
  ```json
  {
    "id": "uuid",
    "name": "我的家庭",
    "createdBy": "user_uuid",
    "members": [
      {
        "id": "uuid",
        "userId": "user_uuid",
        "name": "用户名",
        "role": "ADMIN",
        "isRegistered": true
      },
      {
        "id": "uuid",
        "userId": null,
        "name": "孩子",
        "role": "MEMBER",
        "isRegistered": false
      },
      // ...更多成员
    ],
    "createdAt": "2023-05-15T16:00:00Z",
    "updatedAt": "2023-05-15T16:00:00Z"
  }
  ```

#### POST /api/families/:id/members
- 功能：添加家庭成员
- 请求体：
  ```json
  {
    "name": "孩子",
    "role": "MEMBER",
    "isRegistered": false
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "familyId": "family_uuid",
    "userId": null,
    "name": "孩子",
    "role": "MEMBER",
    "isRegistered": false,
    "createdAt": "2023-05-15T16:30:00Z"
  }
  ```

#### POST /api/families/:id/invitations
- 功能：创建邀请链接
- 响应：
  ```json
  {
    "id": "uuid",
    "familyId": "family_uuid",
    "invitationCode": "unique_code",
    "expiresAt": "2023-05-22T16:30:00Z",
    "url": "https://app.zhiweijz.com/join?code=unique_code"
  }
  ```

#### POST /api/families/join
- 功能：接受邀请加入家庭
- 请求体：
  ```json
  {
    "invitationCode": "unique_code"
  }
  ```
- 响应：
  ```json
  {
    "id": "uuid",
    "familyId": "family_uuid",
    "userId": "user_uuid",
    "name": "用户名",
    "role": "MEMBER",
    "isRegistered": true,
    "createdAt": "2023-05-15T17:00:00Z"
  }
  ```

### 依赖关系
- 依赖于User模块获取用户信息
- 被Transaction模块依赖用于家庭交易记录
- 被Category模块依赖用于家庭分类
- 被Budget模块依赖用于家庭预算

## 7. 统计分析模块 (Statistics Module)

### 职责
- 提供交易数据的统计和分析
- 生成收支趋势报告
- 计算预算执行情况
- 提供分类支出分析

### 业务逻辑

#### 获取支出统计
1. 验证查询参数
2. 根据日期范围获取交易记录
3. 按照指定的分组方式（日、周、月）聚合数据
4. 计算总支出和分类支出
5. 返回统计结果

#### 获取收入统计
1. 验证查询参数
2. 根据日期范围获取交易记录
3. 按照指定的分组方式聚合数据
4. 计算总收入和分类收入
5. 返回统计结果

#### 获取预算执行情况
1. 验证查询参数
2. 获取指定月份的预算
3. 获取相应时间段的交易记录
4. 计算总预算、已支出和剩余金额
5. 计算各分类的预算执行情况
6. 返回预算统计结果

#### 获取财务概览
1. 验证查询参数
2. 计算指定时间段的总收入和总支出
3. 计算净收入（收入-支出）
4. 获取主要收入和支出分类
5. 返回财务概览数据

### 数据模型
统计分析模块主要使用其他模块的数据模型，不需要额外的数据表。

### API接口

#### GET /api/statistics/expenses
- 功能：获取支出统计
- 查询参数：
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `familyId`: 家庭ID (可选)
  - `groupBy`: 分组方式 (day, week, month, category)
- 响应：
  ```json
  {
    "total": 5000,
    "data": [
      {
        "date": "2023-05-01",
        "amount": 1000
      },
      {
        "date": "2023-05-02",
        "amount": 1500
      },
      // ...更多数据
    ],
    "byCategory": [
      {
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "amount": 2000,
        "percentage": 40
      },
      // ...更多分类数据
    ]
  }
  ```

#### GET /api/statistics/income
- 功能：获取收入统计
- 查询参数：与支出统计相同
- 响应：格式与支出统计相同

#### GET /api/statistics/budgets
- 功能：获取预算执行情况
- 查询参数：
  - `month`: 月份 (YYYY-MM)
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  {
    "totalBudget": 10000,
    "totalSpent": 6000,
    "remaining": 4000,
    "percentage": 60,
    "categories": [
      {
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "budget": 3000,
        "spent": 2000,
        "remaining": 1000,
        "percentage": 66.67
      },
      // ...更多分类数据
    ]
  }
  ```

#### GET /api/statistics/overview
- 功能：获取财务概览
- 查询参数：
  - `startDate`: 开始日期
  - `endDate`: 结束日期
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  {
    "income": 8500,
    "expense": 5000,
    "netIncome": 3500,
    "topIncomeCategories": [
      {
        "category": {
          "id": "uuid",
          "name": "工资",
          "icon": "salary"
        },
        "amount": 8000,
        "percentage": 94.12
      },
      // ...更多收入分类
    ],
    "topExpenseCategories": [
      {
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "amount": 2000,
        "percentage": 40
      },
      // ...更多支出分类
    ]
  }
  ```

### 依赖关系
- 依赖于Transaction模块获取交易数据
- 依赖于Budget模块获取预算数据
- 依赖于Category模块获取分类信息
- 依赖于Family模块获取家庭信息
- 被AI模块依赖用于数据分析和建议

## 8. AI功能模块 (AI Module)

### 职责
- 实现智能交易分类
- 提供消费模式分析
- 生成预算建议
- 评估财务健康状况

### 业务逻辑

#### 智能交易分类
1. 接收交易描述和金额
2. 提取关键词和特征
3. 使用分类模型预测最可能的分类
4. 返回预测分类及置信度

#### 消费模式分析
1. 获取用户历史交易数据
2. 识别周期性支出模式
3. 检测异常交易
4. 分析消费趋势
5. 返回分析结果

#### 预算建议
1. 分析用户历史支出模式
2. 考虑用户收入和财务目标
3. 生成合理的预算分配建议
4. 返回预算建议

#### 财务健康评估
1. 获取用户财务数据
2. 计算关键财务指标（收入/支出比率、储蓄率等）
3. 评估财务健康状况
4. 生成改进建议
5. 返回财务健康评分和建议

### 数据模型
```prisma
model AIModel {
  id        String   @id @default(uuid())
  name      String
  version   String
  type      String
  modelPath String   @map("model_path")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
}

model UserFeedback {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  transactionId String?  @map("transaction_id")
  suggestionId String?  @map("suggestion_id")
  feedbackType String   @map("feedback_type")
  content      String?
  createdAt    DateTime @default(now()) @map("created_at")

  // 关系
  user        User        @relation(fields: [userId], references: [id])
  transaction Transaction? @relation(fields: [transactionId], references: [id])
}
```

### API接口

#### POST /api/ai/classify-transaction
- 功能：智能分类交易
- 请求体：
  ```json
  {
    "description": "星巴克咖啡",
    "amount": 30,
    "date": "2023-05-15T14:30:00Z"
  }
  ```
- 响应：
  ```json
  {
    "category": {
      "id": "uuid",
      "name": "餐饮",
      "icon": "food"
    },
    "confidence": 0.92,
    "alternativeCategories": [
      {
        "id": "uuid",
        "name": "娱乐",
        "icon": "entertainment",
        "confidence": 0.05
      },
      // ...更多备选分类
    ]
  }
  ```

#### GET /api/ai/consumption-patterns
- 功能：获取消费模式分析
- 查询参数：
  - `months`: 分析的月数 (默认3)
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  {
    "periodicExpenses": [
      {
        "category": {
          "id": "uuid",
          "name": "住房",
          "icon": "home"
        },
        "amount": 2000,
        "frequency": "MONTHLY",
        "nextExpectedDate": "2023-06-01"
      },
      // ...更多周期性支出
    ],
    "anomalies": [
      {
        "transaction": {
          "id": "uuid",
          "amount": 500,
          "category": {
            "id": "uuid",
            "name": "购物",
            "icon": "shopping"
          },
          "date": "2023-05-10T15:00:00Z"
        },
        "reason": "金额异常",
        "typicalAmount": 100
      },
      // ...更多异常交易
    ],
    "trends": [
      {
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "trend": "INCREASING",
        "changePercentage": 15,
        "message": "餐饮支出呈上升趋势"
      },
      // ...更多趋势
    ]
  }
  ```

#### GET /api/ai/budget-suggestions
- 功能：获取预算建议
- 查询参数：
  - `income`: 月收入 (可选)
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  {
    "totalBudget": 7000,
    "categories": [
      {
        "category": {
          "id": "uuid",
          "name": "餐饮",
          "icon": "food"
        },
        "suggestedAmount": 2000,
        "percentage": 28.57,
        "reasoning": "基于您过去3个月的平均餐饮支出"
      },
      // ...更多分类预算
    ],
    "savingsGoal": 1500,
    "message": "建议将收入的15%用于储蓄"
  }
  ```

#### GET /api/ai/financial-health
- 功能：获取财务健康评估
- 查询参数：
  - `months`: 评估的月数 (默认6)
  - `familyId`: 家庭ID (可选)
- 响应：
  ```json
  {
    "score": 75,
    "level": "GOOD",
    "metrics": [
      {
        "name": "收入/支出比率",
        "value": 1.6,
        "benchmark": 1.5,
        "status": "GOOD"
      },
      {
        "name": "储蓄率",
        "value": 0.12,
        "benchmark": 0.2,
        "status": "NEEDS_IMPROVEMENT"
      },
      // ...更多指标
    ],
    "suggestions": [
      {
        "category": "储蓄",
        "message": "考虑增加每月储蓄金额至收入的20%",
        "priority": "HIGH"
      },
      // ...更多建议
    ]
  }
  ```

### 依赖关系
- 依赖于Transaction模块获取交易数据
- 依赖于Category模块获取分类信息
- 依赖于Budget模块获取预算数据
- 依赖于Statistics模块获取统计数据
- 依赖于User模块获取用户信息
- 依赖于Family模块获取家庭信息
