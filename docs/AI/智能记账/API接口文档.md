# 智能记账API接口文档

## 1. 概述

智能记账API提供了一系列接口，用于实现智能记账功能和管理LLM设置。所有API都需要认证，使用JWT令牌进行身份验证。

## 2. 基础URL

```
http://localhost:3000/api/ai
```

## 3. 认证

所有API都需要在请求头中包含`Authorization`字段，格式为`Bearer {token}`。

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4. 智能记账API

### 4.1 智能记账

**请求**:

```
POST /api/ai/account/:accountId/smart-accounting
```

**路径参数**:
- `accountId`: 账本ID

**请求体**:
```json
{
  "description": "昨天在沃尔玛买了日用品，花了128.5元"
}
```

**响应**:
```json
{
  "amount": 128.5,
  "date": "2025-05-19T00:00:00.000Z",
  "categoryId": "e46e9e4a-b6f7-4b03-b237-5ccf2abf5efe",
  "categoryName": "日用",
  "type": "EXPENSE",
  "note": "在沃尔玛购买日用品",
  "accountId": "90fd9e64-252b-498f-9b62-02d0f3d14787",
  "accountName": "我们的家的家庭账本",
  "accountType": "family",
  "budgetType": "GENERAL",
  "userId": "51cb7645-c62f-4813-a507-fd093c33f748",
  "confidence": 0.95,
  "createdAt": "2025-05-20T13:44:17.824Z",
  "originalDescription": "昨天在沃尔玛买了日用品，花了128.5元"
}
```

**错误响应**:
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权
- `403 Forbidden`: 无权访问该账本
- `404 Not Found`: 账本不存在
- `500 Internal Server Error`: 服务器内部错误

## 5. LLM设置管理API

### 5.1 获取用户当前LLM设置

**请求**:

```
GET /api/ai/llm-settings
```

**响应**:
```json
{
  "provider": "siliconflow",
  "model": "Qwen/Qwen3-32B",
  "apiKey": "******",
  "temperature": 0.7,
  "maxTokens": 1000,
  "baseUrl": "https://api.siliconflow.cn/v1"
}
```

### 5.2 获取用户所有LLM设置列表

**请求**:

```
GET /api/ai/llm-settings/list
```

**响应**:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "默认设置",
    "provider": "siliconflow",
    "model": "Qwen/Qwen3-32B",
    "temperature": 0.7,
    "max_tokens": 1000,
    "created_at": "2025-05-01T00:00:00.000Z",
    "updated_at": "2025-05-01T00:00:00.000Z",
    "description": "默认的LLM设置",
    "base_url": "https://api.siliconflow.cn/v1"
  },
  {
    "id": "223e4567-e89b-12d3-a456-426614174001",
    "name": "OpenAI设置",
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.5,
    "max_tokens": 2000,
    "created_at": "2025-05-02T00:00:00.000Z",
    "updated_at": "2025-05-02T00:00:00.000Z",
    "description": "OpenAI的LLM设置",
    "base_url": null
  }
]
```

### 5.3 创建用户LLM设置

**请求**:

```
POST /api/ai/llm-settings
```

**请求体**:
```json
{
  "name": "新的LLM设置",
  "provider": "siliconflow",
  "model": "Qwen/Qwen3-32B",
  "apiKey": "sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme",
  "temperature": 0.3,
  "maxTokens": 1000,
  "baseUrl": "https://api.siliconflow.cn/v1",
  "description": "新的LLM设置描述"
}
```

**响应**:
```json
{
  "success": true,
  "id": "323e4567-e89b-12d3-a456-426614174002"
}
```

### 5.4 获取账本LLM设置

**请求**:

```
GET /api/ai/account/:accountId/llm-settings
```

**路径参数**:
- `accountId`: 账本ID

**响应**:
```json
{
  "provider": "siliconflow",
  "model": "Qwen/Qwen3-32B",
  "apiKey": "******",
  "temperature": 0.7,
  "maxTokens": 1000,
  "baseUrl": "https://api.siliconflow.cn/v1"
}
```

### 5.5 更新账本LLM设置

**请求**:

```
PUT /api/ai/account/:accountId/llm-settings
```

**路径参数**:
- `accountId`: 账本ID

**请求体**:
```json
{
  "userLLMSettingId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**响应**:
```json
{
  "success": true
}
```

## 6. 错误处理

所有API都可能返回以下错误:

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权
- `403 Forbidden`: 无权访问
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

错误响应格式:

```json
{
  "error": "错误信息"
}
```

## 7. 使用示例

### 7.1 智能记账示例

```javascript
// 智能记账
const response = await fetch('http://localhost:3000/api/ai/account/90fd9e64-252b-498f-9b62-02d0f3d14787/smart-accounting', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    description: '昨天在沃尔玛买了日用品，花了128.5元'
  })
});

const result = await response.json();
console.log(result);
```

### 7.2 创建LLM设置示例

```javascript
// 创建LLM设置
const response = await fetch('http://localhost:3000/api/ai/llm-settings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    name: '新的LLM设置',
    provider: 'siliconflow',
    model: 'Qwen/Qwen3-32B',
    apiKey: 'sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme',
    temperature: 0.3,
    maxTokens: 1000,
    baseUrl: 'https://api.siliconflow.cn/v1',
    description: '新的LLM设置描述'
  })
});

const result = await response.json();
console.log(result);
```

### 7.3 更新账本LLM设置示例

```javascript
// 更新账本LLM设置
const response = await fetch('http://localhost:3000/api/ai/account/90fd9e64-252b-498f-9b62-02d0f3d14787/llm-settings', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    userLLMSettingId: '123e4567-e89b-12d3-a456-426614174000'
  })
});

const result = await response.json();
console.log(result);
```
