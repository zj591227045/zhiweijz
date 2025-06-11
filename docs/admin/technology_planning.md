# 只为记账管理页面技术规划

## 1. 项目概述

### 1.1 目标
为"只为记账"项目添加管理页面，采用PC端管理、兼容移动端视图的方式。支持运营管理、用户管理、LLM服务管理和公告系统。

### 1.2 核心功能
- 仪表盘：显示服务器运行指标
- 用户管理：用户CRUD操作，注册开关控制
- LLM服务管理：全局LLM配置管理
- 公告系统：向用户发送通知，支持已读状态

## 2. 技术架构

### 2.1 前端架构
```
web/
├── app/
│   ├── admin/                    # 管理页面路由
│   │   ├── layout.tsx           # 管理页面布局
│   │   ├── page.tsx             # 仪表盘页面
│   │   ├── login/               # 登录页面
│   │   ├── users/               # 用户管理
│   │   ├── llm/                 # LLM服务管理
│   │   └── announcements/       # 公告管理
│   └── components/admin/         # 管理页面组件
├── lib/admin/                    # 管理页面工具函数
└── styles/admin/                 # 管理页面样式
```

### 2.2 后端架构
```
server/
├── src/
│   ├── admin/                   # 管理模块
│   │   ├── controllers/         # 管理控制器
│   │   ├── middleware/          # 管理中间件
│   │   ├── services/            # 管理服务
│   │   └── routes/              # 管理路由
│   ├── models/                  # 数据模型扩展
│   └── utils/                   # 工具函数
└── prisma/                      # 数据库Schema扩展
```

### 2.3 数据库架构
基于现有PostgreSQL + Prisma架构，新增以下表：

```prisma
// 管理员表
model Admin {
  id          String   @id @default(uuid())
  username    String   @unique
  passwordHash String  @map("password_hash")
  email       String?  @unique
  role        AdminRole @default(ADMIN)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")
  
  @@map("admins")
}

// 系统配置表
model SystemConfig {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String
  description String?
  type        ConfigType @default(STRING)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  @@map("system_configs")
}

// 公告表
model Announcement {
  id          String   @id @default(uuid())
  title       String
  content     String
  type        AnnouncementType @default(GENERAL)
  priority    Int      @default(0)
  status      AnnouncementStatus @default(DRAFT)
  publishedAt DateTime? @map("published_at")
  expiresAt   DateTime? @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  reads       AnnouncementRead[]
  
  @@map("announcements")
}

// 公告已读状态表
model AnnouncementRead {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  announcementId String   @map("announcement_id")
  readAt         DateTime @default(now()) @map("read_at")
  
  user           User         @relation(fields: [userId], references: [id])
  announcement   Announcement @relation(fields: [announcementId], references: [id])
  
  @@unique([userId, announcementId])
  @@map("announcement_reads")
}

// 系统统计表
model SystemStats {
  id          String   @id @default(uuid())
  date        DateTime @db.Date
  metric      String
  value       BigInt
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@unique([date, metric])
  @@map("system_stats")
}

// 前端访问日志表
model AccessLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  sessionId   String?  @map("session_id")
  path        String
  method      String
  userAgent   String?  @map("user_agent")
  ip          String?
  createdAt   DateTime @default(now()) @map("created_at")
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@map("access_logs")
}

// API调用日志表
model ApiCallLog {
  id          String   @id @default(uuid())
  endpoint    String
  method      String
  userId      String?  @map("user_id")
  statusCode  Int      @map("status_code")
  duration    Int      // 毫秒
  createdAt   DateTime @default(now()) @map("created_at")
  
  user        User?    @relation(fields: [userId], references: [id])
  
  @@map("api_call_logs")
}

enum AdminRole {
  SUPER_ADMIN
  ADMIN
}

enum ConfigType {
  STRING
  NUMBER
  BOOLEAN
  JSON
}

enum AnnouncementType {
  GENERAL
  SYSTEM
  FEATURE
  MAINTENANCE
}

enum AnnouncementStatus {
  DRAFT
  PUBLISHED
  EXPIRED
  ARCHIVED
}
```

## 3. 技术细节

### 3.1 认证系统
- 独立的管理员认证系统，与用户系统分离
- 使用JWT token进行身份验证
- 支持角色权限控制（超级管理员、普通管理员）
- 默认账号：admin，密码：zhiweijz2025

### 3.2 仪表盘统计系统

#### 3.2.1 实时统计指标
- 注册用户数：从User表统计
- 记账记录条数：从Transaction表统计
- 今日记账条数：按日期过滤Transaction表
- 今日注册人数：按日期过滤User表

#### 3.2.2 访问统计方案
**前端访问次数统计：**
- 在前端应用中间件层记录每次路由访问
- 记录用户ID、访问路径、时间戳等信息
- 存储到AccessLog表中
- 支持去重（同一用户短时间内重复访问同一页面）

**后端API调用统计：**
- 在Express中间件中记录所有API调用
- 记录接口路径、HTTP方法、响应时间、状态码等
- 存储到ApiCallLog表中
- 提供接口调用频率、成功率等统计

#### 3.2.3 数据聚合策略
- 使用定时任务（每小时/每日）将详细日志聚合到SystemStats表
- 减少实时查询压力，提高仪表盘响应速度
- 保留详细日志30天，聚合数据保留1年

### 3.3 用户管理系统
- 完整的用户CRUD操作
- 密码重置功能
- 注册开关控制（通过SystemConfig表配置）
- 用户状态管理（启用/禁用）
- 批量操作支持

### 3.4 LLM服务管理
- 全局LLM配置存储在SystemConfig表
- 前端检查全局配置开关
- 用户可选择使用服务器配置或自定义配置
- 支持多种LLM服务提供商配置
- **LLM调用日志记录**：记录所有LLM调用详情
  - 调用用户信息（ID、用户名）
  - 关联账本信息（ID、账本名）
  - Token使用统计（输入、输出、总计）
  - 消息内容（用户消息、AI回复、系统提示词）
  - 调用结果（成功/失败、错误信息、响应时间）
  - 成本统计（如果可用）

### 3.5 公告系统设计

#### 3.5.1 高效已读状态管理方案
基于调研结果，采用**分离存储已读记录**的方案：

**核心思路：**
- 公告表（Announcement）：存储公告内容和基本信息
- 已读表（AnnouncementRead）：仅存储用户已读记录
- 通过联合查询确定未读状态

**优势：**
- 存储效率高：只记录已读行为，减少数据冗余
- 查询性能好：已读表数据量相对较小
- 扩展性强：支持大量用户和公告

#### 3.5.2 公告推送策略
1. **时间过滤**：用户只能看到注册时间之后发布的公告
2. **已读判断**：通过LEFT JOIN查询已读状态
3. **批量标记**：需要前端的通知模态框中批量标记公告为已读状态
4. **性能优化**：
   - 对AnnouncementRead表建立复合索引 (userId, announcementId)
   - 对Announcement表建立发布时间索引
   - 使用Redis缓存热点公告数据

#### 3.5.3 公告查询SQL示例
```sql
-- 获取用户未读公告
SELECT 
  a.id,
  a.title,
  a.content,
  a.publishedAt,
  CASE WHEN ar.id IS NULL THEN false ELSE true END as isRead
FROM announcements a
LEFT JOIN announcement_reads ar 
  ON a.id = ar.announcement_id AND ar.user_id = ?
WHERE a.status = 'PUBLISHED'
  AND a.published_at > (SELECT created_at FROM users WHERE id = ?)
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
ORDER BY a.published_at DESC;
```

### 3.6 响应式设计
- 使用Tailwind CSS实现响应式布局
- PC端优先，移动端兼容
- 侧边栏在移动端可折叠
- 表格在移动端支持横向滚动

### 3.7 安全考虑
- 管理页面独立认证
- API接口权限验证
- 敏感操作需要二次确认
- 操作日志记录
- SQL注入防护
- XSS攻击防护

## 4. 实现任务列表

### 4.1 第一阶段：基础架构（预计3天）

#### 4.1.1 数据库设计和迁移
- [x] 设计管理员、公告、统计等表结构
- [x] 编写Prisma Schema
- [x] 创建数据库迁移文件
- [x] 初始化管理员账号

#### 4.1.2 后端基础框架
- [x] 创建管理模块目录结构
- [x] 实现管理员认证中间件
- [x] 创建基础路由和控制器
- [x] 实现JWT认证逻辑

#### 4.1.3 前端基础框架
- [x] 创建管理页面路由结构
- [x] 设计管理页面布局组件
- [x] 实现登录页面
- [x] 配置管理页面样式

### 4.2 第二阶段：仪表盘和统计（预计4天）

#### 4.2.1 统计数据收集
- [x] 实现前端访问统计中间件
- [x] 实现后端API调用统计中间件
- [x] 创建数据聚合定时任务
- [x] 实现基础统计查询服务

#### 4.2.2 仪表盘页面
- [ ] 实现统计数据API接口
- [ ] 设计仪表盘UI组件
- [ ] 实现实时数据展示
- [ ] 添加图表展示（使用Chart.js）

### 4.3 第三阶段：用户管理（预计3天）

#### 4.3.1 用户管理后端
- [x] 实现用户CRUD API接口
- [x] 实现密码重置功能
- [x] 实现注册开关控制
- [x] 实现用户状态管理

#### 4.3.2 用户管理前端
- [x] 设计用户列表页面
- [x] 实现用户编辑弹窗
- [x] 实现批量操作功能
- [x] 添加搜索和过滤功能

### 4.4 第四阶段：LLM服务管理（预计3天）

#### 4.4.1 LLM配置管理
- [ ] 实现系统配置CRUD接口
- [ ] 实现LLM配置页面
- [ ] 修改前端LLM设置逻辑
- [ ] 支持服务器/自定义配置切换

#### 4.4.2 LLM调用日志
- [ ] 实现LLM调用日志记录中间件
- [ ] 实现LLM调用日志查询接口
- [ ] 实现LLM调用日志管理页面
- [ ] 添加LLM使用统计和图表展示

### 4.5 第五阶段：公告系统（预计4天）

#### 4.5.1 公告管理后端
- [ ] 实现公告CRUD接口
- [ ] 实现公告发布和撤回
- [ ] 实现已读状态记录
- [ ] 优化公告查询性能

#### 4.5.2 公告管理前端
- [ ] 实现公告列表和编辑页面
- [ ] 实现富文本编辑器
- [ ] 实现公告预览功能
- [ ] 添加公告统计数据

#### 4.5.3 用户端公告展示
- [ ] 修改前端通知系统
- [ ] 实现公告弹窗展示
- [ ] 实现已读状态同步
- [ ] 优化公告加载性能

### 4.6 第六阶段：优化和测试（预计2天）

#### 4.6.1 性能优化
- [ ] 数据库查询优化
- [ ] 前端页面性能优化
- [ ] 添加缓存机制
- [ ] 优化响应式布局

#### 4.6.2 测试和完善
- [ ] 单元测试编写
- [ ] 集成测试验证
- [ ] 安全性测试
- [ ] 文档编写

## 5. 关键技术选型

### 5.1 前端技术栈
- **框架**：Next.js 14 (已有)
- **UI库**：基于现有Tailwind CSS
- **状态管理**：Zustand (已有)
- **图表库**：Chart.js (新增)
- **表单验证**：Zod + React Hook Form (已有)

### 5.2 后端技术栈
- **框架**：Express.js (已有)
- **ORM**：Prisma (已有)
- **认证**：JWT
- **定时任务**：node-cron
- **缓存**：Redis (推荐新增)

### 5.3 数据库设计原则
- 使用UUID作为主键
- 合理设置索引优化查询性能
- 采用软删除策略
- 设置合适的外键约束

## 6. 部署和运维

### 6.1 环境配置
- 新增管理员JWT密钥配置
- 添加Redis配置（如果使用）
- 配置定时任务执行时间

### 6.2 监控和日志
- 管理操作日志记录
- 性能监控指标
- 错误日志收集
- 安全审计日志

### 6.3 备份策略
- 管理员账号备份
- 重要配置备份
- 公告数据备份

## 7. 风险和挑战

### 7.1 技术风险
- 大量用户情况下公告已读状态查询性能
- 前端访问统计可能影响用户体验
- 管理页面安全性要求高

### 7.2 解决方案
- 使用数据库索引和缓存优化查询
- 异步记录访问日志，避免阻塞用户操作
- 实施多层安全防护措施

## 8. 后续扩展

### 8.1 功能扩展
- 管理员操作审计
- 数据导出和导入
- 更细粒度的权限控制
- 多语言支持

### 8.2 性能扩展
- 引入Redis缓存
- 数据分片策略
- CDN加速
- 负载均衡

---

**预计总开发时间：19个工作日**
**建议开发人员：2-3人**
**建议先完成核心功能（仪表盘、用户管理），再逐步添加高级功能** 