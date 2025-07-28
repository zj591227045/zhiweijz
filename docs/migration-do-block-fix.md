# 数据库迁移DO块解析问题修复

## 问题描述

在正式环境部署时，数据库迁移失败，错误信息：
```
ERROR: cannot insert multiple commands into a prepared statement
```

这个错误是由于 Prisma 的 `$executeRawUnsafe()` 方法无法正确处理包含多个语句的复杂 DO $$ 块导致的。

## 根本原因

1. **迁移管理器解析问题**：`migration-manager.js` 中的 `parsePostgreSQLStatements()` 函数对 DO $$ 块的解析不够精确
2. **复杂DO块结构**：多个迁移文件包含复杂的 DO $$ 块，包含变量声明、循环、条件逻辑等
3. **Prisma限制**：`$executeRawUnsafe()` 不支持在单次调用中执行包含多个语句的复杂块

## 修复内容

### 1. 迁移管理器修复 (`server/migrations/migration-manager.js`)

**修复前的问题**：
- DO $$ 块解析逻辑不够精确
- `ensureSchemaVersionsTable()` 函数中也包含复杂的 DO 块

**修复后的改进**：
- 改进了 DO $$ 块的正则匹配：`/DO\s*\$\$/` 和 `/END\s*\$\$/`
- 将 `ensureSchemaVersionsTable()` 中的 DO 块替换为 try-catch 结构
- 移除了未使用的变量

### 2. 迁移文件修复

#### `update-smart-accounting-prompts-v1.8.1.sql`
**修复前**：包含复杂的验证 DO 块，有变量声明和条件逻辑
**修复后**：替换为简单的 SELECT 查询进行验证

#### `1.5.0-to-1.6.0.sql`
**修复前**：
- 复杂的函数创建 DO 块
- 包含循环的测试数据插入 DO 块

**修复后**：
- 直接使用 `CREATE OR REPLACE FUNCTION`
- 将循环插入替换为简单的 VALUES 查询

#### `add-budget-unique-constraint.sql`
**修复前**：复杂的重复记录清理 DO 块，包含循环和数组操作
**修复后**：使用临时表和简单的 DELETE 语句

#### `fix-budget-schema.sql`
**修复前**：复杂的验证 DO 块
**修复后**：替换为独立的 SELECT 验证查询

#### `fix-missing-account-book-id-fields.sql`
**修复前**：包含用户遍历循环的复杂 DO 块
**修复后**：使用临时表和 JOIN 更新的方式

### 3. 保持的简单DO块

以下文件中的简单 DO 块被保留，因为它们只包含单个语句：
- `add-file-storage.sql` - 简单的 CREATE TYPE 和 ALTER TABLE 语句
- 其他包含简单异常处理的 DO 块

## 修复策略

1. **复杂逻辑简化**：将包含循环、变量、条件的复杂 DO 块拆分为多个简单语句
2. **临时表使用**：用临时表替代复杂的内存操作
3. **直接SQL替代**：用标准SQL语句替代程序化逻辑
4. **异常处理简化**：用 try-catch 替代 DO 块中的异常处理

## 验证方法

修复后，可以通过以下方式验证：

```bash
# 在服务器目录下测试迁移管理器
cd server
node migrations/migration-manager.js status

# 测试特定迁移文件
node migrations/migration-manager.js migrate 1.8.1
```

## 部署建议

1. **重新构建Docker镜像**：包含修复后的迁移文件
2. **测试环境验证**：先在测试环境验证修复效果
3. **备份数据**：生产环境部署前备份数据库
4. **监控日志**：部署时密切监控迁移日志

## 长期改进

1. **迁移文件规范**：建立DO块使用规范，避免复杂逻辑
2. **测试覆盖**：为迁移管理器添加单元测试
3. **解析器增强**：进一步改进SQL解析器的健壮性
4. **文档完善**：更新迁移编写指南

## 相关文件

- `server/migrations/migration-manager.js` - 迁移管理器主文件
- `server/migrations/incremental/update-smart-accounting-prompts-v1.8.1.sql` - 主要问题文件
- `server/migrations/incremental/1.5.0-to-1.6.0.sql` - 复杂函数创建
- `server/migrations/incremental/add-budget-unique-constraint.sql` - 重复数据清理
- `server/migrations/incremental/fix-budget-schema.sql` - 结构验证
- `server/migrations/incremental/fix-missing-account-book-id-fields.sql` - 数据迁移

## 总结

通过这次修复，我们：
1. ✅ 解决了 DO $$ 块解析问题
2. ✅ 简化了复杂的迁移逻辑
3. ✅ 提高了迁移的可靠性
4. ✅ 保持了功能的完整性

修复后的迁移系统更加稳定，能够在生产环境中可靠运行。
