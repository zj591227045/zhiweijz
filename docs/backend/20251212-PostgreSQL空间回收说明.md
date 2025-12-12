# PostgreSQL 空间回收机制说明

## 为什么删除数据后表大小不变？

这是 PostgreSQL 的 MVCC（多版本并发控制）机制的正常行为。

### MVCC 工作原理

1. **DELETE 不是物理删除**: 执行 DELETE 时，PostgreSQL 只是标记行为"已删除"，不会立即从磁盘删除
2. **死元组（Dead Tuples）**: 被删除的行变成"死元组"，仍然占用磁盘空间
3. **空间重用**: 这些空间会被标记为可重用，新插入的数据会优先使用这些空间
4. **文件大小不变**: 表文件大小不会自动减小

### 为什么这样设计？

- **并发性能**: 允许其他事务继续读取旧版本数据，不会阻塞
- **事务回滚**: 如果事务回滚，可以快速恢复数据
- **MVCC 快照**: 支持一致性快照读取

## 空间回收方法

### 1. VACUUM（推荐，日常使用）

```sql
-- 回收死元组空间，标记为可重用
VACUUM system_performance_history;

-- 同时更新统计信息（推荐）
VACUUM ANALYZE system_performance_history;
```

**特点**:
- ✅ 不锁表，可以在线执行
- ✅ 回收空间供重用
- ✅ 更新查询优化器统计信息
- ❌ 不会减小文件大小
- ⏱️ 执行速度快

### 2. VACUUM FULL（谨慎使用）

```sql
-- 完全重建表，真正压缩文件
VACUUM FULL system_performance_history;
```

**特点**:
- ✅ 真正减小文件大小
- ✅ 完全回收磁盘空间
- ❌ 会锁表，阻塞所有操作
- ❌ 需要额外的磁盘空间（临时表）
- ⏱️ 执行时间长

**使用场景**:
- 一次性删除了大量数据（如删除了 90% 的历史数据）
- 在维护窗口期执行
- 磁盘空间紧张，必须立即释放

### 3. 自动 VACUUM（PostgreSQL 自带）

PostgreSQL 有自动 VACUUM 机制，会在后台自动清理死元组。

**配置参数**:
```sql
-- 查看自动 VACUUM 配置
SHOW autovacuum;
SHOW autovacuum_naptime;
SHOW autovacuum_vacuum_threshold;
```

## 我们的实现

在 `performance-monitoring.service.ts` 中，清理方法会：

```typescript
async cleanupOldData() {
  // 1. 删除过期数据
  await prisma.$executeRaw`
    DELETE FROM system_performance_history
    WHERE recorded_at < NOW() - INTERVAL '30 days'
  `;

  // 2. 立即执行 VACUUM 回收空间
  await prisma.$executeRaw`VACUUM ANALYZE system_performance_history`;
}
```

这样可以：
- 删除后立即回收空间
- 更新统计信息，优化查询
- 不阻塞其他操作

## 监控表大小

### 查看表大小

```sql
-- 查看表的总大小（包括索引）
SELECT 
  pg_size_pretty(pg_total_relation_size('system_performance_history')) as total_size,
  pg_size_pretty(pg_relation_size('system_performance_history')) as table_size,
  pg_size_pretty(pg_indexes_size('system_performance_history')) as indexes_size;
```

### 查看死元组数量

```sql
-- 查看表的死元组统计
SELECT 
  schemaname,
  relname,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_ratio,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'system_performance_history';
```

### 查看 VACUUM 历史

```sql
-- 查看最近的 VACUUM 执行记录
SELECT 
  relname,
  last_vacuum,
  last_autovacuum,
  vacuum_count,
  autovacuum_count
FROM pg_stat_user_tables
WHERE relname = 'system_performance_history';
```

## 最佳实践

### 日常运行

1. **定期清理**: 每天凌晨 1 点自动清理 30 天前的数据
2. **自动 VACUUM**: 清理后自动执行 `VACUUM ANALYZE`
3. **监控死元组**: 如果死元组比例超过 20%，考虑手动 VACUUM

### 首次清理大量数据

如果首次清理会删除大量数据（如数百万条）：

```sql
-- 1. 在维护窗口期执行
-- 2. 先删除数据
DELETE FROM system_performance_history
WHERE recorded_at < NOW() - INTERVAL '30 days';

-- 3. 执行 VACUUM FULL 真正释放空间
VACUUM FULL system_performance_history;

-- 4. 重建索引（VACUUM FULL 会自动重建，但可以手动优化）
REINDEX TABLE system_performance_history;
```

### 定期维护

```sql
-- 每周执行一次，保持表健康
VACUUM ANALYZE system_performance_history;

-- 每月或每季度执行一次（如果空间紧张）
VACUUM FULL system_performance_history;
```

## 常见问题

### Q: 为什么执行了清理任务，表大小还是 1GB？

A: 这是正常的。VACUUM 只是标记空间为可重用，不会减小文件。新数据会优先使用这些空间。

### Q: 什么时候需要 VACUUM FULL？

A: 
- 一次性删除了大量数据（超过 50%）
- 磁盘空间紧张，必须立即释放
- 在维护窗口期，可以接受锁表

### Q: VACUUM 会影响性能吗？

A: 
- 普通 VACUUM: 影响很小，可以在线执行
- VACUUM FULL: 会锁表，阻塞所有操作，只能在维护窗口执行

### Q: 自动 VACUUM 够用吗？

A: 
- 对于正常的增删改，自动 VACUUM 足够
- 对于大批量删除，建议手动执行 VACUUM
- 我们的清理任务会自动执行 VACUUM，无需担心

## 总结

- **DELETE 后表大小不变是正常的**，这是 PostgreSQL 的 MVCC 机制
- **VACUUM 回收空间供重用**，不会减小文件大小
- **VACUUM FULL 真正压缩文件**，但会锁表
- **我们的清理任务会自动执行 VACUUM**，保持表健康
- **首次清理大量数据后，建议手动执行 VACUUM FULL**
