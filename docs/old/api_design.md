# 只为记账 - API设计文档

## API概述

本文档定义了"只为记账"应用的RESTful API接口。API采用JSON格式进行数据交换，使用JWT进行认证。

## 基础URL

```
/api/v1
```

## 认证

除了登录和注册接口外，所有API都需要认证。认证通过Bearer Token实现：

```
Authorization: Bearer <token>
```

## 用户API

### 注册用户

```
POST /auth/register
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "用户名"
}
```

**响应** (201 Created):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "用户名",
  "createdAt": "2023-05-15T10:00:00Z"
}
```

### 用户登录

```
POST /auth/login
```

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**响应** (200 OK):
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

### 获取当前用户信息

```
GET /users/me
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "用户名",
  "createdAt": "2023-05-15T10:00:00Z"
}
```

### 更新用户信息

```
PATCH /users/me
```

**请求体**:
```json
{
  "name": "新用户名"
}
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "新用户名",
  "updatedAt": "2023-05-15T11:00:00Z"
}
```

### 修改密码

```
POST /auth/change-password
```

**请求体**:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

**响应** (200 OK):
```json
{
  "message": "密码已成功更新"
}
```

## 记账记录API

### 创建记账记录

```
POST /transactions
```

**请求体**:
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

**响应** (201 Created):
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

### 获取记账记录列表

```
GET /transactions
```

**查询参数**:
- `type`: 记账类型 (INCOME, EXPENSE)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `categoryId`: 分类ID
- `familyId`: 家庭ID
- `page`: 页码 (默认1)
- `limit`: 每页数量 (默认20)

**响应** (200 OK):
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

### 获取单个记账记录

```
GET /transactions/:id
```

**响应** (200 OK):
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

### 更新记账记录

```
PATCH /transactions/:id
```

**请求体**:
```json
{
  "amount": 120.50,
  "description": "更新的午餐费用"
}
```

**响应** (200 OK):
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

### 删除记账记录

```
DELETE /transactions/:id
```

**响应** (204 No Content)

## 分类API

### 获取分类列表

```
GET /categories
```

**查询参数**:
- `type`: 分类类型 (INCOME, EXPENSE)
- `familyId`: 家庭ID (可选)

**响应** (200 OK):
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

### 创建自定义分类

```
POST /categories
```

**请求体**:
```json
{
  "name": "娱乐",
  "type": "EXPENSE",
  "icon": "entertainment",
  "familyId": "family_uuid"
}
```

**响应** (201 Created):
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

### 更新分类

```
PATCH /categories/:id
```

**请求体**:
```json
{
  "name": "休闲娱乐",
  "icon": "leisure"
}
```

**响应** (200 OK):
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

### 删除分类

```
DELETE /categories/:id
```

**响应** (204 No Content)

## 预算API

### 创建预算

```
POST /budgets
```

**请求体**:
```json
{
  "amount": 3000,
  "period": "MONTHLY",
  "startDate": "2023-05-01T00:00:00Z",
  "endDate": "2023-05-31T23:59:59Z",
  "categoryId": "category_uuid",
  "familyId": "family_uuid",
  "rollover": true
}
```

**响应** (201 Created):
```json
{
  "id": "uuid",
  "amount": 3000,
  "period": "MONTHLY",
  "startDate": "2023-05-01T00:00:00Z",
  "endDate": "2023-05-31T23:59:59Z",
  "categoryId": "category_uuid",
  "userId": "user_uuid",
  "familyId": "family_uuid",
  "rollover": true,
  "createdAt": "2023-05-15T15:00:00Z"
}
```

### 获取预算列表

```
GET /budgets
```

**查询参数**:
- `period`: 预算周期 (MONTHLY, YEARLY)
- `startDate`: 开始日期
- `endDate`: 结束日期
- `familyId`: 家庭ID (可选)

**响应** (200 OK):
```json
[
  {
    "id": "uuid",
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
    "rollover": true,
    "spent": 1500,
    "remaining": 1500
  },
  // ...更多预算
]
```

### 更新预算

```
PATCH /budgets/:id
```

**请求体**:
```json
{
  "amount": 3500,
  "rollover": false
}
```

**响应** (200 OK):
```json
{
  "id": "uuid",
  "amount": 3500,
  "period": "MONTHLY",
  "startDate": "2023-05-01T00:00:00Z",
  "endDate": "2023-05-31T23:59:59Z",
  "categoryId": "category_uuid",
  "userId": "user_uuid",
  "familyId": "family_uuid",
  "rollover": false,
  "updatedAt": "2023-05-15T15:30:00Z"
}
```

### 删除预算

```
DELETE /budgets/:id
```

**响应** (204 No Content)

## 家庭API

### 创建家庭

```
POST /families
```

**请求体**:
```json
{
  "name": "我的家庭"
}
```

**响应** (201 Created):
```json
{
  "id": "uuid",
  "name": "我的家庭",
  "createdBy": "user_uuid",
  "createdAt": "2023-05-15T16:00:00Z"
}
```

### 获取用户的家庭列表

```
GET /families
```

**响应** (200 OK):
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

### 获取家庭详情

```
GET /families/:id
```

**响应** (200 OK):
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

### 添加家庭成员

```
POST /families/:id/members
```

**请求体**:
```json
{
  "name": "孩子",
  "role": "MEMBER",
  "isRegistered": false
}
```

**响应** (201 Created):
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

### 创建邀请链接

```
POST /families/:id/invitations
```

**响应** (201 Created):
```json
{
  "id": "uuid",
  "familyId": "family_uuid",
  "invitationCode": "unique_code",
  "expiresAt": "2023-05-22T16:30:00Z",
  "url": "https://app.zhiweijz.com/join?code=unique_code"
}
```

## 统计API

### 获取支出统计

```
GET /statistics/expenses
```

**查询参数**:
- `startDate`: 开始日期
- `endDate`: 结束日期
- `familyId`: 家庭ID (可选)
- `groupBy`: 分组方式 (day, week, month, category)

**响应** (200 OK):
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

### 获取预算执行情况

```
GET /statistics/budgets
```

**查询参数**:
- `month`: 月份 (YYYY-MM)
- `familyId`: 家庭ID (可选)

**响应** (200 OK):
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

## 错误处理

所有API错误响应遵循以下格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息"
  }
}
```

常见错误代码：
- `UNAUTHORIZED`: 未认证或认证失败
- `FORBIDDEN`: 无权限访问资源
- `NOT_FOUND`: 资源不存在
- `VALIDATION_ERROR`: 请求数据验证失败
- `INTERNAL_ERROR`: 服务器内部错误
