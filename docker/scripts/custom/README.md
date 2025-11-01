# 自定义计划任务脚本目录

此目录用于存放自定义的计划任务脚本，这些脚本会通过Docker Volume挂载到容器内的 `/app/scripts/custom/` 目录。

## 使用方法

### 1. 添加自定义脚本

将您的脚本文件放置在此目录下：

```bash
# 示例：添加一个Shell脚本
docker/scripts/custom/my_task.sh

# 示例：添加一个SQL脚本
docker/scripts/custom/cleanup_old_data.sql

# 示例：添加一个Node.js脚本
docker/scripts/custom/send_report.js
```

### 2. 设置脚本权限

确保Shell脚本和Node.js脚本有执行权限：

```bash
chmod +x docker/scripts/custom/my_task.sh
chmod +x docker/scripts/custom/send_report.js
```

### 3. 在管理界面创建计划任务

访问管理后台的"计划任务"页面，创建新任务时：

- **脚本类型**：选择 `shell`、`sql` 或 `node`
- **脚本路径**：使用容器内路径 `/app/scripts/custom/your_script.sh`
- **Cron表达式**：设置执行时间，例如 `0 2 * * *`（每天凌晨2点）

## 脚本路径说明

### 容器内路径映射

| 宿主机路径 | 容器内路径 | 说明 |
|-----------|-----------|------|
| `docker/scripts/custom/` | `/app/scripts/custom/` | 自定义脚本（Volume挂载） |
| `docker/scripts/fix_budget/` | `/app/scripts/scheduled/fix_budget/` | 预定义脚本（构建时复制） |

### 路径使用示例

**自定义脚本**（推荐用于临时或测试脚本）：
```
/app/scripts/custom/my_task.sh
```

**预定义脚本**（推荐用于生产环境的固定任务）：
```
/app/scripts/scheduled/fix_budget/run_budget_fix.sh
```

## 脚本编写规范

### Shell脚本示例

```bash
#!/bin/bash
# 文件：docker/scripts/custom/example.sh

set -e  # 遇到错误立即退出

echo "开始执行任务..."

# 您的业务逻辑
# ...

echo "任务执行完成"
exit 0
```

### SQL脚本示例

```sql
-- 文件：docker/scripts/custom/example.sql

BEGIN;

-- 您的SQL语句
DELETE FROM old_table WHERE created_at < NOW() - INTERVAL '90 days';

COMMIT;
```

### Node.js脚本示例

```javascript
// 文件：docker/scripts/custom/example.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始执行任务...');
  
  // 您的业务逻辑
  const result = await prisma.user.count();
  console.log(`用户总数: ${result}`);
  
  console.log('任务执行完成');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## 环境变量

脚本执行时可以访问以下环境变量：

- `DATABASE_URL`：数据库连接字符串
- `NODE_ENV`：运行环境（production）
- `DOCKER_ENV`：Docker环境标识（true）
- 其他在 `docker-compose.yml` 中配置的环境变量

### 在Shell脚本中使用环境变量

```bash
#!/bin/bash

# 使用数据库连接
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# 检查环境
if [ "$NODE_ENV" = "production" ]; then
  echo "生产环境"
fi
```

## 注意事项

1. **脚本路径**：在管理界面创建任务时，必须使用容器内路径（`/app/scripts/custom/...`）
2. **执行权限**：Shell和Node.js脚本需要有执行权限（`chmod +x`）
3. **错误处理**：脚本应该有适当的错误处理和退出码
4. **日志输出**：使用 `echo` 或 `console.log` 输出日志，系统会自动捕获
5. **数据库访问**：SQL脚本会自动使用环境变量中的数据库连接
6. **只读挂载**：此目录以只读模式挂载到容器，脚本无法修改此目录内容

## 故障排查

### 脚本无法执行

1. 检查脚本路径是否正确（使用容器内路径）
2. 检查脚本是否有执行权限
3. 查看执行日志中的错误信息

### 找不到命令

容器内可用的命令：
- `bash`、`sh`
- `node`、`npm`
- `psql`（PostgreSQL客户端）
- `curl`

如需其他命令，需要修改 `server/Dockerfile` 安装相应工具。

### 数据库连接失败

确保使用正确的数据库主机名：
- 在容器内，数据库主机名是 `postgres`（服务名）
- 环境变量 `DATABASE_URL` 已经配置好，直接使用即可

## 示例：数据清理任务

创建一个每周清理90天前日志的任务：

**1. 创建脚本** `docker/scripts/custom/cleanup_logs.sql`：

```sql
BEGIN;

DELETE FROM task_execution_logs 
WHERE created_at < NOW() - INTERVAL '90 days';

COMMIT;
```

**2. 在管理界面创建任务**：

- 名称：清理旧日志
- 描述：每周清理90天前的执行日志
- 脚本类型：sql
- 脚本路径：`/app/scripts/custom/cleanup_logs.sql`
- Cron表达式：`0 3 * * 0`（每周日凌晨3点）
- 启用状态：是

## 更多帮助

如有问题，请查看：
- 管理后台的执行日志
- Docker容器日志：`docker logs zhiweijz-backend`
- 计划任务服务文档：`docs/backend/scheduled-tasks.md`

