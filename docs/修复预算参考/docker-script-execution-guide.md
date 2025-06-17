# 在 Docker 容器中执行预算修复脚本指南

## 前提条件

确保您的容器服务正在运行：
```bash
cd docker
docker-compose up -d
```

## 方法一：直接在运行的容器中执行（推荐）

### 1. 将 CSV 文件复制到容器中

```bash
# 将 CSV 文件复制到后端容器
docker cp ../docs/详细导入报告_2025-06-16.csv zhiweijz-backend:/app/data/

# 或者复制到临时目录
docker cp ../docs/详细导入报告_2025-06-16.csv zhiweijz-backend:/tmp/
```

### 2. 进入容器执行脚本

```bash
# 进入后端容器
docker exec -it zhiweijz-backend /bin/sh

# 在容器内执行脚本（试运行）
cd /app
npm run ts-node src/scripts/fix-budget-assignment.ts /app/data/详细导入报告_2025-06-16.csv --dry-run

# 或者直接执行
npx ts-node src/scripts/fix-budget-assignment.ts /app/data/详细导入报告_2025-06-16.csv --dry-run
```

### 3. 实际执行（移除 --dry-run）

```bash
# 确认试运行结果正确后，执行实际操作
npx ts-node src/scripts/fix-budget-assignment.ts /app/data/详细导入报告_2025-06-16.csv
```

## 方法二：一键执行（无需进入容器）

### 1. 复制文件并执行脚本

```bash
# 从项目根目录执行
cd docker

# 复制文件到容器
docker cp ../docs/详细导入报告_2025-06-16.csv zhiweijz-backend:/tmp/

# 直接在容器中执行脚本（试运行）
docker exec zhiweijz-backend npx ts-node src/scripts/fix-budget-assignment.ts /tmp/详细导入报告_2025-06-16.csv --dry-run

# 执行实际操作
docker exec zhiweijz-backend npx ts-node src/scripts/fix-budget-assignment.ts /tmp/详细导入报告_2025-06-16.csv
```

## 方法三：使用卷映射（开发模式）

如果您需要频繁执行脚本，可以修改 docker-compose.yml 添加卷映射：

### 1. 修改 docker-compose.yml

在 backend 服务的 volumes 部分添加：

```yaml
services:
  backend:
    # ... 其他配置
    volumes:
      - ../docs:/app/docs:ro  # 只读映射文档目录
      - ../server/src/scripts:/app/src/scripts:ro  # 只读映射脚本目录
```

### 2. 重启服务

```bash
docker-compose down
docker-compose up -d
```

### 3. 直接执行

```bash
docker exec zhiweijz-backend npx ts-node src/scripts/fix-budget-assignment.ts /app/docs/详细导入报告_2025-06-16.csv --dry-run
```

## 方法四：创建专用的修复脚本容器

### 1. 创建临时的修复脚本

```bash
# 在 docker 目录下创建临时 docker-compose 覆盖文件
cat > docker-compose.fix.yml << 'EOF'
version: '3.8'

services:
  backend-fix:
    image: zj591227045/zhiweijz-backend:0.1.5
    container_name: zhiweijz-backend-fix
    environment:
      NODE_ENV: production
      DOCKER_ENV: "true"
      DATABASE_URL: postgresql://${DB_USER:-zhiweijz}:${DB_PASSWORD:-zhiweijz123}@postgres:5432/${DB_NAME:-zhiweijz}
    volumes:
      - ../docs:/app/docs:ro
      - ../server/src/scripts:/app/src/scripts:ro
    networks:
      - zhiweijz-network
    depends_on:
      - postgres
    command: >
      sh -c "
        echo '等待数据库连接...' &&
        sleep 10 &&
        echo '开始执行预算修复脚本（试运行）...' &&
        npx ts-node src/scripts/fix-budget-assignment.ts /app/docs/详细导入报告_2025-06-16.csv --dry-run
      "
EOF
```

### 2. 运行修复容器

```bash
# 试运行
docker-compose -f docker-compose.yml -f docker-compose.fix.yml run --rm backend-fix

# 实际执行（修改命令移除 --dry-run）
# 需要手动编辑 docker-compose.fix.yml 文件中的命令
```

## 验证和监控

### 检查容器状态
```bash
docker ps -a | grep zhiweijz
```

### 查看容器日志
```bash
docker logs zhiweijz-backend
```

### 查看脚本执行日志
```bash
# 实时查看日志
docker logs -f zhiweijz-backend
```

## 故障排除

### 1. 容器未运行
```bash
# 检查容器状态
docker ps -a

# 启动服务
cd docker
docker-compose up -d
```

### 2. 权限问题
```bash
# 检查文件权限
docker exec zhiweijz-backend ls -la /app/data/
docker exec zhiweijz-backend ls -la /tmp/
```

### 3. 数据库连接问题
```bash
# 检查数据库连接
docker exec zhiweijz-backend sh -c "apk add --no-cache postgresql-client && psql \$DATABASE_URL -c 'SELECT 1;'"
```

### 4. 脚本文件不存在
```bash
# 检查脚本文件
docker exec zhiweijz-backend ls -la /app/src/scripts/
```

### 5. Node.js 依赖问题
```bash
# 检查依赖
docker exec zhiweijz-backend npm list csv-parse
docker exec zhiweijz-backend npm list @prisma/client
```

## 推荐执行流程

1. **准备阶段**：
   ```bash
   cd docker
   docker-compose up -d
   docker ps  # 确认所有服务运行正常
   ```

2. **试运行**：
   ```bash
   docker cp ../docs/详细导入报告_2025-06-16.csv zhiweijz-backend:/tmp/
   docker exec zhiweijz-backend npx ts-node src/scripts/fix-budget-assignment.ts /tmp/详细导入报告_2025-06-16.csv --dry-run
   ```

3. **检查结果**：仔细查看试运行的输出，确认预算分配逻辑正确

4. **实际执行**：
   ```bash
   docker exec zhiweijz-backend npx ts-node src/scripts/fix-budget-assignment.ts /tmp/详细导入报告_2025-06-16.csv
   ```

5. **清理**：
   ```bash
   docker exec zhiweijz-backend rm /tmp/详细导入报告_2025-06-16.csv
   ```

## 注意事项

1. **备份数据**：执行前建议备份数据库
2. **测试环境**：建议先在测试环境验证
3. **监控日志**：执行过程中监控容器日志
4. **资源使用**：注意容器资源使用情况
5. **网络连通性**：确保容器能正常访问数据库 