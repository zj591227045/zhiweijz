# 只为记账API集成指南

本文档详细说明如何集成只为记账的API，实现智能记账、账本查询等功能。

## API概述

只为记账提供了一系列RESTful API，用于实现账号验证、智能记账、账本管理等功能。本集成方案主要使用以下API：

1. **账号验证API** - 验证用户账号和密码
2. **智能记账API** - 解析记账文本并创建记账记录
3. **账本查询API** - 获取用户账本列表和账本详情
4. **余额查询API** - 获取账本余额和收支统计

## API认证

所有API请求都需要进行认证，认证方式如下：

1. **API密钥认证** - 通过HTTP头部传递API密钥
2. **用户令牌认证** - 通过HTTP头部传递用户令牌

### 认证头部示例

```
X-API-Key: your_api_key
Authorization: Bearer user_token
```

## API服务实现

### 1. API服务封装

```javascript
// services/zhiweiService.js
const axios = require('axios');
const querystring = require('querystring');

class ZhiweiService {
  constructor() {
    this.baseUrl = process.env.ZHIWEI_API_BASE_URL;
    this.apiKey = process.env.ZHIWEI_API_KEY;
    this.apiSecret = process.env.ZHIWEI_API_SECRET;
  }

  // 创建API请求客户端
  createClient(token = null) {
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return axios.create({
      baseURL: this.baseUrl,
      headers,
      timeout: 10000 // 10秒超时
    });
  }

  // 账号验证
  async authenticate(username, password) {
    try {
      const client = this.createClient();
      const response = await client.post('/auth/login', {
        username,
        password
      });

      return {
        success: true,
        token: response.data.token,
        userId: response.data.userId,
        expiresIn: response.data.expiresIn
      };
    } catch (error) {
      console.error('认证失败:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || '认证失败'
      };
    }
  }

  // 获取用户账本列表
  async getUserBooks(token) {
    try {
      const client = this.createClient(token);
      const response = await client.get('/books');
      
      return response.data.books || [];
    } catch (error) {
      console.error('获取账本失败:', error.response?.data || error.message);
      throw new Error('获取账本失败');
    }
  }

  // 智能记账
  async smartAccounting(token, text, bookId) {
    try {
      const client = this.createClient(token);
      const response = await client.post('/accounting/smart', {
        text,
        bookId
      });
      
      return {
        success: true,
        record: response.data.record,
        balance: response.data.balance
      };
    } catch (error) {
      console.error('智能记账失败:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || '记账失败'
      };
    }
  }

  // 获取账本余额
  async getBookBalance(token, bookId) {
    try {
      const client = this.createClient(token);
      const response = await client.get(`/books/${bookId}/balance`);
      
      return {
        bookName: response.data.bookName,
        totalAssets: response.data.totalAssets,
        totalLiabilities: response.data.totalLiabilities,
        netAssets: response.data.netAssets,
        monthlyIncome: response.data.monthlyIncome,
        monthlyExpense: response.data.monthlyExpense,
        monthlySurplus: response.data.monthlySurplus
      };
    } catch (error) {
      console.error('获取账本余额失败:', error.response?.data || error.message);
      throw new Error('获取账本余额失败');
    }
  }

  // 刷新令牌
  async refreshToken(refreshToken) {
    try {
      const client = this.createClient();
      const response = await client.post('/auth/refresh', {
        refreshToken
      });
      
      return {
        success: true,
        token: response.data.token,
        expiresIn: response.data.expiresIn
      };
    } catch (error) {
      console.error('刷新令牌失败:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || '刷新令牌失败'
      };
    }
  }
}

module.exports = new ZhiweiService();
```

### 2. 令牌管理

为了确保API调用的安全性和持久性，需要实现令牌管理机制：

```javascript
// services/tokenService.js
const db = require('../models/db');
const zhiweiService = require('./zhiweiService');

class TokenService {
  // 获取有效令牌
  async getValidToken(openid) {
    try {
      // 从数据库获取令牌信息
      const result = await db.query(
        'SELECT zhiwei_token, zhiwei_refresh_token, token_expires_at FROM user_bindings WHERE openid = $1',
        [openid]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const binding = result.rows[0];
      const now = new Date();
      const expiresAt = new Date(binding.token_expires_at);
      
      // 检查令牌是否过期
      if (expiresAt > now) {
        // 令牌有效
        return binding.zhiwei_token;
      }
      
      // 令牌已过期，尝试刷新
      if (binding.zhiwei_refresh_token) {
        const refreshResult = await zhiweiService.refreshToken(binding.zhiwei_refresh_token);
        
        if (refreshResult.success) {
          // 更新令牌
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + refreshResult.expiresIn);
          
          await db.query(
            'UPDATE user_bindings SET zhiwei_token = $1, token_expires_at = $2 WHERE openid = $3',
            [refreshResult.token, expiresAt, openid]
          );
          
          return refreshResult.token;
        }
      }
      
      // 刷新失败，需要重新登录
      return null;
    } catch (error) {
      console.error('获取有效令牌失败:', error);
      return null;
    }
  }
  
  // 保存令牌信息
  async saveToken(openid, token, refreshToken, expiresIn) {
    try {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
      
      await db.query(
        'UPDATE user_bindings SET zhiwei_token = $1, zhiwei_refresh_token = $2, token_expires_at = $3 WHERE openid = $4',
        [token, refreshToken, expiresAt, openid]
      );
      
      return true;
    } catch (error) {
      console.error('保存令牌失败:', error);
      throw error;
    }
  }
}

module.exports = new TokenService();
```

## API接口详解

### 1. 账号验证API

**接口地址**: `/auth/login`  
**请求方法**: POST  
**请求参数**:

```json
{
  "username": "用户名",
  "password": "密码"
}
```

**响应示例**:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "user123",
  "expiresIn": 3600
}
```

### 2. 智能记账API

**接口地址**: `/accounting/smart`  
**请求方法**: POST  
**请求头**:
- `Authorization: Bearer {token}`
- `X-API-Key: {apiKey}`

**请求参数**:

```json
{
  "text": "50 餐饮 午餐",
  "bookId": "book123"
}
```

**响应示例**:

```json
{
  "success": true,
  "record": {
    "id": "record123",
    "type": "expense",
    "amount": 50,
    "category": "餐饮",
    "description": "午餐",
    "date": "2023-05-20T12:30:00Z",
    "bookId": "book123",
    "bookName": "日常账本"
  },
  "balance": 1250.75
}
```

### 3. 获取账本列表API

**接口地址**: `/books`  
**请求方法**: GET  
**请求头**:
- `Authorization: Bearer {token}`
- `X-API-Key: {apiKey}`

**响应示例**:

```json
{
  "books": [
    {
      "id": "book123",
      "name": "日常账本",
      "type": "personal",
      "currency": "CNY",
      "isDefault": true
    },
    {
      "id": "book456",
      "name": "旅行账本",
      "type": "personal",
      "currency": "CNY",
      "isDefault": false
    }
  ]
}
```

### 4. 获取账本余额API

**接口地址**: `/books/{bookId}/balance`  
**请求方法**: GET  
**请求头**:
- `Authorization: Bearer {token}`
- `X-API-Key: {apiKey}`

**响应示例**:

```json
{
  "bookId": "book123",
  "bookName": "日常账本",
  "totalAssets": 5000.00,
  "totalLiabilities": 1000.00,
  "netAssets": 4000.00,
  "monthlyIncome": 6000.00,
  "monthlyExpense": 3500.00,
  "monthlySurplus": 2500.00
}
```

## 错误处理

### 常见错误码及处理方式

| 错误码 | 描述 | 处理方式 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数格式和内容 |
| 401 | 认证失败 | 重新获取令牌或要求用户重新登录 |
| 403 | 权限不足 | 检查API密钥权限或用户权限 |
| 404 | 资源不存在 | 检查请求的资源ID是否正确 |
| 429 | 请求过于频繁 | 实现请求限流和重试机制 |
| 500 | 服务器内部错误 | 记录错误并联系API提供方 |

### 错误处理示例

```javascript
async function callApi() {
  try {
    const result = await zhiweiService.smartAccounting(token, text, bookId);
    return result;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 令牌过期，尝试刷新
          const newToken = await tokenService.getValidToken(openid);
          if (newToken) {
            return await zhiweiService.smartAccounting(newToken, text, bookId);
          } else {
            throw new Error('认证失败，请重新绑定账号');
          }
        
        case 429:
          // 请求过于频繁，等待后重试
          await sleep(2000); // 等待2秒
          return await zhiweiService.smartAccounting(token, text, bookId);
        
        default:
          throw new Error(`API错误: ${error.response.data.message || '未知错误'}`);
      }
    } else {
      throw new Error('网络错误，请稍后重试');
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 安全最佳实践

1. **令牌安全存储**
   - 不要在客户端存储令牌
   - 服务器端加密存储令牌
   - 设置合理的令牌过期时间

2. **API密钥保护**
   - 不要在前端代码中暴露API密钥
   - 定期轮换API密钥
   - 限制API密钥的权限范围

3. **请求验证**
   - 验证所有用户输入
   - 防止SQL注入和XSS攻击
   - 实现请求签名机制

4. **数据传输安全**
   - 使用HTTPS加密传输
   - 敏感数据加密存储
   - 实现数据完整性校验

## 性能优化

1. **连接池管理**
   - 复用HTTP连接
   - 实现连接超时和重试机制

2. **缓存策略**
   - 缓存不经常变化的数据
   - 实现缓存失效机制

3. **批量处理**
   - 合并多个请求
   - 实现批量记账API

## 监控与日志

1. **API调用日志**
   - 记录所有API请求和响应
   - 记录API调用性能指标

2. **错误监控**
   - 实现错误报警机制
   - 定期分析错误日志

3. **性能监控**
   - 监控API响应时间
   - 监控API调用成功率

## 下一步

完成API集