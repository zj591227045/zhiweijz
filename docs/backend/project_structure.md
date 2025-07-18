# 只为记账 - 后端项目结构

本文档详细描述了"只为记账"应用后端的项目结构，包括目录组织、文件命名规范和模块划分。

## 目录结构

```
zhiweijz/
├── server/                    # 后端代码目录
│   ├── server/prisma/                # Prisma ORM相关文件
│   │   ├── schema.prisma      # 数据库模型定义
│   │   ├── migrations/        # 数据库迁移文件
│   │   └── seed.ts            # 数据库种子数据
│   │
│   ├── server/src/                   # 后端源代码目录
│   │   ├── config/            # 配置文件
│   │   │   ├── config.ts      # 主配置文件
│   │   │   └── database.ts    # 数据库配置
│   │   │
│   │   ├── controllers/       # 控制器
│   │   │   ├── auth.controller.ts    # 认证控制器
│   │   │   ├── user.controller.ts    # 用户控制器
│   │   │   ├── transaction.controller.ts # 记账控制器
│   │   │   ├── category.controller.ts    # 分类控制器
│   │   │   ├── budget.controller.ts      # 预算控制器
│   │   │   ├── family.controller.ts      # 家庭控制器
│   │   │   ├── statistics.controller.ts  # 统计控制器
│   │   │   └── ai.controller.ts          # AI功能控制器
│   │   │
│   │   ├── services/          # 服务层
│   │   │   ├── auth.service.ts        # 认证服务
│   │   │   ├── user.service.ts        # 用户服务
│   │   │   ├── transaction.service.ts # 记账服务
│   │   │   ├── category.service.ts    # 分类服务
│   │   │   ├── budget.service.ts      # 预算服务
│   │   │   ├── family.service.ts      # 家庭服务
│   │   │   ├── statistics.service.ts  # 统计服务
│   │   │   └── ai.service.ts          # AI功能服务
│   │   │
│   │   ├── repositories/      # 数据访问层
│   │   │   ├── user.repository.ts     # 用户数据访问
│   │   │   ├── transaction.repository.ts # 记账数据访问
│   │   │   ├── category.repository.ts    # 分类数据访问
│   │   │   ├── budget.repository.ts      # 预算数据访问
│   │   │   ├── family.repository.ts      # 家庭数据访问
│   │   │   └── base.repository.ts        # 基础数据访问
│   │   │
│   │   ├── models/            # 数据模型和接口
│   │   │   ├── user.model.ts          # 用户模型
│   │   │   ├── auth.model.ts          # 认证模型
│   │   │   ├── transaction.model.ts   # 记账模型
│   │   │   ├── category.model.ts      # 分类模型
│   │   │   ├── budget.model.ts        # 预算模型
│   │   │   ├── family.model.ts        # 家庭模型
│   │   │   └── common.model.ts        # 通用模型
│   │   │
│   │   ├── middlewares/       # 中间件
│   │   │   ├── auth.middleware.ts     # 认证中间件
│   │   │   ├── error.middleware.ts    # 错误处理中间件
│   │   │   ├── validation.middleware.ts # 验证中间件
│   │   │   └── logger.middleware.ts   # 日志中间件
│   │   │
│   │   ├── validators/        # 请求验证
│   │   │   ├── auth.validator.ts      # 认证验证器
│   │   │   ├── user.validator.ts      # 用户验证器
│   │   │   ├── transaction.validator.ts # 记账验证器
│   │   │   ├── category.validator.ts  # 分类验证器
│   │   │   ├── budget.validator.ts    # 预算验证器
│   │   │   └── family.validator.ts    # 家庭验证器
│   │   │
│   │   ├── utils/             # 工具函数
│   │   │   ├── jwt.ts                 # JWT工具
│   │   │   ├── password.ts            # 密码工具
│   │   │   ├── date.ts                # 日期工具
│   │   │   ├── logger.ts              # 日志工具
│   │   │   └── error.ts               # 错误处理工具
│   │   │
│   │   ├── ai/                # AI相关功能
│   │   │   ├── classifiers/           # 分类器
│   │   │   ├── analyzers/             # 分析器
│   │   │   ├── recommenders/          # 推荐器
│   │   │   └── models/                # AI模型
│   │   │
│   │   ├── routes/            # 路由定义
│   │   │   ├── auth.routes.ts         # 认证路由
│   │   │   ├── user.routes.ts         # 用户路由
│   │   │   ├── transaction.routes.ts  # 记账路由
│   │   │   ├── category.routes.ts     # 分类路由
│   │   │   ├── budget.routes.ts       # 预算路由
│   │   │   ├── family.routes.ts       # 家庭路由
│   │   │   ├── statistics.routes.ts   # 统计路由
│   │   │   ├── ai.routes.ts           # AI功能路由
│   │   │   └── index.ts               # 路由汇总
│   │   │
│   │   ├── __tests__/         # 测试文件
│   │   │   ├── app.test.ts            # 应用测试
│   │   │   ├── auth.test.ts           # 认证测试
│   │   │   └── user.test.ts           # 用户测试
│   │   │
│   │   ├── app.ts             # 应用配置
│   │   └── server.ts          # 服务器入口
│   │
│   └── .env                   # 后端环境变量
│
├── client/                    # 前端代码目录
│   ├── src/                   # 前端源代码目录
│   │   ├── components/        # 组件
│   │   ├── pages/             # 页面
│   │   ├── services/          # 服务
│   │   ├── utils/             # 工具函数
│   │   ├── assets/            # 静态资源
│   │   ├── styles/            # 样式文件
│   │   ├── App.tsx            # 应用入口
│   │   └── index.tsx          # 主入口
│   │
│   ├── public/                # 公共文件
│   └── .env                   # 前端环境变量
│
├── shared/                    # 前后端共享代码
│   ├── types/                 # 共享类型定义
│   └── utils/                 # 共享工具函数
│
├── scripts/                   # 脚本文件
│   ├── seed.js                # 数据库种子脚本
│   └── deploy.js              # 部署脚本
│
├── .env                       # 环境变量
├── .env.example               # 环境变量示例
├── .gitignore                 # Git忽略文件
├── package.json               # 项目依赖
├── tsconfig.json              # TypeScript配置
├── jest.config.js             # Jest测试配置
├── .eslintrc.js               # ESLint配置
├── .prettierrc                # Prettier配置
├── Dockerfile                 # Docker配置
├── docker-compose.yml         # Docker Compose配置
└── README.md                  # 项目说明
```

## 命名规范

### 文件命名

- 使用kebab-case（短横线命名法）
- 文件名应反映其内容和用途
- 使用有意义的后缀（如`.controller.ts`、`.service.ts`）

### 类命名

- 使用PascalCase（大驼峰命名法）
- 类名应反映其职责
- 使用有意义的后缀（如`Controller`、`Service`、`Repository`）

### 变量和函数命名

- 使用camelCase（小驼峰命名法）
- 名称应清晰表达其用途
- 避免使用缩写（除非是广泛接受的缩写）

### 常量命名

- 使用UPPER_SNAKE_CASE（大写下划线命名法）
- 常量应放在相关模块的顶部

## 模块划分

### 控制器 (Controllers)

控制器负责处理HTTP请求，验证输入，调用服务层，并返回响应。

```typescript
// server/src/controllers/transaction.controller.ts
import { Request, Response } from 'express';
import { TransactionService } from '../services/transaction.service';
import { validateCreateTransaction } from '../validators/transaction.validator';

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateCreateTransaction(req.body);
      if (error) {
        res.status(400).json({ error: { message: error.details[0].message } });
        return;
      }

      const userId = req.user.id;
      const transaction = await this.transactionService.create(userId, value);

      res.status(201).json(transaction);
    } catch (err) {
      res.status(500).json({ error: { message: '服务器错误' } });
    }
  }

  // 其他方法...
}
```

### 服务层 (Services)

服务层包含业务逻辑，调用数据访问层，并处理业务规则。

```typescript
// server/src/services/transaction.service.ts
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CreateTransactionDto } from '../models/transaction.model';

export class TransactionService {
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
  }

  async create(userId: string, data: CreateTransactionDto) {
    // 检查分类是否存在
    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new Error('分类不存在');
    }

    // 创建记账记录
    const transaction = await this.transactionRepository.create({
      ...data,
      userId
    });

    return transaction;
  }

  // 其他方法...
}
```

### 数据访问层 (Repositories)

数据访问层负责与数据库交互，使用Prisma ORM执行CRUD操作。

```typescript
// server/src/repositories/transaction.repository.ts
import { PrismaClient, Transaction } from '@server/prisma/client';
import { CreateTransactionDto } from '../models/transaction.model';

export class TransactionRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: CreateTransactionDto & { userId: string }): Promise<Transaction> {
    return this.prisma.transaction.create({
      data
    });
  }

  async findById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id }
    });
  }

  // 其他方法...
}
```

### 路由 (Routes)

路由定义API端点和对应的控制器方法。

```typescript
// server/src/routes/transaction.routes.ts
import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// 所有记账路由都需要认证
router.use(authenticate);

// 记账CRUD路由
router.post('/', (req, res) => transactionController.create(req, res));
router.get('/', (req, res) => transactionController.getAll(req, res));
router.get('/:id', (req, res) => transactionController.getById(req, res));
router.patch('/:id', (req, res) => transactionController.update(req, res));
router.delete('/:id', (req, res) => transactionController.delete(req, res));

export default router;
```

## 依赖注入

为了简化依赖管理，我们将使用简单的依赖注入模式：

```typescript
// server/src/services/auth.service.ts
import { UserRepository } from '../repositories/user.repository';
import { JwtService } from './jwt.service';

export class AuthService {
  private userRepository: UserRepository;
  private jwtService: JwtService;

  constructor(
    userRepository = new UserRepository(),
    jwtService = new JwtService()
  ) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
  }

  // 方法...
}
```

这种方式允许在测试中轻松模拟依赖：

```typescript
// server/src/__tests__/services/auth.service.test.ts
import { AuthService } from '../../services/auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn()
    };

    mockJwtService = {
      generateToken: jest.fn()
    };

    authService = new AuthService(mockUserRepository, mockJwtService);
  });

  // 测试...
});
```

## 错误处理

我们将使用统一的错误处理机制：

```typescript
// server/src/utils/error.ts
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权') {
    super(message, 401);
  }
}

// 其他错误类...
```

然后使用中间件处理这些错误：

```typescript
// server/src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';
import logger from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message
      }
    });
  }

  // 未知错误
  logger.error(err);

  return res.status(500).json({
    error: {
      message: '服务器错误'
    }
  });
}
```
