# Docker环境下数据库连接配置修复

## 问题描述

在Docker容器环境下，后端服务无法正确读取环境变量文件中的数据库配置，导致连接失败。

## 根本原因分析

1. **容器内.env文件覆盖问题**
   - Dockerfile复制server目录时，包含了.env文件
   - dotenv.config()优先读取容器内.env文件，覆盖Docker环境变量

2. **配置文件导入冲突**
   - database.ts导入错误的配置文件
   - 存在硬编码的开发环境数据库连接

3. **环境变量优先级问题**
   - Prisma客户端未正确使用Docker传递的DATABASE_URL

## 修复方案

### 1. Dockerfile修复
```dockerfile
# 复制源代码（排除.env文件以避免覆盖Docker环境变量）
COPY server/ .
# 删除可能存在的.env文件，确保使用Docker环境变量
RUN rm -f .env .env.local .env.production .env.development 2>/dev/null || true
```

### 2. database.ts修复
```typescript
// 确保在Docker环境中使用正确的数据库连接
const getDatabaseUrl = (): string => {
  // 优先使用环境变量中的DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('使用环境变量DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    return process.env.DATABASE_URL;
  }
  
  // 回退到配置文件
  console.log('使用配置文件database.url:', config.database.url.replace(/:[^:@]*@/, ':***@'));
  return config.database.url;
};

// 创建Prisma客户端实例
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  // ... 其他配置
});
```

### 3. 移除硬编码连接
- 修复config/index.ts中的硬编码数据库连接
- 使用标准的localhost连接作为默认值

### 4. 启动脚本增强
- 添加环境变量验证和调试信息
- 检测容器内是否存在.env文件
- 显示实际使用的数据库连接（隐藏密码）

### 5. .dockerignore配置
- 确保.env文件不被复制到容器中
- 已存在配置：`.env*`

## 验证修复效果

运行验证脚本：
```bash
bash docker/verify-fix.sh
```

## 部署步骤

### 1. 确保环境变量文件存在
```bash
cd docker
cp .env.example .env
# 编辑.env文件，配置正确的数据库参数
```

### 2. 重新构建镜像（如果使用自定义镜像）
```bash
# 如果使用DockerHub镜像，跳过此步骤
docker build -t your-backend-image:latest -f server/Dockerfile .
```

### 3. 重启容器
```bash
cd docker
docker-compose down
docker-compose up -d
```

### 4. 验证连接
```bash
# 查看后端容器日志
docker-compose logs backend

# 检查数据库连接
docker exec zhiweijz-backend bash -c "echo 'SELECT 1;' | npx prisma db execute --stdin"
```

## 环境变量配置示例

docker/.env文件示例：
```bash
# 数据库配置
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# JWT密钥
JWT_SECRET=your-jwt-secret-key

# 其他配置...
```

## 故障排除

### 1. 检查环境变量传递
```bash
# 查看容器内环境变量
docker exec zhiweijz-backend printenv DATABASE_URL
```

### 2. 检查容器内是否存在.env文件
```bash
# 应该返回文件不存在
docker exec zhiweijz-backend test -f .env && echo "存在" || echo "不存在"
```

### 3. 查看详细启动日志
```bash
docker-compose logs backend --tail=50
```

### 4. 运行诊断脚本
```bash
bash docker/scripts/diagnose-env-vars.sh
```

## 修复效果

修复后，系统将：
1. ✅ 正确读取Docker Compose传递的环境变量
2. ✅ 优先使用DATABASE_URL环境变量
3. ✅ 防止容器内.env文件覆盖配置
4. ✅ 提供详细的启动日志和调试信息
5. ✅ 确保数据库连接配置的一致性

## 注意事项

1. **生产环境安全**：确保.env文件包含强密码和安全的JWT密钥
2. **镜像更新**：如果使用自定义镜像，需要重新构建并推送
3. **数据备份**：重启前建议备份重要数据
4. **网络配置**：确保容器间网络连接正常

## 相关文件

- `server/Dockerfile` - 容器构建配置
- `server/src/config/database.ts` - 数据库连接配置
- `server/src/config/index.ts` - 应用配置
- `server/scripts/deployment/start.sh` - 容器启动脚本
- `server/.dockerignore` - Docker忽略文件配置
- `docker/docker-compose.yml` - 容器编排配置
