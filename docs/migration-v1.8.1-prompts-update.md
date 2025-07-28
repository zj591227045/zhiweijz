# 版本1.8.1提示词强制更新迁移指南

## 概述

版本1.8.1包含了对智能记账和图片分析提示词的强制更新，确保所有用户使用最新优化的提示词配置。

## 更新内容

### 1. 智能记账主要分析提示词 (`smart_accounting_prompt`)
- **更新内容**: 优化了提示词结构和格式要求
- **主要改进**: 
  - 更清晰的分类和预算列表格式
  - 优化的JSON返回格式说明
  - 更准确的字段描述

### 2. 图片分析提示词 (`smart_accounting_image_analysis_prompt`)
- **更新内容**: 增强了图片识别能力和输出格式
- **主要改进**:
  - 支持多订单识别（数组格式输出）
  - 更详细的字段说明
  - 优化的错误处理

## 迁移方式

### 自动迁移（推荐）

系统会在启动时自动检测版本并执行迁移：

```bash
# Docker环境
docker-compose up -d

# 或手动执行迁移
cd server
node migrations/migration-manager.js migrate 1.8.1
```

### 手动迁移

如果需要手动执行迁移：

```bash
# 进入服务器目录
cd server

# 执行测试脚本（可选）
node scripts/test-migration-v1.8.1.js

# 执行迁移管理器
node migrations/migration-manager.js migrate 1.8.1
```

### Docker环境手动迁移

```bash
# 进入容器执行迁移
docker exec zhiweijz-backend node migrations/migration-manager.js migrate 1.8.1

# 或使用专用脚本
docker/scripts/manual-migrate.sh
```

## 迁移特点

### 强制更新策略
- **与之前不同**: 此次迁移会**强制覆盖**现有的提示词配置
- **原因**: 确保所有用户使用经过优化的最新提示词
- **影响**: 用户之前的自定义提示词配置将被覆盖

### 安全措施
- 迁移在数据库事务中执行，确保原子性
- 包含详细的验证逻辑
- 记录迁移日志便于追踪

## 验证迁移结果

### 1. 检查提示词版本标记
迁移成功后，提示词的描述字段会包含 `(v1.8.1更新)` 标记。

### 2. 查看迁移日志
系统会创建迁移日志记录：
- Key: `migration_log_v1.8.1_prompts_update`
- Value: 迁移执行时间

### 3. 管理员界面验证
登录管理员后台，在多模态AI配置页面查看提示词是否已更新。

## 回滚方案

如果需要回滚到之前的提示词配置：

```sql
-- 手动回滚到之前的配置（需要管理员权限）
UPDATE system_configs 
SET value = '旧的提示词内容',
    description = '回滚说明',
    updated_at = NOW()
WHERE key = 'smart_accounting_prompt';

UPDATE system_configs 
SET value = '旧的提示词内容',
    description = '回滚说明', 
    updated_at = NOW()
WHERE key = 'smart_accounting_image_analysis_prompt';
```

## 注意事项

1. **备份建议**: 虽然迁移是安全的，但建议在生产环境执行前备份数据库
2. **服务重启**: 迁移完成后建议重启服务以确保配置生效
3. **用户通知**: 如果用户有自定义提示词，建议提前通知此次强制更新
4. **测试验证**: 可以先在测试环境执行迁移验证效果

## 故障排除

### 迁移失败
```bash
# 检查迁移状态
node migrations/migration-manager.js status

# 查看详细日志
docker logs zhiweijz-backend
```

### 提示词未生效
```bash
# 重启服务
docker-compose restart backend

# 或清除缓存（如果有）
docker exec zhiweijz-backend npm run cache:clear
```

## 技术细节

- **迁移文件**: `server/migrations/incremental/update-smart-accounting-prompts-v1.8.1.sql`
- **版本管理**: 更新 `LATEST_VERSION` 到 `1.8.1`
- **升级路径**: `1.8.0` → `1.8.1`
- **执行方式**: 强制UPDATE而非INSERT...ON CONFLICT
