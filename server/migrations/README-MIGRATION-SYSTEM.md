# 数据库迁移系统重构说明

## 概述

本次重构解决了数据库迁移系统中的以下问题：
1. SQL语法错误（PostgreSQL函数定义）
2. 迁移路径重复和混乱
3. 数据完整性检查在表不存在时报错
4. 版本管理复杂，维护成本高

## 修复内容

### 1. SQL语法错误修复
- 修复了 `admin-features.sql` 中PostgreSQL函数定义的语法错误
- 确保 `$$` 块正确闭合，添加分号结束符

### 2. 迁移路径重构
- 移除了重复的版本路径（1.7.15、1.7.16、1.7.17）
- 基于实际发布的应用版本重新设计迁移路径
- 当前支持的版本映射：
  - 应用版本 0.2.5 → 数据库版本 1.6.0
  - 应用版本 0.5.1 → 数据库版本 1.7.12
  - 应用版本 0.6.0 → 数据库版本 1.7.16
  - 应用版本 0.7.0 → 数据库版本 1.8.2（当前最新）

### 3. 数据完整性检查优化
- 在检查表数据前先验证表是否存在
- 避免在全新安装时出现"表不存在"的错误
- 改进错误处理和日志输出

### 4. 迁移管理系统重构
- 创建了模块化的版本配置系统（`version-config.js`）
- 实现了自动迁移路径生成器（`migration-path-generator.js`）
- 简化了迁移管理器的配置复杂度
- 减少了人工维护成本

## 新增文件

### `server/migrations/version-config.js`
- 定义应用版本与数据库版本的映射关系
- 提供版本比较和验证功能
- 管理版本发布历史

### `server/migrations/migration-path-generator.js`
- 自动生成迁移路径
- 基于版本历史计算需要的迁移文件
- 验证迁移文件完整性

### `server/migrations/test-migration-system.js`
- 迁移系统测试脚本
- 验证迁移路径正确性
- 生成迁移报告

## 使用方法

### 运行迁移
```bash
# 升级到最新版本
node migrations/migration-manager.js migrate

# 检查迁移状态
node migrations/migration-manager.js status

# 查看当前版本
node migrations/migration-manager.js version
```

### 测试迁移系统
```bash
# 运行完整测试
node migrations/test-migration-system.js

# 检查数据完整性
node migrations/data-integrity-check.js
```

### Docker环境
```bash
# 在Docker容器中运行迁移
docker exec zhiweijz-backend node migrations/migration-manager.js migrate

# 运行诊断脚本
docker exec zhiweijz-backend bash docker/scripts/diagnose-migration.sh
```

## 迁移路径示例

### 从应用版本0.2.5升级到0.7.0
数据库版本：1.6.0 → 1.8.2
需要执行20个迁移文件

### 从应用版本0.5.1升级到0.7.0
数据库版本：1.7.12 → 1.8.2
需要执行6个迁移文件：
- add-budget-unique-constraint
- add-version-management
- add-detail-url-to-app-versions
- 1.8.0-expand-membership-system
- update-smart-accounting-prompts-v1.8.1
- add-registration-gift-config

### 从应用版本0.6.0升级到0.7.0
数据库版本：1.7.16 → 1.8.2
需要执行3个迁移文件：
- 1.8.0-expand-membership-system
- update-smart-accounting-prompts-v1.8.1
- add-registration-gift-config

### 全新安装
需要执行32个迁移文件，包含完整的数据库结构

## 最佳实践

### 1. 版本发布流程
1. 确定新的数据库版本号
2. 在 `version-config.js` 中添加版本映射
3. 在 `migration-path-generator.js` 中配置迁移文件
4. 运行测试验证迁移路径
5. 更新应用版本映射

### 2. 迁移文件命名
- 功能性迁移：`add-feature-name.sql`
- 版本升级：`1.x.0-to-1.y.0.sql`
- 修复性迁移：`fix-issue-description.sql`

### 3. 错误处理
- 所有迁移都支持幂等性（可重复执行）
- 使用 `IF NOT EXISTS` 和 `ON CONFLICT` 语句
- 适当的错误忽略机制

## 故障排除

### 常见问题
1. **迁移文件不存在**：检查文件路径和命名
2. **SQL语法错误**：验证PostgreSQL语法，特别是函数定义
3. **数据完整性问题**：运行数据完整性检查脚本
4. **版本不匹配**：检查版本配置和映射关系

### 日志分析
- `[MIGRATION]` 前缀：迁移执行日志
- `[DATA-CHECK]` 前缀：数据完整性检查日志  
- `[TEST]` 前缀：测试脚本日志

## 维护建议

1. **定期测试**：在每次发布前运行迁移测试
2. **版本管理**：保持版本映射的准确性
3. **文档更新**：及时更新迁移路径文档
4. **备份策略**：在生产环境执行迁移前备份数据库

## 技术支持

如遇到迁移问题，请：
1. 运行 `node migrations/test-migration-system.js` 生成诊断报告
2. 检查 `migration-test-report.json` 文件
3. 提供详细的错误日志和环境信息
