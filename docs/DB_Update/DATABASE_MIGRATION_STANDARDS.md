# 数据库架构更新规范与标准

## 概述

本文档定义了只为记账项目的数据库架构更新规范，确保后端版本升级时能够稳定、安全地更新数据库架构。

## 1. 版本管理规范

### 1.1 版本号规则

采用语义化版本控制 (Semantic Versioning)：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的API更改或重大架构变更
- **MINOR**: 向后兼容的功能性新增
- **PATCH**: 向后兼容的问题修正

### 1.2 数据库版本映射

```
后端版本 -> 数据库Schema版本 -> 迁移文件前缀
0.1.0   -> 20250515000000   -> 基础架构
0.1.1   -> 20250516000000   -> 账本功能
0.1.2   -> 20250517000000   -> 分类管理
0.1.3   -> 20250518000000   -> 预算系统
0.1.4   -> 20250519000000   -> 预算历史
0.1.5   -> 20250520000000   -> 记账元数据
0.1.6   -> 20250521000000   -> 预算增强
```

## 2. 迁移文件规范

### 2.1 文件命名规则

```
server/prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/migration.sql
```

示例：
```
20250521000000_add_refresh_day_to_budgets/migration.sql
20250521000001_add_budget_amount_modified_fields/migration.sql
```

### 2.2 迁移文件结构

每个迁移文件必须包含：

```sql
-- Migration: [简短描述]
-- Version: [对应的后端版本]
-- Date: [创建日期]
-- Description: [详细说明]

-- 检查现有结构（幂等性保证）
DO $$
BEGIN
    -- 条件检查逻辑
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'table_name' AND column_name = 'column_name'
    ) THEN
        -- 执行变更
        ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value;
    END IF;
END $$;

-- 数据迁移（如需要）
-- UPDATE statements with WHERE conditions

-- 添加约束（如需要）
-- ALTER TABLE statements for constraints

-- 创建索引（如需要）
-- CREATE INDEX statements
```

### 2.3 幂等性要求

所有迁移必须支持重复执行：

```sql
-- ✅ 正确：使用条件检查
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false;

-- ❌ 错误：直接执行可能失败
ALTER TABLE users ADD COLUMN is_custodial BOOLEAN DEFAULT false;
```

## 3. 架构变更分类

### 3.1 安全变更（向后兼容）

- 添加新表
- 添加新列（带默认值）
- 添加新索引
- 添加新约束（不影响现有数据）

### 3.2 风险变更（需要特殊处理）

- 删除列
- 修改列类型
- 删除表
- 修改约束

### 3.3 数据迁移变更

- 数据格式转换
- 数据重新分布
- 关联关系调整

## 4. 迁移管理系统

### 4.1 自定义迁移管理器

基于现有的 `server/scripts/migration/migration-manager.js`，扩展功能：

```javascript
class MigrationManager {
  constructor() {
    this.migrations = [
      {
        version: '0.1.6',
        name: 'add_refresh_day_to_budgets',
        description: '添加预算刷新日期字段',
        dependencies: ['0.1.5'], // 依赖版本
        up: this.addRefreshDayField.bind(this),
        down: this.removeRefreshDayField.bind(this),
        validate: this.validateRefreshDay.bind(this)
      }
    ];
  }
}
```

### 4.2 迁移状态跟踪

使用专用表跟踪迁移状态：

```sql
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  checksum VARCHAR(64), -- 迁移文件校验和
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time INTEGER, -- 执行时间（毫秒）
  status VARCHAR(20) DEFAULT 'SUCCESS' -- SUCCESS, FAILED, ROLLBACK
);
```

## 5. 启动时自动迁移

### 5.1 启动脚本集成

在 `server/scripts/deployment/start.sh` 中集成迁移逻辑：

```bash
# 1. 检测数据库状态
# 2. 执行Prisma标准迁移
# 3. 执行自定义迁移管理器
# 4. 验证关键字段
# 5. 生成Prisma客户端
```

### 5.2 迁移策略

```bash
if [ 全新数据库 ]; then
    # 执行完整初始化
    npx prisma migrate deploy
    node scripts/migration/migration-manager.js
elif [ 现有数据库 ]; then
    # 执行增量迁移
    npx prisma migrate deploy || 降级处理
    node scripts/migration/migration-manager.js --incremental
fi
```

## 6. Docker镜像构建规范

### 6.1 版本标记规范

```bash
# 构建命令模板
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --file server/Dockerfile \
  --tag zj591227045/zhiweijz-backend:${VERSION} \
  --tag zj591227045/zhiweijz-backend:latest \
  --push .
```

### 6.2 镜像内容验证

构建前检查：
- [ ] Prisma schema 最新
- [ ] 迁移文件完整
- [ ] 启动脚本更新
- [ ] 依赖包版本正确

## 7. 测试与验证

### 7.1 迁移测试流程

```bash
# 1. 创建测试数据库
# 2. 恢复旧版本数据
# 3. 执行迁移
# 4. 验证数据完整性
# 5. 验证功能正常
```

### 7.2 回滚测试

每个迁移都必须提供回滚方法：

```javascript
{
  up: async () => {
    // 正向迁移
  },
  down: async () => {
    // 回滚迁移
  }
}
```

## 8. 发布流程

### 8.1 版本发布检查清单

- [ ] 更新 `package.json` 版本号
- [ ] 创建对应的迁移文件
- [ ] 更新 `migration-manager.js`
- [ ] 测试迁移在多种数据库状态下的执行
- [ ] 构建并推送Docker镜像
- [ ] 更新 `docker-compose.yml` 版本号
- [ ] 创建Git标签

### 8.2 发布命令序列

```bash
# 1. 更新版本
npm version minor  # 或 major/patch

# 2. 构建镜像
docker buildx build --platform linux/amd64,linux/arm64 \
  --file server/Dockerfile \
  --tag zj591227045/zhiweijz-backend:$(cat package.json | jq -r .version) \
  --push .

# 3. 更新compose文件
sed -i "s/zhiweijz-backend:.*/zhiweijz-backend:$(cat package.json | jq -r .version)/" docker/docker-compose.yml

# 4. 提交和标记
git add .
git commit -m "Release v$(cat package.json | jq -r .version)"
git tag "v$(cat package.json | jq -r .version)"
git push origin main --tags
```

## 9. 监控与告警

### 9.1 迁移监控指标

- 迁移执行时间
- 迁移成功率
- 数据库连接状态
- 关键表记录数量

### 9.2 告警规则

- 迁移执行超过5分钟
- 迁移失败
- 数据库连接失败超过3次
- 关键表记录数量异常变化

## 10. 故障恢复

### 10.1 迁移失败处理

```bash
# 1. 查看详细日志
docker logs zhiweijz-backend

# 2. 手动执行迁移
docker exec zhiweijz-backend node scripts/migration/migration-manager.js --force

# 3. 数据库状态检查
docker exec zhiweijz-backend npx prisma migrate status

# 4. 回滚到上一版本（如需要）
docker exec zhiweijz-backend node scripts/migration/migration-manager.js --rollback
```

### 10.2 数据恢复

- 自动备份机制
- 手动恢复流程
- 数据验证工具

## 总结

这套规范确保了：

- ✅ **版本一致性**: 后端版本与数据库架构严格对应
- ✅ **自动化迁移**: Docker启动时自动处理架构升级
- ✅ **数据安全**: 幂等性和备份机制保护数据
- ✅ **可追溯性**: 完整的迁移历史和状态跟踪
- ✅ **可回滚性**: 支持迁移回滚和故障恢复
- ✅ **标准化**: 统一的命名、结构和流程规范
