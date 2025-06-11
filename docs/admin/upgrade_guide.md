# 数据库升级指南

## 概述

本文档描述如何将"只为记账"系统从 v1.0.0 升级到 v1.1.0，新版本增加了管理员功能、公告系统、日志记录等特性。升级过程支持本地环境和Docker环境，确保数据完全不丢失。

## 升级内容

### 新增功能
- 🔐 **管理员认证系统**：独立的管理员账号体系
- ⚙️ **系统配置管理**：可通过管理界面配置系统参数
- 📢 **公告系统**：向用户发送通知和公告
- 📊 **日志记录系统**：记录用户访问、API调用、LLM使用等日志
- 📈 **统计聚合**：提供详细的系统使用统计

### 数据库变更
- 新增 8 个数据表
- 新增 3 个枚举类型
- 支持表分区（日志表按月分区）
- 版本控制表用于跟踪升级历史

## 升级前准备

### 1. 检查当前版本
```bash
# 查看当前运行的版本
docker-compose ps
# 或检查应用日志
docker-compose logs app | grep version
```

### 2. 备份数据
**强烈建议在升级前手动创建数据库备份：**

```bash
# Docker环境备份
docker-compose exec db pg_dump -U postgres -d zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql

# 本地环境备份
pg_dump -U postgres -d zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 确保足够的磁盘空间
升级过程中会创建备份文件，确保至少有当前数据库大小 2 倍的可用空间。

## 升级方式

### 方式一：Docker 环境升级（推荐）

#### 自动升级脚本
```bash
# 下载并运行升级脚本
chmod +x server/scripts/docker-upgrade.sh
./server/scripts/docker-upgrade.sh
```

#### 自定义升级
```bash
# 自定义管理员密码
DEFAULT_ADMIN_PASSWORD=your_secure_password ./server/scripts/docker-upgrade.sh

# 指定不同的compose文件
./server/scripts/docker-upgrade.sh -f docker-compose.prod.yml

# 完整的自定义升级
./server/scripts/docker-upgrade.sh \
  -f docker-compose.prod.yml \
  -s web \
  -d postgres \
  -b ./custom_backups
```

#### 手动升级步骤
如果不想使用自动脚本，可以手动执行以下步骤：

```bash
# 1. 停止应用服务（保持数据库运行）
docker-compose stop app

# 2. 拉取最新镜像
docker-compose pull

# 3. 启动数据库服务
docker-compose up -d db

# 4. 运行升级脚本
docker-compose run --rm \
  -e DEFAULT_ADMIN_PASSWORD=zhiweijz2025 \
  app node /app/scripts/upgrade-database.js

# 5. 启动所有服务
docker-compose up -d

# 6. 检查服务状态
docker-compose ps
```

### 方式二：本地环境升级

#### 准备环境
```bash
cd server
npm install
```

#### 执行升级
```bash
# 1. 设置环境变量
export DATABASE_URL="postgresql://username:password@localhost:5432/zhiweijz"
export DEFAULT_ADMIN_PASSWORD="zhiweijz2025"

# 2. 运行升级脚本
node scripts/upgrade-database.js

# 3. 运行Prisma迁移（如果需要）
npx prisma migrate deploy

# 4. 重启应用服务
pm2 restart all  # 如果使用PM2
# 或直接重启Node.js进程
```

## 升级验证

### 1. 检查数据库表
升级完成后，验证新表是否正确创建：

```sql
-- 连接到数据库
psql -U postgres -d zhiweijz

-- 检查新增表
\dt *admin*
\dt *announcement*
\dt *log*
\dt system_configs
\dt statistics_aggregations
\dt schema_versions

-- 检查管理员账号
SELECT username, role, is_active FROM admins;
```

### 2. 检查应用服务
```bash
# Docker环境
docker-compose ps
docker-compose logs app

# 本地环境
curl http://localhost:3000/api/health
```

### 3. 访问管理页面
- 打开浏览器访问：`http://your-domain/admin`
- 使用默认账号登录：
  - 用户名：`admin`
  - 密码：`zhiweijz2025`（或你设置的自定义密码）

### 4. 功能验证清单
- [ ] 管理员登录正常
- [ ] 仪表盘数据显示正常
- [ ] 用户管理功能可用
- [ ] 系统配置可以修改
- [ ] 公告功能正常
- [ ] 日志记录正常
- [ ] 原有功能未受影响

## 回滚方案

如果升级后发现问题，可以回滚到升级前的状态：

### Docker环境回滚
```bash
# 1. 停止所有服务
docker-compose down

# 2. 恢复数据库备份
docker-compose up -d db
docker-compose exec -T db psql -U postgres -d zhiweijz < backup_20240101_120000.sql

# 3. 切换到旧版本镜像
# 修改docker-compose.yml中的镜像标签为旧版本
docker-compose up -d
```

### 本地环境回滚
```bash
# 1. 停止应用
pm2 stop all

# 2. 恢复数据库
psql -U postgres -d zhiweijz < backup_20240101_120000.sql

# 3. 切换到旧版本代码
git checkout v1.0.0

# 4. 重启应用
npm install
pm2 start all
```

## 环境变量配置

升级后，可以通过以下环境变量进行配置：

```bash
# 管理员设置
DEFAULT_ADMIN_PASSWORD=zhiweijz2025    # 默认管理员密码
ADMIN_SESSION_TIMEOUT=86400            # 管理员会话超时时间（秒）

# 备份设置
BACKUP_ENABLED=true                    # 是否启用自动备份
BACKUP_RETENTION_DAYS=30               # 备份保留天数

# 日志设置
LOG_LEVEL=info                         # 日志级别
ACCESS_LOG_ENABLED=true                # 是否记录访问日志
API_LOG_ENABLED=true                   # 是否记录API调用日志
LLM_LOG_ENABLED=true                   # 是否记录LLM调用日志

# 性能设置
LOG_PARTITION_ENABLED=true             # 是否启用日志分区
STATISTICS_AGGREGATION_ENABLED=true   # 是否启用统计聚合
```

## 性能优化

### 日志表分区管理
升级后，日志表会按月自动分区。可以通过以下脚本管理分区：

```sql
-- 创建下个月的分区
DO $$
DECLARE
    current_month_start DATE;
    next_month_start DATE;
    table_suffix TEXT;
BEGIN
    current_month_start := DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month');
    next_month_start := current_month_start + INTERVAL '1 month';
    table_suffix := TO_CHAR(current_month_start, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS access_logs_%s PARTITION OF access_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
    EXECUTE format('CREATE TABLE IF NOT EXISTS api_call_logs_%s PARTITION OF api_call_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
    EXECUTE format('CREATE TABLE IF NOT EXISTS llm_call_logs_%s PARTITION OF llm_call_logs FOR VALUES FROM (%L) TO (%L)', 
                   table_suffix, current_month_start, next_month_start);
END $$;

-- 删除过期分区
DROP TABLE IF EXISTS access_logs_2023_01;
DROP TABLE IF EXISTS api_call_logs_2023_01;
DROP TABLE IF EXISTS llm_call_logs_2023_01;
```

### 定期清理
建议设置定期任务清理过期数据：

```bash
# 添加到crontab
# 每天凌晨3点清理30天前的日志
0 3 * * * docker-compose exec -T db psql -U postgres -d zhiweijz -c "DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '30 days';"
```

## 故障排除

### 常见问题

#### 1. 升级脚本运行失败
**问题**：升级脚本报错退出
**解决方案**：
- 检查数据库连接是否正常
- 确保有足够的磁盘空间
- 查看详细错误日志
- 手动执行SQL迁移脚本

#### 2. 管理员账号无法登录
**问题**：无法使用默认账号登录管理页面
**解决方案**：
```sql
-- 检查管理员账号是否存在
SELECT * FROM admins WHERE username = 'admin';

-- 重置管理员密码
UPDATE admins SET password_hash = '$2b$10$K8YZ0lQnl1I3.EGK.8B0qeLYJ6.xD7AKvFqGm8LkJ2wL3GcB5HvOK' 
WHERE username = 'admin';
```

#### 3. 新功能页面404错误
**问题**：访问 `/admin` 返回404
**解决方案**：
- 确认前端代码已正确更新
- 检查路由配置
- 重启前端服务

#### 4. 日志记录不工作
**问题**：管理页面看不到访问日志
**解决方案**：
- 检查中间件是否正确配置
- 确认环境变量设置正确
- 查看应用日志中的错误信息

### 联系支持

如果遇到无法解决的问题：
1. 收集相关日志信息
2. 记录具体的错误步骤
3. 提供环境信息（操作系统、Docker版本等）
4. 通过GitHub Issues或邮件联系支持

## 升级后的新功能使用

### 管理员功能
- 访问 `/admin` 进入管理界面
- 默认账号：`admin` / `zhiweijz2025`
- 可以管理用户、系统配置、公告等

### 系统配置
- 在管理界面的"系统配置"页面修改全局设置
- 支持用户注册开关、LLM全局配置等

### 公告系统
- 在"公告管理"页面创建和发布公告
- 用户在前端页面会收到新公告通知

### 数据统计
- 在仪表盘查看系统使用统计
- 支持用户数量、交易记录、API调用等指标

---

**注意**：升级是一个重要操作，建议在非生产时间进行，并确保有完整的数据备份。如有疑问，请仔细阅读本指南或联系技术支持。 