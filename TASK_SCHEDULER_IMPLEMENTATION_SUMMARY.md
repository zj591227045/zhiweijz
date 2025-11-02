# 统一定时任务调度器实现总结

## 实现概述

成功实现了统一定时任务调度器系统，将原本分散在各处的7个独立定时任务统一到计划任务管理系统中进行管理。

## 核心问题分析

### 原有架构问题

1. **重复调度系统**：存在两套完全独立的定时任务调度系统
   - 硬编码定时任务（5个独立类，使用 `node-cron` 和 `setInterval`）
   - 计划任务管理系统（基于数据库配置的动态任务系统）

2. **管理混乱**：
   - 5个独立的定时任务类，各自维护自己的 cron job
   - 2种不同的调度机制（`node-cron` vs `setInterval`）
   - 零统一管理：无法在一个地方查看所有定时任务状态
   - 零执行日志：硬编码任务没有执行历史记录

3. **维护困难**：
   - 修改任务时间需要改代码、重启服务
   - 无法统一监控所有任务的执行状态
   - 任务失败后无法追溯和重试

## 解决方案

### 架构设计

采用**渐进式迁移**策略，支持新旧系统并存：

```
┌─────────────────────────────────────────────────────────┐
│                    服务器启动                              │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ USE_UNIFIED_SCHEDULER? │
              └───────────────────────┘
                    │           │
         ┌──────────┘           └──────────┐
         ▼                                  ▼
   ┌─────────┐                        ┌─────────┐
   │ true    │                        │ false   │
   └─────────┘                        └─────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│  统一调度器模式   │              │  传统模式         │
├──────────────────┤              ├──────────────────┤
│ 1. 注册内部任务   │              │ 1. 数据聚合服务   │
│ 2. 启动计划任务   │              │ 2. 用户注销任务   │
│ 3. 预算结转任务   │              │ 3. 预算结转任务   │
│                  │              │ 4. 微信清理任务   │
│                  │              │ 5. 会员检查任务   │
│                  │              │ 6. 注册内部任务   │
│                  │              │ 7. 启动计划任务   │
└──────────────────┘              └──────────────────┘
```

### 核心组件

#### 1. 内部任务注册表 (`internal-task-registry.ts`)

```typescript
// 单例模式，全局唯一
class InternalTaskRegistry {
  private tasks: Map<string, InternalTask> = new Map();
  
  register(task: InternalTask): void { ... }
  async execute(key: string): Promise<void> { ... }
  getAllTasks(): InternalTask[] { ... }
}
```

**特点：**
- 统一的任务注册接口
- 统一的任务执行入口
- 完整的执行日志

#### 2. 扩展的计划任务服务 (`scheduled-task.admin.service.ts`)

**新增功能：**
- 支持 `scriptType: 'internal'` 类型
- 内部任务通过 `internalTaskRegistry.execute()` 执行
- 外部脚本通过 `spawn` 执行

**执行流程：**
```typescript
if (task.scriptType === 'internal') {
  await internalTaskRegistry.execute(task.scriptPath);
} else {
  // 执行外部脚本 (shell/sql/node)
}
```

#### 3. 任务注册模块 (`register-internal-tasks.ts`)

注册了6个内部任务：

| 任务Key | 任务名称 | Cron表达式 | 说明 |
|---------|---------|-----------|------|
| `user-deletion-check` | 用户注销请求处理 | `0 0 * * *` | 每天0点 |
| `membership-expiry-check` | 会员到期检查 | `30 * * * *` | 每小时30分 |
| `wechat-media-cleanup` | 微信媒体文件清理 | `0 * * * *` | 每小时 |
| `data-aggregation-manual` | 数据聚合 | `0 * * * *` | 每小时 |
| `storage-temp-files-cleanup` | 对象存储临时文件清理 | `0 2 * * *` | 每天2点 |
| `budget-rollover-and-creation` | 预算结转和创建 | `0 2 1 * *` | 每月1号2点 |

## 实现细节

### 文件变更

#### 新增文件

1. `server/src/admin/services/internal-task-registry.ts` - 内部任务注册表
2. `server/src/admin/services/register-internal-tasks.ts` - 任务注册模块
3. `server/migrations/incremental/add-internal-scheduled-tasks.sql` - 数据库迁移
4. `docs/backend/unified-task-scheduler.md` - 详细文档
5. `server/UNIFIED_SCHEDULER_MIGRATION.md` - 迁移指南

#### 修改文件

1. `server/src/admin/services/scheduled-task.admin.service.ts`
   - 添加 `internal` 脚本类型支持
   - 修改 `runScript` 方法处理内部任务
   - 修改 `createTask` 方法验证内部任务

2. `server/src/server.ts`
   - 添加 `USE_UNIFIED_SCHEDULER` 环境变量判断
   - 实现双轨运行逻辑

3. `server/prisma/schema.prisma`
   - 更新 `ScheduledTask` 模型注释，支持 `internal` 类型

4. `server/.env.example`
   - 添加 `USE_UNIFIED_SCHEDULER` 配置说明

### 数据库变更

新增6条计划任务记录（默认禁用状态）：

```sql
INSERT INTO scheduled_tasks (
  name, description, script_type, script_path, 
  cron_expression, is_enabled
) VALUES
  ('用户注销请求处理', '...', 'internal', 'user-deletion-check', '0 0 * * *', false),
  ('会员到期检查', '...', 'internal', 'membership-expiry-check', '30 * * * *', false),
  -- ... 其他任务
```

## 使用方式

### 启用统一调度器

#### 1. 运行数据库迁移

```bash
cd server
npm run migrate:upgrade
```

#### 2. 设置环境变量

在 `.env` 文件中添加：

```bash
USE_UNIFIED_SCHEDULER=true
```

#### 3. 重启服务器

```bash
npm run dev
```

#### 4. 在管理界面启用任务

访问管理后台 -> 计划任务管理 -> 逐个启用任务

### 验证任务执行

- 查看执行日志
- 确认任务正常运行
- 对比新旧系统的执行结果

## 优势

### 1. 统一管理

- 所有定时任务在一个地方管理
- 统一的执行日志和错误追踪
- 可视化的任务状态监控

### 2. 灵活配置

- 可通过管理界面动态启用/禁用任务
- 可修改Cron表达式无需重启服务
- 支持手动触发任务执行

### 3. 可追溯性

- 完整的执行历史记录
- 详细的错误日志
- 执行时长统计

### 4. 零破坏性

- 支持新旧系统并存
- 可随时回滚到传统模式
- 渐进式迁移，风险可控

## 后续工作

### 阶段三：清理遗留代码（可选）

在统一调度器稳定运行后，可以考虑删除以下文件：

1. `server/src/tasks/membership-expiry-check.task.ts`
2. `server/src/tasks/wechat-media-cleanup.task.ts`
3. `server/src/services/user-deletion.service.ts` 中的 `startScheduledDeletion` 方法
4. `server/src/admin/scripts/start-aggregation.ts` 中的定时任务逻辑

**注意：** 建议在生产环境稳定运行至少1个月后再执行清理。

### 未来增强

1. **任务依赖关系**：支持任务A完成后执行任务B
2. **自动重试**：任务执行失败自动重试
3. **通知机制**：任务执行结果通知（邮件/webhook）
4. **统计可视化**：任务执行统计和趋势分析
5. **分布式调度**：支持多实例环境的任务调度

## 测试建议

### 单元测试

- [ ] 测试内部任务注册和执行
- [ ] 测试计划任务服务的内部任务调度
- [ ] 测试环境变量开关逻辑

### 集成测试

- [ ] 测试统一调度器模式下所有任务正常执行
- [ ] 测试传统模式下所有任务正常执行
- [ ] 测试模式切换不影响任务执行

### 生产验证

- [ ] 在测试环境启用统一调度器，运行1周
- [ ] 对比新旧系统的执行结果
- [ ] 验证执行日志完整性
- [ ] 验证任务执行时间准确性

## 总结

本次实现成功解决了定时任务管理混乱的问题，通过引入统一调度器系统，实现了：

1. ✅ **统一管理**：所有定时任务集中管理
2. ✅ **可追溯性**：完整的执行日志和错误追踪
3. ✅ **灵活配置**：动态启用/禁用，无需重启服务
4. ✅ **零破坏性**：支持新旧系统并存，可随时回滚
5. ✅ **易扩展性**：轻松添加新的内部任务或外部脚本

系统现在处于**双轨运行**状态，可以根据实际需求选择使用传统模式或统一调度器模式。建议在测试环境充分验证后，逐步迁移到统一调度器模式。

