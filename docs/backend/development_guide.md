# 只为记账 - 后端开发指南

本文档提供了"只为记账"应用后端开发的详细指南，包括环境设置、开发流程、编码规范和最佳实践。

## 开发环境设置

### 前提条件

- Node.js v16+
- npm v8+
- PostgreSQL v13+
- Git

### 环境设置步骤

1. **克隆代码库**

```bash
git clone https://github.com/yourusername/zhiweijz.git
cd zhiweijz
```

2. **安装依赖**

```bash
npm install
```

3. **设置环境变量**

复制`.env.example`文件并重命名为`.env`，然后根据需要修改配置：

```bash
cp .env.example .env
```

`.env`文件示例：

```
# 应用配置
NODE_ENV=development
PORT=3000

# 数据库配置
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zhiweijz

# JWT配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 邮件配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password

# OpenAI配置（可选，用于AI功能）
OPENAI_API_KEY=your_openai_api_key
```

4. **设置数据库**

确保PostgreSQL服务正在运行，然后创建数据库：

```bash
createdb zhiweijz
```

5. **运行数据库迁移**

```bash
npx prisma migrate dev
```

6. **生成Prisma客户端**

```bash
npx prisma generate
```

7. **填充测试数据（可选）**

```bash
npx prisma db seed
```

8. **启动开发服务器**

```bash
npm run dev
```

服务器将在`http://localhost:3000`启动。

## 开发流程

### 分支策略

我们采用以下分支策略：

- `main`: 生产环境分支，只接受来自`develop`分支的合并
- `develop`: 开发环境分支，用于集成功能分支
- `feature/*`: 功能分支，用于开发新功能
- `bugfix/*`: 修复分支，用于修复bug
- `hotfix/*`: 热修复分支，用于紧急修复生产环境问题

### 开发新功能

1. 从`develop`分支创建新的功能分支：

```bash
git checkout develop
git pull
git checkout -b feature/your-feature-name
```

2. 开发功能并提交更改：

```bash
git add .
git commit -m "feat: add your feature"
```

3. 推送分支到远程仓库：

```bash
git push -u origin feature/your-feature-name
```

4. 创建Pull Request到`develop`分支

5. 代码审查通过后，合并到`develop`分支

### 提交规范

我们使用[Conventional Commits](https://www.conventionalcommits.org/)规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

常用的`type`包括：

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更改
- `style`: 代码风格更改（不影响代码功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具的变动

示例：

```
feat(auth): add email verification

- Add email verification service
- Add verification email template
- Add verification API endpoint

Closes #123
```

## 编码规范

### TypeScript规范

- 使用TypeScript的严格模式（`strict: true`）
- 为所有函数和方法添加类型注解
- 使用接口定义数据结构
- 避免使用`any`类型

### 命名规范

- **文件名**: 使用kebab-case（如`auth-service.ts`）
- **类名**: 使用PascalCase（如`AuthService`）
- **变量和函数**: 使用camelCase（如`getUserById`）
- **常量**: 使用UPPER_SNAKE_CASE（如`MAX_LOGIN_ATTEMPTS`）
- **接口**: 使用PascalCase，不加前缀（如`User`而非`IUser`）
- **类型**: 使用PascalCase，后缀为`Type`（如`ResponseType`）

### 代码组织

- 相关功能应放在同一模块中
- 每个文件应只有一个主要的导出
- 保持文件大小合理（不超过300行）
- 使用有意义的目录结构组织代码

### 注释规范

- 使用JSDoc风格的注释
- 为复杂的函数和方法添加注释
- 解释"为什么"而不是"是什么"
- 保持注释与代码同步

示例：

```typescript
/**
 * 验证用户并生成JWT令牌
 * 
 * @param email - 用户邮箱
 * @param password - 用户密码
 * @returns 包含用户信息和令牌的对象，如果验证失败则返回null
 */
async function authenticateUser(email: string, password: string): Promise<AuthResult | null> {
  // 实现...
}
```

## API开发指南

### RESTful API设计

- 使用资源名词而非动词
- 使用HTTP方法表示操作（GET、POST、PUT、DELETE等）
- 使用复数形式命名资源（如`/users`而非`/user`）
- 使用嵌套资源表示关系（如`/users/:id/transactions`）
- 使用查询参数进行过滤、排序和分页

### 请求验证

使用Joi或Zod进行请求验证：

```typescript
// server/src/validators/transaction.validator.ts
import Joi from 'joi';

export function validateCreateTransaction(data: any) {
  const schema = Joi.object({
    amount: Joi.number().required().positive(),
    type: Joi.string().valid('INCOME', 'EXPENSE').required(),
    categoryId: Joi.string().uuid().required(),
    description: Joi.string().allow('', null),
    date: Joi.date().iso().required(),
    familyId: Joi.string().uuid().allow(null),
    familyMemberId: Joi.string().uuid().allow(null)
  });

  return schema.validate(data);
}
```

### 错误处理

使用统一的错误响应格式：

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "金额必须为正数"
  }
}
```

### 响应格式

使用一致的响应格式：

- 单个资源：直接返回资源对象
- 资源列表：返回包含分页信息的对象

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
      "date": "2023-05-15T12:30:00Z"
    },
    // ...更多交易记录
  ]
}
```

## 测试指南

### 单元测试

使用Jest进行单元测试：

```typescript
// tests/unit/services/auth.service.test.ts
import { AuthService } from '../../../server/src/services/auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn()
    };
    
    authService = new AuthService(mockUserRepository);
  });

  describe('login', () => {
    it('should return null for non-existent user', async () => {
      // 设置模拟行为
      mockUserRepository.findByEmail.mockResolvedValue(null);
      
      // 执行测试
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: 'password'
      });
      
      // 验证结果
      expect(result).toBeNull();
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    // 更多测试...
  });
});
```

### 集成测试

使用Supertest进行API测试：

```typescript
// tests/integration/auth.api.test.ts
import request from 'supertest';
import app from '../../server/src/app';
import { prisma } from '../../server/src/lib/prisma';

describe('Auth API', () => {
  beforeAll(async () => {
    // 设置测试数据
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: '测试用户'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('name', '测试用户');
      expect(response.body).toHaveProperty('token');
    });

    // 更多测试...
  });
});
```

### 测试覆盖率

我们的目标是达到以下测试覆盖率：

- 单元测试：80%+
- 集成测试：所有API端点
- 端到端测试：关键用户流程

## 性能优化

### 数据库优化

- 为常用查询创建索引
- 使用批量操作代替循环单个操作
- 优化查询，只获取需要的字段
- 使用事务确保数据一致性

### API优化

- 实施缓存策略（Redis、内存缓存）
- 使用分页减少响应大小
- 压缩响应数据
- 使用异步处理长时间运行的任务

## 安全最佳实践

### 认证与授权

- 使用bcrypt或Argon2哈希密码
- 实施JWT令牌过期和刷新机制
- 使用HTTPS加密传输
- 实施CORS策略

### 数据验证

- 验证所有用户输入
- 使用参数化查询防止SQL注入
- 净化输出防止XSS攻击
- 实施请求速率限制

### 敏感数据处理

- 加密存储敏感数据
- 不在日志中记录敏感信息
- 遵循最小权限原则
- 定期审计和轮换密钥
