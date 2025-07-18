# 只为记账 - 数据库模型设计

## 概述

本文档详细描述了"只为记账"应用的数据库模型设计。我们使用PostgreSQL作为主数据库，并通过Prisma ORM进行数据访问和管理。

## 实体关系图 (ERD)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Users    │       │   Families  │       │FamilyMembers│
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │       │ id          │       │ id          │
│ email       │◄──┐   │ name        │   ┌──►│ family_id   │
│ password    │   │   │ created_by  │◄──┘   │ user_id     │
│ name        │   └───┤ created_at  │       │ name        │
│ created_at  │       │ updated_at  │       │ role        │
│ updated_at  │       └─────────────┘       │ is_registered│
└─────────────┘               ▲             │ created_at  │
       ▲                      │             │ updated_at  │
       │                      │             └─────────────┘
       │                      │                    ▲
       │                      │                    │
┌─────────────┐       ┌─────────────┐             │
│  Categories │       │Transactions │             │
├─────────────┤       ├─────────────┤             │
│ id          │       │ id          │             │
│ name        │◄─────►│ amount      │             │
│ type        │       │ type        │             │
│ icon        │       │ category_id │             │
│ user_id     │       │ description │             │
│ family_id   │       │ date        │             │
│ is_default  │       │ user_id     │             │
│ created_at  │       │ family_id   │◄────────────┘
│ updated_at  │       │family_member_id          
└─────────────┘       │ created_at  │
       ▲              │ updated_at  │
       │              └─────────────┘
       │                     ▲
       │                     │
┌─────────────┐              │
│   Budgets   │              │
├─────────────┤              │
│ id          │              │
│ amount      │              │
│ period      │              │
│ start_date  │              │
│ end_date    │              │
│ category_id │◄─────────────┘
│ user_id     │
│ family_id   │
│ rollover    │
│ created_at  │
│ updated_at  │
└─────────────┘
```

## 详细模型定义

以下是使用Prisma Schema语法定义的数据库模型：

```prisma
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

## 模型说明

### User (用户)
- 存储用户基本信息和认证数据
- 每个用户可以创建个人记账记录、分类和预算
- 用户可以创建家庭并成为家庭成员

### Family (家庭)
- 代表一个家庭单位
- 由一个用户创建
- 可以包含多个家庭成员
- 可以有家庭级别的记账记录、分类和预算

### FamilyMember (家庭成员)
- 连接用户和家庭的关联表
- 可以表示已注册用户或未注册成员(如孩子)
- 定义成员在家庭中的角色(管理员或普通成员)

### Category (记账分类)
- 定义记账的分类(如食品、交通、工资等)
- 可以是系统默认分类、用户自定义分类或家庭自定义分类
- 分为收入和支出两种类型

### Transaction (记账记录)
- 记录用户的每一笔收入或支出
- 关联到用户、分类，可选关联到家庭和家庭成员
- 包含金额、日期、描述等详细信息

### Budget (预算)
- 定义用户或家庭的预算限制
- 可以是月度或年度预算
- 可以针对特定分类或总体预算
- 支持预算透支顺延功能

## 索引策略

为了优化查询性能，我们将在以下字段上创建索引：

1. 所有外键字段
2. Transaction.date - 用于日期范围查询
3. Transaction.type - 用于按类型筛选记账
4. Category.type - 用于按类型筛选分类
5. Budget.startDate 和 Budget.endDate - 用于日期范围查询

## 数据迁移策略

1. 初始迁移：创建基本表结构
2. 默认数据迁移：添加系统默认分类
3. 后续功能迁移：随着功能开发逐步添加新表和字段

## 数据安全考虑

1. 密码使用bcrypt或Argon2进行哈希处理
2. 敏感财务数据在应用层进行额外加密
3. 实施行级安全策略，确保用户只能访问自己的数据或所属家庭的数据
4. 定期备份数据库，实施灾难恢复策略
