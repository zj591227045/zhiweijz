# 只为记账 - API实现详细规划

本文档详细描述了"只为记账"应用后端API的实现方法，包括控制器、服务层、数据访问层的设计和实现细节。

## 项目结构

我们将采用模块化的项目结构，遵循关注点分离原则：

```
server/src/
├── config/                 # 配置文件
├── controllers/            # 控制器
├── services/               # 服务层
├── repositories/           # 数据访问层
├── models/                 # 数据模型和接口
├── middlewares/            # 中间件
├── utils/                  # 工具函数
├── validators/             # 请求验证
├── ai/                     # AI相关功能
├── app.ts                  # 应用入口
└── server.ts               # 服务器启动

server/prisma/                     # Prisma ORM
├── schema.prisma           # 数据库模型定义
└── migrations/             # 数据库迁移文件
```

## 技术实现细节

### 1. 控制器层 (Controllers)

控制器负责处理HTTP请求，验证输入，调用服务层，并返回响应。

**示例: 用户认证控制器**

```typescript
// server/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { validateRegisterInput, validateLoginInput } from '../validators/auth.validator';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = validateRegisterInput(req.body);
      if (error) {
        res.status(400).json({ error: { message: error.details[0].message } });
        return;
      }

      // 调用服务层
      const result = await this.authService.register(value);
      
      // 返回响应
      res.status(201).json(result);
    } catch (err) {
      if (err.code === 'P2002') {
        res.status(409).json({ error: { message: '该邮箱已被注册' } });
      } else {
        res.status(500).json({ error: { message: '服务器错误' } });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      // 验证请求数据
      const { error, value } = validateLoginInput(req.body);
      if (error) {
        res.status(400).json({ error: { message: error.details[0].message } });
        return;
      }

      // 调用服务层
      const result = await this.authService.login(value);
      
      // 返回响应
      if (!result) {
        res.status(401).json({ error: { message: '邮箱或密码不正确' } });
        return;
      }
      
      res.status(200).json(result);
    } catch (err) {
      res.status(500).json({ error: { message: '服务器错误' } });
    }
  }

  // 其他认证方法...
}
```

### 2. 服务层 (Services)

服务层包含业务逻辑，调用数据访问层，并处理业务规则。

**示例: 用户认证服务**

```typescript
// server/src/services/auth.service.ts
import { UserRepository } from '../repositories/user.repository';
import { generateToken } from '../utils/jwt';
import { hashPassword, comparePassword } from '../utils/password';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(userData: { email: string; password: string; name: string }) {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('该邮箱已被注册');
    }

    // 哈希密码
    const passwordHash = await hashPassword(userData.password);

    // 创建用户
    const user = await this.userRepository.create({
      email: userData.email,
      passwordHash,
      name: userData.name
    });

    // 生成JWT令牌
    const token = generateToken({ userId: user.id });

    // 返回用户信息和令牌
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      token
    };
  }

  async login(credentials: { email: string; password: string }) {
    // 查找用户
    const user = await this.userRepository.findByEmail(credentials.email);
    if (!user) {
      return null;
    }

    // 验证密码
    const isPasswordValid = await comparePassword(credentials.password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    // 生成JWT令牌
    const token = generateToken({ userId: user.id });

    // 返回用户信息和令牌
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
  }

  // 其他认证方法...
}
```

### 3. 数据访问层 (Repositories)

数据访问层负责与数据库交互，使用Prisma ORM执行CRUD操作。

**示例: 用户数据访问**

```typescript
// server/src/repositories/user.repository.ts
import { PrismaClient } from '@server/prisma/client';

export class UserRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(userData: { email: string; passwordHash: string; name: string }) {
    return this.prisma.user.create({
      data: userData
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async update(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  // 其他数据访问方法...
}
```

### 4. 中间件 (Middlewares)

中间件用于处理认证、日志记录、错误处理等横切关注点。

**示例: 认证中间件**

```typescript
// server/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UserRepository } from '../repositories/user.repository';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // 获取Authorization头
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: { message: '未提供认证令牌' } });
    }

    // 提取令牌
    const token = authHeader.split(' ')[1];
    
    // 验证令牌
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return res.status(401).json({ error: { message: '无效的认证令牌' } });
    }

    // 获取用户信息
    const userRepository = new UserRepository();
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: { message: '用户不存在' } });
    }

    // 将用户信息添加到请求对象
    req.user = user;
    
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: '认证失败' } });
  }
}
```

### 5. 验证器 (Validators)

验证器用于验证请求数据的格式和内容。

**示例: 认证验证器**

```typescript
// server/src/validators/auth.validator.ts
import Joi from 'joi';

export function validateRegisterInput(data: any) {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '请提供有效的邮箱地址',
      'any.required': '邮箱是必填项'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': '密码至少需要8个字符',
      'any.required': '密码是必填项'
    }),
    name: Joi.string().required().messages({
      'any.required': '用户名是必填项'
    })
  });

  return schema.validate(data);
}

export function validateLoginInput(data: any) {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': '请提供有效的邮箱地址',
      'any.required': '邮箱是必填项'
    }),
    password: Joi.string().required().messages({
      'any.required': '密码是必填项'
    })
  });

  return schema.validate(data);
}
```

### 6. 工具函数 (Utils)

工具函数提供通用功能，如JWT处理、密码哈希等。

**示例: JWT工具**

```typescript
// server/src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import config from '../config';

export function generateToken(payload: any): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}
```

**示例: 密码工具**

```typescript
// server/src/utils/password.ts
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

## 路由配置

路由配置将API端点映射到控制器方法。

**示例: 认证路由**

```typescript
// server/src/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
router.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

export default router;
```

## 应用配置

应用配置设置Express服务器和中间件。

**示例: 应用入口**

```typescript
// server/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import transactionRoutes from './routes/transaction.routes';
import categoryRoutes from './routes/category.routes';
import budgetRoutes from './routes/budget.routes';
import familyRoutes from './routes/family.routes';
import statisticsRoutes from './routes/statistics.routes';
import aiRoutes from './routes/ai.routes';
import { errorHandler } from './middlewares/error.middleware';

const app = express();

// 中间件
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/ai', aiRoutes);

// 错误处理
app.use(errorHandler);

export default app;
```

## 服务器启动

服务器启动文件配置服务器监听。

**示例: 服务器启动**

```typescript
// server/src/server.ts
import app from './app';
import config from './config';

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## 配置文件

配置文件管理环境变量和应用配置。

**示例: 配置文件**

```typescript
// server/src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export default {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  databaseUrl: process.env.DATABASE_URL
};
```
