# Docker环境中计划任务显示问题修复指南

## 问题描述

在Docker部署环境中，计划任务管理器可能显示内部任务数量不正确的问题：
- 本地开发环境显示8个内部任务（6个已启用，2个已禁用）
- Docker环境只显示1个任务（"每月1日凌晨更新预算信息"）
- 后端日志显示成功注册了8个内部任务，但数据库查询返回0个启用任务

## 问题根因

通过分析发现，这是Docker环境中数据库迁移执行顺序问题导致的：
1. 迁移文件执行成功，但数据没有正确写入数据库
2. 内部任务注册正常工作，但计划任务服务查询数据库时返回空结果
3. 可能是迁移事务提交或数据库连接时序问题

## 解决方案

提供了两种解决方案：

### 方案1：自动修复脚本（推荐）

使用提供的修复脚本自动诊断和修复问题：

```bash
# 进入后端目录
cd /path/to/zhiweijz/server

# 运行修复脚本
node scripts/fix-scheduled-tasks.js
```

脚本功能：
- 🔍 诊断当前数据库中计划任务的状态
- 🔧 自动修复缺失的内部任务
- ✅ 验证修复结果
- 📊 提供详细的执行日志

### 方案2：数据库迁移修复

如果自动脚本无法解决问题，可以通过数据库迁移修复：

```bash
# 1. 手动执行修复迁移
psql -h <数据库主机> -U <数据库用户> -d zhiweijz -f migrations/incremental/fix-internal-tasks-display.sql

# 2. 重启后端服务
docker-compose restart backend
```

## 修复后的预期结果

修复完成后应该看到：
- ✅ 内部任务总数: 8个
- ✅ 已启用任务: 6个
- ✅ 已禁用任务: 2个（需要WebDAV配置的备份任务）

### 已启用的6个任务：
1. 用户注销请求处理 (user-deletion-check)
2. 会员到期检查 (membership-expiry-check)
3. 微信媒体文件清理 (wechat-media-cleanup)
4. 数据聚合（手动执行） (data-aggregation-manual)
5. 对象存储临时文件清理 (storage-temp-files-cleanup)
6. 预算结转和创建 (budget-rollover-and-creation)

### 保持禁用的2个任务：
1. 数据库备份 (database-backup) - 需要WebDAV配置
2. S3对象存储备份 (s3-backup) - 需要WebDAV配置

## 验证修复是否成功

### 1. 检查后端日志
重启后端服务后，应该看到类似日志：
```
[计划任务服务] 找到 6 个启用的任务
[计划任务服务] 计划任务初始化完成
```

### 2. 检查管理界面
在管理后端的计划任务页面应该能看到所有8个内部任务。

### 3. 运行诊断脚本
可以随时运行诊断脚本检查状态：
```bash
node scripts/fix-scheduled-tasks.js
```

## 预防措施

为避免将来出现类似问题：

1. **数据库迁移规范**：确保迁移文件使用正确的事务处理
2. **环境一致性**：保持本地开发和Docker环境的数据库配置一致
3. **监控机制**：添加计划任务状态监控，及时发现异常
4. **测试覆盖**：增加Docker环境的自动化测试

## 技术细节

### 修复脚本原理

修复脚本使用Prisma ORM直接操作数据库：
1. **诊断阶段**：查询当前数据库中的计划任务状态
2. **修复阶段**：使用UPSERT逻辑确保所有内部任务存在并配置正确
3. **验证阶段**：确认修复结果符合预期

### 数据库约束

内部任务的唯一性约束：
```sql
UNIQUE (script_type, script_path)
```

这确保了每种类型的内部任务只能有一个记录。

### 版本管理

修复脚本会更新数据库版本到v1.8.10，包含：
- 新增修复迁移文件 `fix-internal-tasks-display.sql`
- 更新版本配置文件
- 增强迁移路径生成逻辑

## 故障排除

### 常见问题

**Q: 脚本执行失败怎么办？**
A: 检查数据库连接配置，确保Prisma可以正常连接数据库。

**Q: 修复后仍然看不到任务？**
A: 重启后端服务，确保计划任务服务重新初始化。

**Q: 可以手动启用备份任务吗？**
A: 可以，但需要先配置WebDAV备份服务。

### 手动SQL查询

如果需要手动检查数据库状态：
```sql
-- 查看所有内部任务
SELECT name, script_path, is_enabled, cron_expression
FROM scheduled_tasks
WHERE script_type = 'internal'
ORDER BY script_path;

-- 查看启用任务数量
SELECT COUNT(*)
FROM scheduled_tasks
WHERE script_type = 'internal' AND is_enabled = true;
```

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 后端服务日志
2. 修复脚本执行日志
3. 数据库查询结果
4. Docker配置信息

---

**最后更新**: 2025-11-02
**版本**: v1.8.10
**维护者**: ZhiWeiJZ开发团队