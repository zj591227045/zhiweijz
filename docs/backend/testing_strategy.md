# 只为记账 - 测试策略

本文档详细描述了"只为记账"应用后端的测试策略，包括单元测试、集成测试、端到端测试和性能测试的方法和工具。

## 测试框架和工具

我们将使用以下工具和框架进行测试：

1. **Jest**: 主要测试框架，用于单元测试和集成测试
2. **Supertest**: 用于API端点测试
3. **Prisma Client**: 用于数据库测试
4. **Docker**: 用于创建隔离的测试环境
5. **k6**: 用于性能测试
6. **GitHub Actions**: 用于CI/CD流程中的自动化测试

## 测试环境

### 开发环境测试

在开发环境中，我们将使用以下测试数据库配置：

```typescript
// server/src/config/test.ts
export default {
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/zhiweijz_test',
  },
  // 其他测试配置...
};
```

### CI环境测试

在CI环境中，我们将使用Docker创建隔离的测试环境：

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: zhiweijz_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate Prisma Client
        run: npx prisma generate
        
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/zhiweijz_test
          
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/zhiweijz_test
          JWT_SECRET: test_secret
```

## 单元测试

单元测试将针对应用的最小可测试单元（通常是函数或类）进行测试，确保它们按预期工作。

### 测试目录结构

```
server/src/
└── __tests__/
    ├── unit/
    │   ├── controllers/
    │   ├── services/
    │   ├── repositories/
    │   ├── utils/
    │   └── validators/
    ├── integration/
    └── e2e/
```

### 服务层测试示例

```typescript
// server/src/__tests__/unit/services/auth.service.test.ts
import { AuthService } from '../../../services/auth.service';
import { UserRepository } from '../../../repositories/user.repository';
import { hashPassword } from '../../../utils/password';

// 模拟依赖
jest.mock('../../../repositories/user.repository');
jest.mock('../../../utils/password');
jest.mock('../../../utils/jwt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // 清除所有模拟的调用记录
    jest.clearAllMocks();
    
    // 创建模拟的UserRepository
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    
    // 创建AuthService实例，注入模拟的依赖
    authService = new AuthService();
    (authService as any).userRepository = mockUserRepository;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // 准备测试数据
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: '测试用户'
      };
      
      const hashedPassword = 'hashed_password';
      const createdUser = {
        id: 'user_id',
        email: userData.email,
        name: userData.name,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // 设置模拟行为
      mockUserRepository.findByEmail.mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockResolvedValue(createdUser);
      
      // 执行测试
      const result = await authService.register(userData);
      
      // 验证结果
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        passwordHash: hashedPassword,
        name: userData.name
      });
      
      expect(result).toHaveProperty('id', createdUser.id);
      expect(result).toHaveProperty('email', createdUser.email);
      expect(result).toHaveProperty('name', createdUser.name);
      expect(result).toHaveProperty('token');
    });

    it('should throw an error if email already exists', async () => {
      // 准备测试数据
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: '已存在用户'
      };
      
      // 设置模拟行为
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing_id',
        email: userData.email,
        name: userData.name,
        passwordHash: 'existing_hash',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 执行测试并验证结果
      await expect(authService.register(userData)).rejects.toThrow('该邮箱已被注册');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  // 其他方法的测试...
});
```

### 工具函数测试示例

```typescript
// server/src/__tests__/unit/utils/password.test.ts
import { hashPassword, comparePassword } from '../../../utils/password';
import bcrypt from 'bcrypt';

// 模拟bcrypt
jest.mock('bcrypt');

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      // 设置模拟行为
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      
      // 执行测试
      const result = await hashPassword('password123');
      
      // 验证结果
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(result).toBe('hashed_password');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      // 设置模拟行为
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // 执行测试
      const result = await comparePassword('password123', 'hashed_password');
      
      // 验证结果
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      // 设置模拟行为
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // 执行测试
      const result = await comparePassword('wrong_password', 'hashed_password');
      
      // 验证结果
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong_password', 'hashed_password');
      expect(result).toBe(false);
    });
  });
});
```

## 集成测试

集成测试将测试多个组件的交互，确保它们能够正确协同工作。

### API端点测试示例

```typescript
// server/src/__tests__/integration/auth.api.test.ts
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../lib/prisma';

// 在所有测试之前设置测试环境
beforeAll(async () => {
  // 清空测试数据库
  await prisma.user.deleteMany();
});

// 在所有测试之后清理测试环境
afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: '测试用户'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', userData.email);
      expect(response.body).toHaveProperty('name', userData.name);
      expect(response.body).toHaveProperty('token');
      
      // 验证用户是否真的被创建
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe(userData.email);
      expect(user?.name).toBe(userData.name);
    });

    it('should return 409 if email already exists', async () => {
      const userData = {
        email: 'test@example.com', // 已存在的邮箱
        password: 'password123',
        name: '重复用户'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', '该邮箱已被注册');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // 太短
        name: ''  // 空名称
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  // 其他API端点测试...
});
```

## 端到端测试

端到端测试将测试整个应用流程，从用户界面到数据库，确保所有组件能够正确协同工作。

由于后端开发阶段没有前端界面，我们将使用API请求序列来模拟用户流程。

```typescript
// server/src/__tests__/e2e/user-flow.test.ts
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../lib/prisma';

// 在所有测试之前设置测试环境
beforeAll(async () => {
  // 清空测试数据库
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();
  await prisma.transaction.deleteMany();
  
  // 创建默认分类
  await prisma.category.createMany({
    data: [
      { name: '餐饮', type: 'EXPENSE', icon: 'utensils', isDefault: true },
      { name: '工资', type: 'INCOME', icon: 'money-bill-wave', isDefault: true }
    ]
  });
});

// 在所有测试之后清理测试环境
afterAll(async () => {
  await prisma.$disconnect();
});

describe('User Flow', () => {
  let token: string;
  let userId: string;
  let categoryId: string;
  let transactionId: string;
  
  it('should register a new user', async () => {
    const userData = {
      email: 'flow@example.com',
      password: 'password123',
      name: '流程测试用户'
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
    
    expect(response.body).toHaveProperty('token');
    token = response.body.token;
    userId = response.body.id;
  });
  
  it('should get categories', async () => {
    const response = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    
    // 获取餐饮分类ID
    const foodCategory = response.body.find((cat: any) => cat.name === '餐饮');
    expect(foodCategory).toBeDefined();
    categoryId = foodCategory.id;
  });
  
  it('should create a transaction', async () => {
    const transactionData = {
      amount: 100.50,
      type: 'EXPENSE',
      categoryId,
      description: '午餐费用',
      date: new Date().toISOString()
    };
    
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(transactionData)
      .expect(201);
    
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('amount', 100.50);
    expect(response.body).toHaveProperty('categoryId', categoryId);
    
    transactionId = response.body.id;
  });
  
  it('should get transaction list', async () => {
    const response = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBeGreaterThan(0);
    
    const transaction = response.body.data.find((t: any) => t.id === transactionId);
    expect(transaction).toBeDefined();
    expect(transaction).toHaveProperty('amount', 100.50);
    expect(transaction).toHaveProperty('description', '午餐费用');
  });
  
  // 更多流程测试...
});
```

## 性能测试

性能测试将评估应用在高负载下的表现，确保它能够处理预期的用户量和请求量。

### k6 性能测试脚本示例

```javascript
// performance/transaction-api.js
import http from 'k6/http';
import { sleep, check } from 'k6';

// 测试配置
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 逐渐增加到20个虚拟用户
    { duration: '1m', target: 20 },  // 保持20个虚拟用户1分钟
    { duration: '30s', target: 0 },  // 逐渐减少到0个虚拟用户
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的请求应该在500ms内完成
    http_req_failed: ['rate<0.01'],   // 请求失败率应该小于1%
  },
};

// 测试数据
const BASE_URL = 'http://localhost:3000/api/v1';
let token = ''; // 将在setup中获取

// 测试准备
export function setup() {
  // 注册测试用户
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email: `perf_test_${Date.now()}@example.com`,
    password: 'password123',
    name: '性能测试用户'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(registerRes, {
    'registered successfully': (r) => r.status === 201,
  });
  
  token = JSON.parse(registerRes.body).token;
  
  // 获取分类ID
  const categoriesRes = http.get(`${BASE_URL}/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  check(categoriesRes, {
    'got categories': (r) => r.status === 200,
  });
  
  const categories = JSON.parse(categoriesRes.body);
  const categoryId = categories.find(c => c.name === '餐饮').id;
  
  return {
    token,
    categoryId
  };
}

// 主测试函数
export default function(data) {
  const { token, categoryId } = data;
  
  // 创建记账
  const createRes = http.post(`${BASE_URL}/transactions`, JSON.stringify({
    amount: Math.floor(Math.random() * 1000) / 100,
    type: 'EXPENSE',
    categoryId: categoryId,
    description: `性能测试记账 ${Date.now()}`,
    date: new Date().toISOString()
  }), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  check(createRes, {
    'transaction created': (r) => r.status === 201,
  });
  
  sleep(1);
  
  // 获取记账列表
  const listRes = http.get(`${BASE_URL}/transactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  check(listRes, {
    'got transactions': (r) => r.status === 200,
  });
  
  sleep(1);
}

// 测试清理
export function teardown(data) {
  // 可以在这里清理测试数据
}
```

## 测试覆盖率目标

我们设定以下测试覆盖率目标：

1. **单元测试**：代码覆盖率至少80%
2. **集成测试**：所有API端点都有测试
3. **端到端测试**：覆盖所有关键用户流程
4. **性能测试**：确保在预期负载下响应时间小于500ms

## 测试自动化

我们将在CI/CD流程中自动运行测试：

1. **提交前测试**：使用husky在提交代码前运行单元测试
2. **PR测试**：在合并PR前运行所有测试
3. **定期性能测试**：每周运行性能测试

## 测试报告

我们将生成以下测试报告：

1. **覆盖率报告**：使用Jest的覆盖率报告功能
2. **测试结果报告**：在CI/CD流程中生成测试结果报告
3. **性能测试报告**：使用k6生成性能测试报告
