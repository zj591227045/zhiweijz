# 只为记账 - 数据库实现详细规划

本文档详细描述了"只为记账"应用的数据库实现方案，包括数据库选择、ORM配置、数据模型实现和迁移策略。

## 数据库选择

我们选择PostgreSQL作为主数据库，原因如下：

1. **强大的关系型数据库**：支持复杂查询和事务
2. **JSON数据类型支持**：可以存储半结构化数据
3. **强大的索引功能**：提升查询性能
4. **开源且活跃的社区支持**
5. **可扩展性**：支持水平和垂直扩展

## ORM选择

我们选择Prisma作为ORM（对象关系映射）工具，原因如下：

1. **类型安全**：与TypeScript完美集成
2. **自动生成客户端**：减少样板代码
3. **直观的数据模型定义**：使用声明式模式语言
4. **强大的迁移工具**：简化数据库版本控制
5. **优秀的查询API**：支持复杂查询和关系

## 数据库模型实现

### Prisma Schema

以下是完整的Prisma Schema定义：

```prisma
// server/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // 关系
  transactions  Transaction[]
  categories    Category[]
  budgets       Budget[]
  families      Family[]       @relation("FamilyCreator")
  familyMembers FamilyMember[]
  feedback      UserFeedback[]

  @@map("users")
}

// 家庭模型
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

  @@map("families")
}

// 家庭成员模型
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

  @@map("family_members")
}

// 邀请模型
model Invitation {
  id             String   @id @default(uuid())
  familyId       String   @map("family_id")
  invitationCode String   @unique @map("invitation_code")
  expiresAt      DateTime @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")

  // 关系
  family Family @relation(fields: [familyId], references: [id])

  @@map("invitations")
}

// 记账分类模型
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

  @@map("categories")
}

// 记账记录模型
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
  feedback     UserFeedback[]

  @@map("transactions")
}

// 预算模型
model Budget {
  id         String      @id @default(uuid())
  amount     Decimal     @db.Decimal(10, 2)
  period     BudgetPeriod
  startDate  DateTime    @map("start_date")
  endDate    DateTime    @map("end_date")
  categoryId String?     @map("category_id")
  userId     String?     @map("user_id")
  familyId   String?     @map("family_id")
  rollover   Boolean     @default(false)
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  // 关系
  user     User?     @relation(fields: [userId], references: [id])
  family   Family?   @relation(fields: [familyId], references: [id])
  category Category? @relation(fields: [categoryId], references: [id])

  @@map("budgets")
}

// AI模型
model AIModel {
  id        String   @id @default(uuid())
  name      String
  version   String
  type      String
  modelPath String   @map("model_path")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("ai_models")
}

// 用户反馈
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

  @@map("user_feedback")
}

// 枚举类型
enum TransactionType {
  INCOME
  EXPENSE
}

enum BudgetPeriod {
  MONTHLY
  YEARLY
}

enum Role {
  ADMIN
  MEMBER
}
```

## 索引策略

为了优化查询性能，我们将在以下字段上创建索引：

```prisma
// 在schema.prisma中添加以下索引

model Transaction {
  // ... 其他字段

  @@index([date]) // 用于日期范围查询
  @@index([type]) // 用于按类型筛选记账
  @@index([userId]) // 用于获取用户记账
  @@index([familyId]) // 用于获取家庭记账
  @@index([categoryId]) // 用于按分类筛选记账
}

model Category {
  // ... 其他字段

  @@index([type]) // 用于按类型筛选分类
  @@index([userId]) // 用于获取用户分类
  @@index([familyId]) // 用于获取家庭分类
}

model Budget {
  // ... 其他字段

  @@index([startDate, endDate]) // 用于日期范围查询
  @@index([userId]) // 用于获取用户预算
  @@index([familyId]) // 用于获取家庭预算
}

model FamilyMember {
  // ... 其他字段

  @@index([familyId]) // 用于获取家庭成员
  @@index([userId]) // 用于获取用户所属家庭
}
```

## 数据库迁移策略

我们将使用Prisma Migrate来管理数据库迁移：

### 初始迁移

1. 创建初始数据库模型：

```bash
npx prisma migrate dev --name init
```

这将创建初始数据库结构。

### 默认数据迁移

2. 创建默认分类数据：

```typescript
// server/prisma/seed.ts
import { PrismaClient } from '@server/prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 创建默认支出分类
  const expenseCategories = [
    { name: '餐饮', type: 'EXPENSE', icon: 'utensils', isDefault: true },
    { name: '购物', type: 'EXPENSE', icon: 'shopping-bag', isDefault: true },
    { name: '交通', type: 'EXPENSE', icon: 'bus', isDefault: true },
    { name: '住房', type: 'EXPENSE', icon: 'home', isDefault: true },
    { name: '娱乐', type: 'EXPENSE', icon: 'gamepad', isDefault: true },
    { name: '医疗', type: 'EXPENSE', icon: 'heartbeat', isDefault: true },
    { name: '教育', type: 'EXPENSE', icon: 'graduation-cap', isDefault: true },
    { name: '旅行', type: 'EXPENSE', icon: 'plane', isDefault: true },
    { name: '通讯', type: 'EXPENSE', icon: 'mobile-alt', isDefault: true },
  ];

  // 创建默认收入分类
  const incomeCategories = [
    { name: '工资', type: 'INCOME', icon: 'money-bill-wave', isDefault: true },
    { name: '奖金', type: 'INCOME', icon: 'gift', isDefault: true },
    { name: '投资收益', type: 'INCOME', icon: 'chart-line', isDefault: true },
    { name: '兼职收入', type: 'INCOME', icon: 'briefcase', isDefault: true },
    { name: '其他收入', type: 'INCOME', icon: 'plus-circle', isDefault: true },
  ];

  // 批量创建分类
  await prisma.category.createMany({
    data: [...expenseCategories, ...incomeCategories],
    skipDuplicates: true,
  });

  console.log('Default categories seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

运行种子脚本：

```bash
npx prisma db seed
```

### 后续迁移

对于后续的数据库更改，我们将遵循以下流程：

1. 修改`schema.prisma`文件
2. 创建新的迁移：

```bash
npx prisma migrate dev --name migration_name
```

3. 验证迁移是否成功
4. 在生产环境中应用迁移：

```bash
npx prisma migrate deploy
```

## 数据库连接管理

### 连接池配置

为了优化数据库连接，我们将配置连接池：

```typescript
// server/src/lib/prisma.ts
import { PrismaClient } from '@server/prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 连接池配置
    __internal: {
      engine: {
        connectionLimit: 5, // 连接池大小
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 事务管理

对于需要原子性的操作，我们将使用Prisma的事务API：

```typescript
// 示例：在事务中创建家庭和家庭成员
async function createFamilyWithMember(userId: string, familyName: string) {
  return prisma.$transaction(async (tx) => {
    // 创建家庭
    const family = await tx.family.create({
      data: {
        name: familyName,
        createdBy: userId,
      },
    });

    // 创建家庭成员（创建者作为管理员）
    const member = await tx.familyMember.create({
      data: {
        familyId: family.id,
        userId: userId,
        name: '管理员', // 可以从用户信息中获取
        role: 'ADMIN',
        isRegistered: true,
      },
    });

    return { family, member };
  });
}
```

## 数据库备份策略

为了确保数据安全，我们将实施以下备份策略：

1. **定时备份**：每日自动备份数据库
2. **增量备份**：每小时进行增量备份
3. **备份验证**：定期验证备份的完整性
4. **多地备份**：将备份存储在多个地理位置
5. **加密备份**：对备份数据进行加密

## 数据库性能优化

为了确保数据库性能，我们将采取以下措施：

1. **合理的索引**：如上所述，为常用查询创建索引
2. **查询优化**：使用Prisma的查询API优化查询
3. **分页处理**：对大结果集使用分页
4. **选择性加载**：只加载需要的字段和关系
5. **缓存策略**：对频繁访问的数据实施缓存

## 数据库安全措施

为了保护数据库安全，我们将实施以下措施：

1. **访问控制**：限制数据库访问权限
2. **加密敏感数据**：对敏感信息进行加密存储
3. **参数化查询**：使用Prisma的API防止SQL注入
4. **审计日志**：记录数据库操作日志
5. **定期安全审计**：定期检查数据库安全配置
