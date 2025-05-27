# 只为记账 Docker 故障排除指南

## 🔍 问题诊断流程

### 1. 快速检查
```bash
# 检查所有容器状态
docker-compose ps

# 检查Docker守护进程
docker info

# 检查磁盘空间
df -h

# 检查内存使用
free -h
```

### 2. 服务健康检查
```bash
# 数据库健康检查
docker-compose exec postgres pg_isready -U zhiweijz -d zhiweijz

# 后端API健康检查
curl -f http://localhost/api/health

# 前端健康检查
curl -f http://localhost/health

# Nginx健康检查
curl -f http://localhost/health
```

## 🚨 常见问题及解决方案

### 问题1: 容器启动失败

**症状**: 容器无法启动或立即退出

**诊断命令**:
```bash
docker-compose logs <service-name>
docker-compose ps
```

**可能原因及解决方案**:

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   netstat -tulpn | grep :5432
   
   # 解决方案：修改docker-compose.yml中的端口映射
   ports:
     - "8080:80"  # 改为其他端口
   ```

2. **内存不足**
   ```bash
   # 检查内存使用
   free -h
   docker stats
   
   # 解决方案：释放内存或增加swap
   ```

3. **磁盘空间不足**
   ```bash
   # 检查磁盘空间
   df -h
   docker system df
   
   # 清理Docker资源
   docker system prune -a
   ```

### 问题2: 数据库连接失败

**症状**: 后端无法连接数据库

**诊断命令**:
```bash
docker-compose logs postgres
docker-compose logs backend
docker-compose exec postgres psql -U zhiweijz -d zhiweijz -c "SELECT 1;"
```

**解决方案**:

1. **检查数据库容器状态**
   ```bash
   docker-compose ps postgres
   docker-compose restart postgres
   ```

2. **检查数据库连接参数**
   ```bash
   # 验证环境变量
   docker-compose exec backend env | grep DATABASE_URL
   ```

3. **重置数据库**
   ```bash
   docker-compose down
   docker volume rm zhiweijz_postgres_data
   docker-compose up -d postgres
   ```

### 问题3: API请求返回503错误

**症状**: 前端API请求失败，返回503状态码

**诊断命令**:
```bash
docker-compose logs nginx
curl -v http://localhost/api/health
```

**解决方案**:

1. **检查nginx限流配置**
   - 问题：API限流过于严格
   - 解决：已在配置中放宽限制 (rate=50r/s, burst=100)

2. **检查后端服务状态**
   ```bash
   docker-compose ps backend
   docker-compose restart backend
   ```

3. **检查nginx配置**
   ```bash
   docker-compose exec nginx nginx -t
   docker-compose restart nginx
   ```

### 问题4: 前端页面无限刷新

**症状**: 页面加载后不断刷新

**诊断命令**:
```bash
# 检查浏览器控制台错误
# 检查前端容器日志
docker-compose logs frontend
```

**解决方案**:

1. **检查认证状态**
   - 问题：认证循环或useEffect依赖问题
   - 解决：已在最新镜像中修复

2. **重新构建前端镜像**
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

### 问题5: 静态资源加载失败

**症状**: 图标、样式等静态资源无法加载

**诊断命令**:
```bash
curl -I http://localhost/_next/static/css/app.css
docker-compose logs nginx
```

**解决方案**:

1. **检查nginx静态资源配置**
2. **重新构建前端镜像确保资源正确打包**
3. **清除浏览器缓存**

### 问题6: 数据库迁移失败

**症状**: 后端启动时数据库迁移报错

**诊断命令**:
```bash
docker-compose logs backend | grep -i migrate
docker-compose exec backend npx prisma migrate status
```

**解决方案**:

1. **手动执行迁移**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

2. **重置迁移状态**
   ```bash
   docker-compose exec backend npx prisma migrate reset --force
   ```

3. **检查数据库权限**
   ```bash
   docker-compose exec postgres psql -U zhiweijz -d zhiweijz -c "\du"
   ```

## 🔧 高级故障排除

### 网络问题诊断

```bash
# 检查Docker网络
docker network ls
docker network inspect zhiweijz_default

# 测试容器间连接
docker-compose exec frontend ping backend
docker-compose exec backend ping postgres

# 检查DNS解析
docker-compose exec frontend nslookup backend
```

### 性能问题诊断

```bash
# 检查容器资源使用
docker stats

# 检查系统负载
top
htop

# 检查磁盘IO
iostat -x 1

# 检查网络流量
iftop
```

### 日志分析

```bash
# 实时查看所有日志
docker-compose logs -f

# 查看特定时间段的日志
docker-compose logs --since="2024-01-01T00:00:00" --until="2024-01-01T23:59:59"

# 搜索错误日志
docker-compose logs | grep -i error
docker-compose logs | grep -i "failed"
```

## 🛠️ 维护工具

### 数据库维护

```bash
# 数据库备份
docker-compose exec postgres pg_dump -U zhiweijz zhiweijz > backup.sql

# 数据库恢复
docker-compose exec -T postgres psql -U zhiweijz zhiweijz < backup.sql

# 检查数据库大小
docker-compose exec postgres psql -U zhiweijz -d zhiweijz -c "
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### 容器维护

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune

# 清理未使用的网络
docker network prune

# 完整系统清理
docker system prune -a --volumes
```

## 📋 问题报告模板

当需要寻求帮助时，请提供以下信息：

```
### 环境信息
- 操作系统: 
- Docker版本: 
- Docker Compose版本: 
- 可用内存: 
- 可用磁盘空间: 

### 问题描述
- 问题现象: 
- 复现步骤: 
- 预期结果: 
- 实际结果: 

### 日志信息
```bash
# 容器状态
docker-compose ps

# 相关日志
docker-compose logs --tail=50 <service-name>
```

### 已尝试的解决方案
- 方案1: 
- 方案2: 
```

## 🆘 紧急恢复

### 完全重置
如果所有方法都无效，可以完全重置：

```bash
# 停止所有服务
docker-compose down

# 删除所有数据
docker-compose down -v

# 删除相关镜像
docker images | grep zhiweijz | awk '{print $3}' | xargs docker rmi -f

# 重新部署
./scripts/start.sh
```

### 数据恢复
如果有数据备份：

```bash
# 启动数据库
docker-compose up -d postgres

# 等待数据库启动
sleep 10

# 恢复数据
docker-compose exec -T postgres psql -U zhiweijz zhiweijz < backup.sql

# 启动其他服务
docker-compose up -d
```

---

**提示**: 定期备份数据库和重要配置文件，以便在出现问题时快速恢复。
