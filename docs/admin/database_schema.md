# 管理系统数据库Schema设计

## 1. 概述

本文档详细描述了"只为记账"管理系统的数据库Schema设计。基于现有的PostgreSQL + Prisma架构，新增管理员认证、系统配置、公告系统和统计日志等功能模块。

## 2. 新增表结构

### 2.1 管理员表 (admins)

```prisma
model Admin {
  id          String   @id @default(uuid())
  username    String   @unique
  passwordHash String  @map("password_hash")
  email       String?  @unique
  role        AdminRole @default(ADMIN)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  lastLoginAt DateTime? @map("last_login_at")
  isActive    Boolean  @default(true) @map("is_active")
  
  @@map("admins")
}

enum AdminRole {
  SUPER_ADMIN  // 超级管理员
  ADMIN        // 普通管理员
}
```

**字段说明：**
- `id`: 主键，UUID格式
- `username`: 管理员用户名，唯一
- `passwordHash`: 密码哈希值，使用bcrypt加密
- `email`: 邮箱地址，可选，用于找回密码
- `role`: 管理员角色，支持权限分级
- `isActive`: 账号状态，支持禁用管理员

**索引：**
- PRIMARY KEY (`id`)
- UNIQUE INDEX (`username`)
- UNIQUE INDEX (`email`)

### 2.2 系统配置表 (system_configs)

```prisma
model SystemConfig {
  id          String     @id @default(uuid())
  key         String     @unique
  value       String
  description String?
  type        ConfigType @default(STRING)
  category    String     @default("general")
  isEditable  Boolean    @default(true) @map("is_editable")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  
  @@map("system_configs")
}

enum ConfigType {
  STRING
  NUMBER
  BOOLEAN
  JSON
}
```

**字段说明：**
- `key`: 配置键，唯一标识
- `value`: 配置值，统一存储为字符串
- `type`: 配置类型，用于前端展示和验证
- `category`: 配置分类，便于管理
- `isEditable`: 是否可编辑，防止系统关键配置被误修改

**预置配置项：**
```json
{
  "registration_enabled": {
    "value": "true",
    "type": "BOOLEAN",
    "category": "user",
    "description": "是否允许用户注册"
  },
  "llm_enabled": {
    "value": "false",
    "type": "BOOLEAN",
    "category": "llm",
    "description": "是否启用全局LLM服务"
  },
  "llm_config": {
    "value": "{}",
    "type": "JSON",
    "category": "llm",
    "description": "全局LLM配置"
  }
}
```

### 2.3 公告表 (announcements)

```prisma
model Announcement {
  id          String             @id @default(uuid())
  title       String
  content     String
  summary     String?            // 摘要，用于列表显示
  type        AnnouncementType   @default(GENERAL)
  priority    Int                @default(0)
  status      AnnouncementStatus @default(DRAFT)
  publishedAt DateTime?          @map("published_at")
  expiresAt   DateTime?          @map("expires_at")
  createdAt   DateTime           @default(now()) @map("created_at")
  updatedAt   DateTime           @updatedAt @map("updated_at")
  createdBy   String             @map("created_by")
  
  reads       AnnouncementRead[]
  
  @@map("announcements")
}

enum AnnouncementType {
  GENERAL      // 通用公告
  SYSTEM       // 系统公告
  FEATURE      // 功能更新
  MAINTENANCE  // 维护通知
}

enum AnnouncementStatus {
  DRAFT        // 草稿
  PUBLISHED    // 已发布
  EXPIRED      // 已过期
  ARCHIVED     // 已归档
}
```

**字段说明：**
- `summary`: 公告摘要，用于列表页显示
- `priority`: 优先级，数字越大优先级越高
- `publishedAt`: 发布时间，为空表示未发布
- `expiresAt`: 过期时间，为空表示永不过期
- `createdBy`: 创建者ID，关联管理员

**索引：**
- PRIMARY KEY (`id`)
- INDEX (`status`, `published_at`)
- INDEX (`type`, `priority`)

### 2.4 公告已读状态表 (announcement_reads)

```prisma
model AnnouncementRead {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  announcementId String   @map("announcement_id")
  readAt         DateTime @default(now()) @map("read_at")
  
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  
  @@unique([userId, announcementId])
  @@map("announcement_reads")
}
```

**关键特性：**
- 联合唯一索引 (`userId`, `announcementId`) 防止重复记录
- 级联删除：用户或公告删除时自动清理已读记录

**索引：**
- PRIMARY KEY (`id`)
- UNIQUE INDEX (`user_id`, `announcement_id`)
- INDEX (`announcement_id`)

### 2.5 系统统计表 (system_stats)

```prisma
model SystemStats {
  id          String   @id @default(uuid())
  date        DateTime @db.Date
  metric      String
  value       BigInt
  metadata    String?  // JSON格式的额外数据
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@unique([date, metric])
  @@map("system_stats")
}
```

**统计指标类型：**
- `user_count`: 总用户数
- `daily_registrations`: 每日注册数
- `transaction_count`: 总交易数
- `daily_transactions`: 每日交易数
- `daily_active_users`: 每日活跃用户数
- `api_calls_count`: API调用次数
- `frontend_visits`: 前端访问次数
- `llm_calls_count`: LLM调用次数
- `llm_tokens_used`: LLM Token使用量
- `llm_calls_success_rate`: LLM调用成功率

### 2.6 前端访问日志表 (access_logs)

```prisma
model AccessLog {
  id          String   @id @default(uuid())
  userId      String?  @map("user_id")
  sessionId   String?  @map("session_id")
  path        String
  method      String   @default("GET")
  userAgent   String?  @map("user_agent")
  ip          String?
  referrer    String?
  duration    Int?     // 页面停留时间（毫秒）
  createdAt   DateTime @default(now()) @map("created_at")
  
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@map("access_logs")
}
```

**索引：**
- PRIMARY KEY (`id`)
- INDEX (`user_id`, `created_at`)
- INDEX (`path`, `created_at`)
- INDEX (`created_at`) -- 用于清理过期数据

### 2.7 API调用日志表 (api_call_logs)

```prisma
model ApiCallLog {
  id          String   @id @default(uuid())
  endpoint    String
  method      String
  userId      String?  @map("user_id")
  statusCode  Int      @map("status_code")
  duration    Int      // 响应时间（毫秒）
  requestSize Int?     @map("request_size")  // 请求大小（字节）
  responseSize Int?    @map("response_size") // 响应大小（字节）
  errorMessage String? @map("error_message") // 错误信息
  createdAt   DateTime @default(now()) @map("created_at")
  
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@map("api_call_logs")
}
```

**索引：**
- PRIMARY KEY (`id`)
- INDEX (`endpoint`, `created_at`)
- INDEX (`user_id`, `created_at`)
- INDEX (`status_code`, `created_at`)

### 2.8 LLM调用日志表 (llm_call_logs)

```prisma
model LlmCallLog {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  userName       String   @map("user_name")  // 冗余存储，避免用户删除后无法查看
  accountBookId  String?  @map("account_book_id")
  accountBookName String? @map("account_book_name") // 冗余存储
  provider       String   // LLM服务提供商
  model          String   // 使用的模型
  promptTokens   Int      @map("prompt_tokens")
  completionTokens Int    @map("completion_tokens")
  totalTokens    Int      @map("total_tokens")
  userMessage    String   @map("user_message") @db.Text
  assistantMessage String? @map("assistant_message") @db.Text
  systemPrompt   String?  @map("system_prompt") @db.Text
  isSuccess      Boolean  @map("is_success")
  errorMessage   String?  @map("error_message") @db.Text
  duration       Int      // 响应时间（毫秒）
  cost           Decimal? @db.Decimal(10, 6) // 调用成本（如果有）
  createdAt      DateTime @default(now()) @map("created_at")
  
  user           User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  accountBook    AccountBook?  @relation(fields: [accountBookId], references: [id], onDelete: SetNull)
  
  @@map("llm_call_logs")
}
```

**字段说明：**
- `userId/userName`: 调用用户信息，userName冗余存储避免用户删除后无法查看
- `accountBookId/accountBookName`: 关联的账本信息
- `provider/model`: LLM服务提供商和模型信息
- `promptTokens/completionTokens/totalTokens`: token使用详情
- `userMessage`: 用户发送的消息
- `assistantMessage`: AI回复的消息
- `systemPrompt`: 系统提示词
- `isSuccess`: 调用是否成功
- `errorMessage`: 错误信息（如果失败）
- `duration`: 响应时间
- `cost`: 调用成本（可选）

**索引：**
- PRIMARY KEY (`id`)
- INDEX (`user_id`, `created_at`)
- INDEX (`account_book_id`, `created_at`)
- INDEX (`provider`, `model`, `created_at`)
- INDEX (`is_success`, `created_at`)
- INDEX (`created_at`) -- 用于时间范围查询

## 3. 现有表结构扩展

### 3.1 User表扩展

需要为User表添加关联关系：

```prisma
model User {
  // ... 现有字段
  
  // 新增关联
  accessLogs      AccessLog[]
  apiCallLogs     ApiCallLog[]
  llmCallLogs     LlmCallLog[]
  announcementReadings AnnouncementRead[]
  
  // ... 现有关联
}

model AccountBook {
  // ... 现有字段
  
  // 新增关联
  llmCallLogs     LlmCallLog[]
  
  // ... 现有关联
}
```

## 4. 数据库索引策略

### 4.1 性能关键索引

1. **公告查询索引**
   ```sql
   CREATE INDEX idx_announcements_status_published ON announcements(status, published_at DESC);
   CREATE INDEX idx_announcements_type_priority ON announcements(type, priority DESC);
   ```

2. **已读状态查询索引**
   ```sql
   CREATE UNIQUE INDEX idx_announcement_reads_user_announcement ON announcement_reads(user_id, announcement_id);
   CREATE INDEX idx_announcement_reads_announcement ON announcement_reads(announcement_id);
   ```

3. **统计查询索引**
   ```sql
   CREATE UNIQUE INDEX idx_system_stats_date_metric ON system_stats(date, metric);
   CREATE INDEX idx_system_stats_metric_date ON system_stats(metric, date DESC);
   ```

4. **日志查询索引**
   ```sql
   CREATE INDEX idx_access_logs_user_time ON access_logs(user_id, created_at DESC);
   CREATE INDEX idx_access_logs_path_time ON access_logs(path, created_at DESC);
   CREATE INDEX idx_api_call_logs_endpoint_time ON api_call_logs(endpoint, created_at DESC);
   CREATE INDEX idx_llm_call_logs_user_time ON llm_call_logs(user_id, created_at DESC);
   CREATE INDEX idx_llm_call_logs_account_book_time ON llm_call_logs(account_book_id, created_at DESC);
   CREATE INDEX idx_llm_call_logs_provider_model ON llm_call_logs(provider, model, created_at DESC);
   ```

### 4.2 分区策略

对于大量数据的日志表，考虑按时间分区：

```sql
-- 按月分区访问日志表
CREATE TABLE access_logs_y2024m01 PARTITION OF access_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 按月分区API调用日志表
CREATE TABLE api_call_logs_y2024m01 PARTITION OF api_call_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 按月分区LLM调用日志表
CREATE TABLE llm_call_logs_y2024m01 PARTITION OF llm_call_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## 5. 数据迁移策略

### 5.1 迁移脚本

```sql
-- 1. 创建新表
-- 执行上述CREATE TABLE语句

-- 2. 初始化系统配置
INSERT INTO system_configs (key, value, type, category, description) VALUES
('registration_enabled', 'true', 'BOOLEAN', 'user', '是否允许用户注册'),
('llm_enabled', 'false', 'BOOLEAN', 'llm', '是否启用全局LLM服务'),
('llm_config', '{}', 'JSON', 'llm', '全局LLM配置');

-- 3. 创建默认管理员账号
INSERT INTO admins (username, password_hash, role) VALUES
('admin', '$2b$10$encrypted_password_hash', 'SUPER_ADMIN');
```

### 5.2 Prisma迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name add_admin_system

# 应用迁移
npx prisma migrate deploy

# 生成客户端
npx prisma generate
```

## 6. 数据清理策略

### 6.1 日志数据清理

```sql
-- 清理30天前的访问日志
DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理30天前的API调用日志
DELETE FROM api_call_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理30天前的LLM调用日志
DELETE FROM llm_call_logs WHERE created_at < NOW() - INTERVAL '30 days';

-- 清理已过期的公告已读记录
DELETE FROM announcement_reads 
WHERE announcement_id IN (
  SELECT id FROM announcements 
  WHERE status = 'ARCHIVED' 
  AND updated_at < NOW() - INTERVAL '90 days'
);
```

### 6.2 定时清理任务

```javascript
// 使用node-cron定时清理
const cron = require('node-cron');

// 每天凌晨2点清理过期数据
cron.schedule('0 2 * * *', async () => {
  await cleanupExpiredLogs();
  await cleanupExpiredAnnouncements();
});
```

## 7. 数据安全

### 7.1 敏感数据加密

- 管理员密码使用bcrypt加密
- 系统配置中的敏感信息使用AES加密
- API密钥等敏感配置单独存储

### 7.2 数据备份

```sql
-- 每日备份关键表
pg_dump -t admins -t system_configs -t announcements dbname > admin_backup.sql
```

## 8. 性能优化建议

### 8.1 查询优化

1. **公告列表查询优化**
   - 使用复合索引加速排序
   - 限制返回字段，避免全表扫描
   - 使用分页查询，避免大量数据传输

2. **已读状态查询优化**
   - 使用LEFT JOIN优化未读状态查询
   - 考虑使用Redis缓存热点公告的已读状态

3. **统计查询优化**
   - 使用预聚合数据减少实时计算
   - 定时任务更新统计数据
   - 使用物化视图存储复杂统计结果

### 8.2 缓存策略

```javascript
// Redis缓存策略
const cacheKeys = {
  systemConfig: 'system:config:*',
  announcementList: 'announcement:list:*',
  userStats: 'stats:user:*',
  dailyStats: 'stats:daily:*'
};

// 缓存过期时间
const cacheTTL = {
  systemConfig: 3600,    // 1小时
  announcementList: 300, // 5分钟
  userStats: 1800,       // 30分钟
  dailyStats: 3600       // 1小时
};
```

## 9. 监控和告警

### 9.1 数据库监控指标

- 表大小增长趋势
- 索引使用效率
- 慢查询监控
- 连接数监控

### 9.2 业务监控指标

- 公告发布数量
- 用户活跃度
- API调用成功率
- 管理员登录频率

---

这个数据库设计支持管理系统的所有核心功能，同时考虑了性能、扩展性和数据安全等方面。建议在实施过程中根据实际使用情况进行调优。 