# 计划任务系统使用指南

## 概述

计划任务系统允许管理员在后台自动执行定时任务，支持Shell脚本、SQL脚本和Node.js脚本。系统使用Cron表达式来定义执行时间，并自动捕获执行日志。

## 功能特性

- ✅ 支持多种脚本类型（Shell、SQL、Node.js）
- ✅ 灵活的Cron表达式时间配置
- ✅ 手动执行和自动执行
- ✅ 完整的执行日志记录
- ✅ 启用/禁用任务控制
- ✅ 执行历史查看
- ✅ 标准输出和错误输出捕获

## 脚本路径配置

### Docker环境（生产环境）

在Docker容器中运行时，脚本路径有两种配置方式：

#### 1. 预定义脚本（推荐用于生产环境）

将脚本放在 `docker/scripts/` 目录下，这些脚本会在Docker构建时复制到容器内的 `/app/scripts/scheduled/` 目录。

**宿主机路径**：
```
docker/scripts/fix_budget/run_budget_fix.sh
```

**容器内路径**（在管理界面使用）：
```
/app/scripts/scheduled/fix_budget/run_budget_fix.sh
```

**优点**：
- 脚本随镜像打包，版本一致性好
- 适合生产环境的固定任务
- 不需要额外的Volume挂载

#### 2. 自定义脚本（推荐用于临时任务）

将脚本放在 `docker/scripts/custom/` 目录下，这些脚本通过Docker Volume挂载到容器内的 `/app/scripts/custom/` 目录。

**宿主机路径**：
```
docker/scripts/custom/my_task.sh
```

**容器内路径**（在管理界面使用）：
```
/app/scripts/custom/my_task.sh
```

**优点**：
- 无需重新构建镜像
- 适合临时任务和测试
- 可以随时添加或修改脚本

### 开发环境（本地运行）

在本地开发环境中，可以直接使用绝对路径：

```
/Users/jackson/Documents/Code/zhiweijz/docker/scripts/fix_budget/run_budget_fix.sh
```

## 使用流程

### 1. 准备脚本

#### Shell脚本示例

```bash
#!/bin/bash
# 文件：docker/scripts/custom/example.sh

set -e  # 遇到错误立即退出

echo "开始执行任务..."
echo "当前时间: $(date)"

# 您的业务逻辑
# ...

echo "任务执行完成"
exit 0
```

**设置执行权限**：
```bash
chmod +x docker/scripts/custom/example.sh
```

#### SQL脚本示例

```sql
-- 文件：docker/scripts/custom/cleanup.sql

BEGIN;

-- 清理90天前的日志
DELETE FROM task_execution_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 显示清理结果
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已清理 % 条日志记录', deleted_count;
END $$;

COMMIT;
```

#### Node.js脚本示例

```javascript
// 文件：docker/scripts/custom/report.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始生成报告...');
  
  const userCount = await prisma.user.count();
  const transactionCount = await prisma.transaction.count();
  
  console.log(`用户总数: ${userCount}`);
  console.log(`交易总数: ${transactionCount}`);
  
  console.log('报告生成完成');
}

main()
  .catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

### 2. 在管理界面创建任务

访问管理后台：`http://your-domain/admin/scheduled-tasks`

点击"创建任务"按钮，填写以下信息：

- **任务名称**：例如"每日数据清理"
- **任务描述**：详细说明任务的作用
- **脚本类型**：选择 `shell`、`sql` 或 `node`
- **脚本路径**：
  - Docker环境：`/app/scripts/custom/cleanup.sh`
  - 开发环境：绝对路径
- **Cron表达式**：例如 `0 2 * * *`（每天凌晨2点）
- **启用状态**：选择是否立即启用

### 3. Cron表达式说明

格式：`分 时 日 月 周`

| 字段 | 允许值 | 允许的特殊字符 |
|------|--------|----------------|
| 分钟 | 0-59 | * , - / |
| 小时 | 0-23 | * , - / |
| 日期 | 1-31 | * , - / |
| 月份 | 1-12 | * , - / |
| 星期 | 0-7 (0和7都表示周日) | * , - / |

**常用示例**：

```
0 2 * * *        # 每天凌晨2点
0 */6 * * *      # 每6小时执行一次
0 0 1 * *        # 每月1号凌晨执行
0 0 * * 0        # 每周日凌晨执行
*/30 * * * *     # 每30分钟执行一次
0 9-17 * * 1-5   # 工作日的9点到17点，每小时执行
```

**快捷选择**（管理界面提供）：
- 每分钟：`* * * * *`
- 每小时：`0 * * * *`
- 每天：`0 0 * * *`
- 每周：`0 0 * * 0`
- 每月：`0 0 1 * *`

### 4. 手动执行任务

在任务列表中，点击任务的"执行"按钮可以立即执行任务，无需等待Cron触发。

手动执行会：
- 立即运行脚本
- 记录执行日志
- 标记为"手动执行"
- 不影响自动执行计划

### 5. 查看执行日志

点击任务的"查看日志"按钮，可以查看：

- 执行状态（成功/失败）
- 执行时间和耗时
- 标准输出内容
- 错误输出内容
- 退出码
- 触发方式（自动/手动）

## 环境变量

脚本执行时可以访问以下环境变量：

```bash
DATABASE_URL              # 数据库连接字符串
NODE_ENV                  # 运行环境（production/development）
DOCKER_ENV                # Docker环境标识（true/false）
JWT_SECRET                # JWT密钥
PORT                      # 服务端口
# ... 其他在docker-compose.yml中配置的环境变量
```

### 在Shell脚本中使用

```bash
#!/bin/bash

# 连接数据库
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
  echo "运行在Docker容器中"
fi
```

### 在Node.js脚本中使用

```javascript
const databaseUrl = process.env.DATABASE_URL;
const isDocker = process.env.DOCKER_ENV === 'true';

console.log(`数据库: ${databaseUrl}`);
console.log(`Docker环境: ${isDocker}`);
```

## 最佳实践

### 1. 错误处理

**Shell脚本**：
```bash
#!/bin/bash
set -e  # 遇到错误立即退出

# 使用trap捕获错误
trap 'echo "脚本执行失败"; exit 1' ERR

# 您的代码...
```

**Node.js脚本**：
```javascript
async function main() {
  try {
    // 您的代码...
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);  // 非零退出码表示失败
  }
}
```

### 2. 日志输出

- 使用 `echo` 或 `console.log` 输出关键信息
- 日志会自动捕获并存储（限制50KB）
- 包含时间戳和执行上下文

### 3. 执行时间选择

- 避免在业务高峰期执行重型任务
- 数据库操作建议在凌晨执行
- 考虑任务执行时长，避免重叠

### 4. 脚本权限

- Shell和Node.js脚本需要执行权限（`chmod +x`）
- SQL脚本不需要执行权限
- 容器内以 `nodejs` 用户运行，注意文件权限

### 5. 数据库操作

**SQL脚本**：
- 使用事务（BEGIN/COMMIT）
- 添加错误处理
- 使用 `RAISE NOTICE` 输出日志

**Shell脚本中执行SQL**：
```bash
psql "$DATABASE_URL" <<EOF
BEGIN;
-- 您的SQL语句
COMMIT;
EOF
```

## 故障排查

### 脚本无法执行

**问题**：任务显示失败，日志显示"找不到文件"

**解决方案**：
1. 检查脚本路径是否正确（使用容器内路径）
2. 检查脚本文件是否存在
3. 检查脚本是否有执行权限

### 数据库连接失败

**问题**：SQL脚本或数据库操作失败

**解决方案**：
1. 检查 `DATABASE_URL` 环境变量
2. 在Docker环境中，数据库主机名是 `postgres`（服务名）
3. 确保数据库服务正常运行

### 日志被截断

**问题**：执行日志不完整

**原因**：日志输出超过50KB限制

**解决方案**：
1. 减少日志输出量
2. 将详细日志写入文件
3. 只输出关键信息到标准输出

### 任务未按时执行

**问题**：Cron表达式配置错误

**解决方案**：
1. 验证Cron表达式格式
2. 检查时区设置（默认 Asia/Shanghai）
3. 查看服务器日志确认调度状态

## 安全注意事项

1. **脚本权限**：只有管理员可以创建和修改任务
2. **路径验证**：系统会验证脚本路径的合法性
3. **只读挂载**：自定义脚本目录以只读模式挂载
4. **日志限制**：日志输出有大小限制，防止磁盘占用
5. **用户隔离**：容器内以非root用户运行

## 示例：预算修复任务

系统预置了一个预算修复任务示例：

**任务名称**：预算修复脚本

**脚本路径**：`/app/scripts/scheduled/fix_budget/run_budget_fix.sh`

**Cron表达式**：`0 2 1 * *`（每月1号凌晨2点）

**功能**：
- 创建缺失的月度预算
- 修复预算结转历史记录
- 更新预算结转金额

**启用方法**：
1. 访问管理后台的计划任务页面
2. 找到"预算修复脚本"任务
3. 点击启用开关
4. 可以先手动执行测试

## API接口

如需通过API管理计划任务，参考以下端点：

```
GET    /api/admin/scheduled-tasks          # 获取任务列表
POST   /api/admin/scheduled-tasks          # 创建任务
GET    /api/admin/scheduled-tasks/:id      # 获取任务详情
PUT    /api/admin/scheduled-tasks/:id      # 更新任务
DELETE /api/admin/scheduled-tasks/:id      # 删除任务
POST   /api/admin/scheduled-tasks/:id/execute  # 手动执行
PATCH  /api/admin/scheduled-tasks/:id/toggle   # 启用/禁用
GET    /api/admin/scheduled-tasks/logs/list    # 获取日志列表
GET    /api/admin/scheduled-tasks/logs/:id     # 获取日志详情
```

所有接口需要管理员认证。

## 更多帮助

- 查看Docker日志：`docker logs zhiweijz-backend`
- 查看数据库迁移：`npm run migrate:status`
- 自定义脚本说明：`docker/scripts/custom/README.md`

