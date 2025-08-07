# PostgreSQL连接数优化指南

## 问题描述

在使用过程中可能会遇到以下错误：
```
Too many database connections opened: FATAL: sorry, too many clients already
```

这个错误表示PostgreSQL数据库的连接数已达到上限，通常是由以下原因造成的：

1. **PostgreSQL默认连接数限制**：PostgreSQL 15默认最大连接数为100
2. **应用程序连接池配置不当**：没有正确配置连接池参数
3. **批量操作未使用事务**：导致多个并发连接

## 解决方案

### 1. PostgreSQL服务器配置优化

我们已经在Docker Compose配置中优化了PostgreSQL参数：

```yaml
command: >
  postgres
  -c max_connections=200          # 最大连接数从100增加到200
  -c shared_buffers=256MB         # 共享缓冲区
  -c effective_cache_size=1GB     # 有效缓存大小
  -c maintenance_work_mem=64MB    # 维护工作内存
  -c work_mem=4MB                 # 工作内存
  -c min_wal_size=1GB            # 最小WAL大小
  -c max_wal_size=4GB            # 最大WAL大小
```

### 2. Prisma连接池配置

在 `server/src/config/database.ts` 中配置了连接池参数：

```typescript
// 添加连接池参数到DATABASE_URL
url.searchParams.set('connection_limit', '20');     // 最大连接数
url.searchParams.set('pool_timeout', '10');         // 连接池超时时间（秒）
url.searchParams.set('connect_timeout', '10');      // 连接超时时间（秒）
```

### 3. 批量操作事务优化

在存储配置服务中使用事务来减少连接数：

```typescript
// 使用事务进行批量操作
await prisma.$transaction(async (tx) => {
  for (const update of updates) {
    await tx.systemConfig.upsert({
      // ... 操作内容
    });
  }
});
```

## 应用优化

### 运行优化脚本

1. 进入docker目录：
```bash
cd docker
```

2. 运行PostgreSQL连接优化脚本：
```bash
./scripts/optimize-postgres-connections.sh
```

这个脚本会：
- 检查当前PostgreSQL容器状态
- 重启PostgreSQL容器以应用新配置
- 验证配置是否生效
- 显示当前连接数状态

### 手动重启（如果需要）

如果使用标准配置：
```bash
docker compose -f docker-compose.yml restart postgres
```

如果使用fnOS配置：
```bash
docker compose -f docker-compose-fnOS.yml restart postgres
```

## 监控和验证

### 检查当前连接数

连接到PostgreSQL容器：
```bash
docker exec -it zhiweijz-postgres psql -U postgres -d zhiweijz
```

查看当前连接数：
```sql
-- 查看当前活跃连接数
SELECT count(*) FROM pg_stat_activity;

-- 查看最大连接数配置
SHOW max_connections;

-- 查看详细连接信息
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start
FROM pg_stat_activity 
WHERE state = 'active';
```

### 应用程序监控

在应用程序中添加连接监控：

```typescript
// 监控Prisma连接状态
const connectionInfo = await prisma.$queryRaw`
  SELECT count(*) as active_connections 
  FROM pg_stat_activity 
  WHERE datname = current_database()
`;

console.log('当前数据库连接数:', connectionInfo);
```

## 最佳实践

### 1. 连接池管理

- **合理设置连接池大小**：通常设置为CPU核心数的2-4倍
- **设置连接超时**：避免长时间占用连接
- **使用连接池监控**：定期检查连接使用情况

### 2. 事务使用

- **批量操作使用事务**：减少连接数占用
- **避免长事务**：及时提交或回滚事务
- **合理的事务边界**：不要在事务中执行耗时操作

### 3. 查询优化

- **使用索引**：提高查询效率，减少连接占用时间
- **避免N+1查询**：使用include或select优化查询
- **分页查询**：避免一次性加载大量数据

## 故障排除

### 如果仍然出现连接数问题

1. **检查应用程序连接泄漏**：
   - 确保所有数据库操作都正确关闭连接
   - 检查是否有未处理的异常导致连接未释放

2. **调整连接池配置**：
   - 减少应用程序的连接池大小
   - 增加连接超时时间

3. **数据库服务器资源**：
   - 检查服务器内存是否足够
   - 考虑增加PostgreSQL的max_connections

4. **应用程序架构**：
   - 考虑使用连接代理（如PgBouncer）
   - 实现应用级别的连接池管理

### 紧急处理

如果遇到紧急情况，可以临时重启PostgreSQL容器：

```bash
# 快速重启PostgreSQL
docker restart zhiweijz-postgres

# 等待容器就绪
docker exec zhiweijz-postgres pg_isready -U postgres
```

## 配置文件位置

- PostgreSQL配置：`docker/docker-compose.yml` 和 `docker/docker-compose-fnOS.yml`
- Prisma配置：`server/src/config/database.ts`
- 优化脚本：`docker/scripts/optimize-postgres-connections.sh`

## 相关文档

- [PostgreSQL连接管理文档](https://www.postgresql.org/docs/15/runtime-config-connection.html)
- [Prisma连接池文档](https://www.prisma.io/docs/concepts/components/prisma-client/connection-pool)
- [Docker Compose PostgreSQL配置](https://hub.docker.com/_/postgres)
