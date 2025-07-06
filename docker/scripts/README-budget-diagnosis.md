# Docker环境预算管理系统诊断工具

## 概述

这些脚本专门为Docker环境设计，用于诊断和修复预算管理系统中的问题，特别是：
- 家庭账本成员预算创建失败
- 预算结转功能失效

## 使用方法

### 1. 快速诊断

```bash
# 进入docker目录
cd docker

# 给脚本执行权限
chmod +x scripts/budget-diagnosis-docker.sh
chmod +x scripts/budget-fix-docker.sh

# 运行快速诊断
bash scripts/budget-diagnosis-docker.sh
```

### 2. 数据修复

```bash
# 运行数据修复（会提供预览和执行两种模式）
bash scripts/budget-fix-docker.sh
```

## 脚本功能

### budget-diagnosis-docker.sh
- 检查Docker容器状态
- 分析家庭结构和成员状态
- 统计预算创建情况
- 识别定时任务覆盖问题
- 分析预算结转状态
- 生成问题报告和修复建议

### budget-fix-docker.sh
- 自动创建缺失的家庭成员预算
- 修复预算结转金额错误
- 支持预览模式（不修改数据）
- 支持执行模式（实际修复数据）
- 验证修复结果

## 安全注意事项

### 数据备份
在执行数据修复前，强烈建议备份数据库：

```bash
# 备份数据库
docker exec zhiweijz-postgres pg_dump -U zhiweijz zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql

# 如果需要恢复（谨慎操作）
# docker exec -i zhiweijz-postgres psql -U zhiweijz -d zhiweijz < backup_file.sql
```

### 执行模式
1. **预览模式**: 只分析问题，不修改数据，安全无风险
2. **执行模式**: 会实际修改数据库，需要谨慎操作

## 常见问题

### Q: 脚本报错"容器未运行"
A: 确保Docker服务已启动：
```bash
docker-compose up -d
docker-compose ps  # 检查容器状态
```

### Q: 权限错误
A: 给脚本执行权限：
```bash
chmod +x scripts/*.sh
```

### Q: 数据库连接失败
A: 检查数据库容器状态：
```bash
docker-compose logs postgres
docker exec zhiweijz-postgres pg_isready -U zhiweijz
```

## 输出示例

### 诊断输出
```
🔍 Docker环境预算管理系统快速诊断
==================================================
检查期间: 2024-1

📊 基础统计:
   家庭账本数量: 5
   家庭成员总数: 12
   注册成员: 8
   托管成员: 4

💰 当前月份预算统计:
   总预算数: 10
   个人预算: 8
   托管预算: 2

⏰ 定时任务覆盖分析:
   定时任务会处理: 8 个用户
   实际应处理: 12 个用户
   ❌ 遗漏用户: 4 个

🚨 问题识别:
   1. ❌ 定时任务遗漏 4 个用户的预算创建
   2. ❌ 家庭账本 "张家账本" 缺少 2 个成员预算
```

### 修复输出
```
🔧 1. 修复缺失的家庭成员预算
--------------------------------------------------

处理家庭账本: 张家账本 (abc123)
  注册成员: 3, 托管成员: 2
  ❌ 缺少预算: 张三 (user123)
  ✅ 已创建预算
  ❌ 缺少托管预算: 小明
  ✅ 已创建托管预算

修复统计: 实际创建了 2 个预算
```

## 技术原理

### 问题根源
1. **定时任务逻辑缺陷**: `budget-scheduler.service.ts` 中的查询条件 `familyMemberId: null` 排除了托管用户
2. **结转逻辑问题**: `processBudgetRollover` 只计算结转金额，未实际应用到新预算

### 修复策略
1. **预算创建**: 为缺失预算的家庭成员创建当月预算
2. **结转修复**: 重新计算并应用正确的结转金额
3. **数据验证**: 确保修复后的数据完整性

## 监控建议

### 定期检查
建议每月运行一次诊断脚本，确保预算系统正常运行：

```bash
# 可以设置cron job
0 2 1 * * cd /path/to/docker && bash scripts/budget-diagnosis-docker.sh
```

### 日志监控
关注以下日志：
- 预算创建失败日志
- 定时任务执行日志
- 数据库连接错误

## 联系支持

如果遇到脚本无法解决的问题，请提供：
1. 诊断脚本的完整输出
2. Docker容器日志：`docker-compose logs backend`
3. 数据库状态：`docker-compose ps`
