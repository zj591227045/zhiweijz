# 数据库迁移问题修复指南

## 问题描述

如果您在启动后端容器时遇到以下错误：

```
[MIGRATION] SQL执行失败: DO $$ BEGIN ALTER TABLE budgets ADD CONSTRAINT budgets_account_book_id_fkey FOREIGN KEY (account_boo...
[MIGRATION] 迁移失败: insert or update on table "budgets" violates foreign key constraint "budgets_account_book_id_fkey"
```

这是由于数据完整性问题导致的外键约束违反错误。

## 解决方案

我们提供了三种修复脚本，按推荐程度排序：

### 🚀 方案一：快速修复（推荐）

**适用场景**：解决当前的外键约束问题，快速恢复服务

```bash
cd docker
./scripts/quick-fix.sh
```

**修复内容**：
- 修复外键约束问题
- 清理无效数据
- 标记迁移为已完成
- 重启后端容器

**执行时间**：约1-2分钟

### 🔧 方案二：完整热修复

**适用场景**：需要完整的数据完整性修复

```bash
cd docker
./scripts/hotfix-migration.sh
```

**修复内容**：
- 完整的数据完整性检查和修复
- 清理重复数据
- 添加所有必要的约束和索引
- 重新生成Prisma客户端

**执行时间**：约3-5分钟

### 🔍 方案三：诊断和修复

**适用场景**：需要详细了解问题并逐步修复

```bash
cd docker
./scripts/diagnose-migration.sh
```

**功能**：
- 生成详细的诊断报告
- 自动尝试修复
- 提供故障排除建议

## 使用步骤

1. **确保容器运行**：
   ```bash
   docker-compose up -d backend
   ```

2. **选择合适的修复脚本**：
   - 如果只是想快速解决问题：使用 `quick-fix.sh`
   - 如果需要完整修复：使用 `hotfix-migration.sh`
   - 如果需要诊断：使用 `diagnose-migration.sh`

3. **执行修复脚本**：
   ```bash
   cd docker
   ./scripts/quick-fix.sh
   ```

4. **检查修复结果**：
   ```bash
   docker logs zhiweijz-backend --tail=20
   ```

## 验证修复

修复完成后，您应该看到：

```
✅ 数据库连接成功
✅ 增量迁移完成
✅ 数据库迁移完成
🔧 生成Prisma客户端...
启动应用服务器...
```

## 预防措施

为了避免将来出现类似问题，建议：

1. **使用最新的Docker镜像**：
   ```bash
   docker pull zj591227045/zhiweijz-backend:latest
   ```

2. **定期备份数据库**：
   ```bash
   docker exec zhiweijz-postgres pg_dump -U postgres zhiweijz > backup.sql
   ```

3. **监控迁移日志**：
   ```bash
   docker logs zhiweijz-backend | grep MIGRATION
   ```

## 故障排除

### 如果修复脚本失败

1. **检查容器状态**：
   ```bash
   docker ps | grep zhiweijz
   ```

2. **查看详细错误**：
   ```bash
   docker logs zhiweijz-backend --tail=50
   ```

3. **检查数据库连接**：
   ```bash
   docker exec zhiweijz-backend npx prisma db execute --stdin <<< "SELECT 1;"
   ```

### 如果问题持续存在

1. 保存完整的错误日志
2. 运行诊断脚本获取详细报告
3. 联系技术支持并提供：
   - 错误日志
   - 诊断报告
   - Docker版本信息
   - 系统环境信息

## 安全说明

⚠️ **重要提醒**：

- 所有修复脚本都设计为**数据安全优先**
- **不会执行任何可能导致数据丢失的操作**
- 在修复前会自动备份关键数据
- 如有疑问，请先联系技术支持

## 联系支持

如果您在使用修复脚本时遇到任何问题，请：

1. 保存完整的错误日志
2. 运行 `./scripts/diagnose-migration.sh` 获取诊断报告
3. 联系技术支持并提供上述信息

---

**最后更新**：2025-07-29
**版本**：v1.0.0
