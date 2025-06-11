# Docker环境生产数据修复指南

## 🐳 Docker环境特殊考虑

### 环境差异
- **数据库连接**：容器内使用 `postgres:5432`，外部使用 `localhost:5432`
- **文件系统**：脚本在容器内执行，报告文件需要复制到宿主机
- **网络隔离**：所有服务在Docker网络内通信
- **权限管理**：容器内外权限可能不同

## 📋 完整操作流程

### 1. 环境准备

#### 1.1 确保服务运行
```bash
# 检查服务状态
docker-compose -f docker/docker-compose.yml ps

# 启动所有服务（如果未运行）
docker-compose -f docker/docker-compose.yml up -d

# 检查健康状态
docker-compose -f docker/docker-compose.yml ps
```

#### 1.2 设置脚本权限
```bash
# 给脚本执行权限
chmod +x docker/scripts/run-production-scripts.sh
```

### 2. 数据备份

#### 2.1 自动备份（推荐）
```bash
# 使用脚本自动备份
./docker/scripts/run-production-scripts.sh backup
```

#### 2.2 手动备份
```bash
# 方法1：通过容器备份
docker-compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U zhiweijz -d zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql

# 方法2：直接连接备份（如果端口映射可用）
pg_dump -h localhost -p 5432 -U zhiweijz -d zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 数据分析

```bash
# 分析生产数据现状
./docker/scripts/run-production-scripts.sh analysis
```

### 4. 修复执行

#### 4.1 试运行（必须）
```bash
# 小批量试运行
./docker/scripts/run-production-scripts.sh fix --batch-size=100 --max-batches=1 --dry-run

# 完整试运行
./docker/scripts/run-production-scripts.sh fix --batch-size=500 --dry-run
```

#### 4.2 正式修复
```bash
# 分批修复（推荐）
./docker/scripts/run-production-scripts.sh fix --batch-size=500 --execute

# 谨慎模式（限制批次）
./docker/scripts/run-production-scripts.sh fix --batch-size=200 --max-batches=5 --execute
```

### 5. 报告管理

#### 5.1 复制报告文件
```bash
# 复制所有修复报告到本地
./docker/scripts/run-production-scripts.sh copy-reports

# 查看报告文件
ls -la ./reports/
```

#### 5.2 手动复制特定文件
```bash
# 列出容器内的报告文件
docker-compose -f docker/docker-compose.yml exec zhiweijz-backend \
  find /app -name "fix-report-*.json"

# 复制特定文件
docker cp zhiweijz-backend:/app/fix-report-xxx.json ./
```

### 6. 回滚操作

#### 6.1 试运行回滚
```bash
./docker/scripts/run-production-scripts.sh rollback \
  --report-file=fix-report-xxx.json --dry-run
```

#### 6.2 执行回滚
```bash
./docker/scripts/run-production-scripts.sh rollback \
  --report-file=fix-report-xxx.json --execute
```

## 🔧 故障排除

### 常见问题

#### 1. 容器未运行
```bash
# 错误：❌ 后端容器未运行
# 解决：启动服务
docker-compose -f docker/docker-compose.yml up -d
```

#### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose -f docker/docker-compose.yml logs postgres

# 检查数据库连接
docker-compose -f docker/docker-compose.yml exec postgres \
  pg_isready -U zhiweijz -d zhiweijz
```

#### 3. 脚本执行权限
```bash
# 给脚本执行权限
chmod +x docker/scripts/run-production-scripts.sh
```

#### 4. 报告文件找不到
```bash
# 检查容器内文件
docker-compose -f docker/docker-compose.yml exec zhiweijz-backend \
  ls -la /app/fix-report-*.json

# 复制到本地
./docker/scripts/run-production-scripts.sh copy-reports
```

### 高级操作

#### 1. 直接进入容器执行
```bash
# 进入后端容器
docker-compose -f docker/docker-compose.yml exec zhiweijz-backend bash

# 在容器内执行脚本
npx ts-node src/scripts/production-data-analysis.ts
npx ts-node src/scripts/production-batch-fix.ts --batch-size=500 --dry-run
```

#### 2. 查看实时日志
```bash
# 查看后端日志
docker-compose -f docker/docker-compose.yml logs -f zhiweijz-backend

# 查看数据库日志
docker-compose -f docker/docker-compose.yml logs -f postgres
```

#### 3. 监控资源使用
```bash
# 查看容器资源使用
docker stats zhiweijz-backend zhiweijz-postgres

# 查看容器详细信息
docker inspect zhiweijz-backend
```

## ⚠️ 重要注意事项

### 1. 环境变量
确保以下环境变量正确设置：
- `DB_NAME`：数据库名称
- `DB_USER`：数据库用户
- `DB_PASSWORD`：数据库密码
- `DATABASE_URL`：完整数据库连接字符串

### 2. 网络连接
- 脚本在容器内执行，使用容器间网络通信
- 数据库地址为 `postgres:5432`，不是 `localhost:5432`

### 3. 文件持久化
- 修复报告文件生成在容器内
- 需要手动复制到宿主机保存
- 建议定期备份重要报告文件

### 4. 性能考虑
- Docker环境可能有额外的性能开销
- 建议适当调小批次大小
- 监控容器资源使用情况

### 5. 安全考虑
- 生产环境操作需要额外谨慎
- 确保备份完整且可恢复
- 在业务低峰期执行
- 准备应急回滚方案

## 📊 监控和验证

### 1. 执行前检查
```bash
# 检查服务健康状态
docker-compose -f docker/docker-compose.yml ps
docker-compose -f docker/docker-compose.yml exec zhiweijz-backend curl -f http://localhost:3000/api/health

# 检查数据库连接
docker-compose -f docker/docker-compose.yml exec postgres pg_isready -U zhiweijz -d zhiweijz
```

### 2. 执行中监控
```bash
# 监控容器资源
docker stats zhiweijz-backend zhiweijz-postgres

# 查看实时日志
docker-compose -f docker/docker-compose.yml logs -f zhiweijz-backend
```

### 3. 执行后验证
```bash
# 验证修复结果
./docker/scripts/run-production-scripts.sh analysis

# 检查应用功能
curl -f http://localhost/api/health
```

这个指南确保了在Docker环境下安全、可靠地执行生产数据修复操作。 