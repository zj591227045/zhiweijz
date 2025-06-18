# 家庭账本交易记录修复脚本使用指南

## 概述

这些脚本用于修复家庭账本中交易记录的家庭成员ID归属问题。当导入的交易记录的家庭成员ID都指向导入者时，可以使用这些脚本根据预算ID找到正确的家庭成员ID并进行修复。

## 脚本文件

- `analyze-family-transactions.js` - 分析家庭账本交易记录归属情况
- `fix-family-member-ids.js` - 修复家庭成员ID归属问题
- `fix-budget-family-associations.js` - 修复预算的家庭关联问题
- `comprehensive-family-fix.js` - 综合修复预算和交易的家庭关联问题（推荐）

## Docker环境使用方法

### 推荐流程（使用综合修复脚本）

```bash
# 1. 进入容器
docker exec -it <container_name> bash

# 2. 分析数据（了解问题范围）
node scripts/analyze-family-transactions.js <accountBookId>

# 3. 综合预览修复（预算+交易）
node scripts/comprehensive-family-fix.js <accountBookId> preview

# 4. 执行综合修复
node scripts/comprehensive-family-fix.js <accountBookId> fix
```

### 分步修复流程（如需精细控制）

```bash
# 1. 分析数据
node scripts/analyze-family-transactions.js <accountBookId>

# 2. 修复预算关联
node scripts/fix-budget-family-associations.js preview
node scripts/fix-budget-family-associations.js fix

# 3. 修复交易归属
node scripts/fix-family-member-ids.js <accountBookId> preview
node scripts/fix-family-member-ids.js <accountBookId> fix
```

## 本地环境使用方法

```bash
# 确保在项目根目录
cd /path/to/zhiweijz

# 分析数据
node scripts/analyze-family-transactions.js <accountBookId>

# 预览修复
node scripts/fix-family-member-ids.js <accountBookId> preview

# 执行修复
node scripts/fix-family-member-ids.js <accountBookId> fix
```

## 获取账本ID

### 方法1：通过数据库查询
```sql
-- 查询所有家庭账本
SELECT id, name, family_id FROM account_books WHERE type = 'FAMILY';

-- 查询特定家庭的账本
SELECT ab.id, ab.name, f.name as family_name 
FROM account_books ab 
JOIN families f ON ab.family_id = f.id 
WHERE ab.type = 'FAMILY' AND f.name LIKE '%家庭名称%';
```

### 方法2：通过应用界面
1. 登录管理员账户
2. 进入家庭管理页面
3. 查看账本详情，URL中包含账本ID

## 修复逻辑说明

脚本会根据以下逻辑修复家庭成员ID：

1. **预算归属优先**：
   - 检查交易的预算ID
   - 根据预算的所有者确定正确的家庭成员ID

2. **统一处理逻辑**：
   - 旧架构：预算直接关联家庭成员ID
   - 新架构：预算关联用户ID，通过用户ID查找家庭成员ID

3. **数据验证**：
   - 只处理有预算ID的交易
   - 跳过已经正确的记录
   - 记录处理失败的情况

## 输出示例

### 分析脚本输出：
```
🔍 分析账本 abc123 的交易记录归属情况...
✅ 家庭账本: 我的家庭账本
   家庭ID: family123

👥 家庭成员列表:
   member1: 张三 (用户: 张三, 普通)
   member2: 李四 (用户: 李四, 托管)

📊 交易记录统计:
   总交易数: 150
   有预算ID: 120
   有家庭成员ID: 150

⚠️  潜在问题检查:
   🔴 有 45 条记录有预算但家庭成员ID不正确
```

### 预览模式输出：
```
🔍 [预览] 交易 abc12345: member1 -> member2
    金额: 50.00, 日期: 2024-01-15
    预算: 李四的餐饮预算 (李四)

📈 预览结果统计:
🔍 需要修复: 45 条
✓  已正确跳过: 75 条

💡 要执行实际修复，请运行:
   node scripts/fix-family-member-ids.js abc123 fix
```

### 修复模式输出：
```
✅ 修复交易 abc12345: member1 -> member2

📈 修复结果统计:
✅ 成功修复: 45 条
✓  已正确跳过: 75 条
❌ 处理失败: 0 条

🎉 修复完成！共处理 120 条记录
```

## 安全注意事项

1. **数据备份**：执行修复前务必备份数据库
2. **测试环境**：建议先在测试环境验证
3. **预览模式**：始终先运行预览模式确认修复内容
4. **逐步执行**：按照推荐步骤逐步执行

## 常见问题

### Q: 脚本提示"账本不存在"
A: 检查账本ID是否正确，确保是完整的UUID格式

### Q: 脚本提示"不是家庭账本"
A: 确认账本类型为FAMILY，个人账本不需要修复

### Q: 修复后统计数据不对
A: 重新运行分析脚本检查，可能需要刷新应用缓存

### Q: Docker容器中找不到脚本文件
A: 确保脚本文件已正确复制到容器中，检查文件路径

## 技术支持

如遇问题，请提供：
- 完整的错误信息
- 账本ID
- 分析脚本的输出结果
- 数据库和环境信息

## 相关文档

- [家庭成员统计逻辑重构文档](../docs/backend/member-statistics-refactor.md)
- [交易创建端点审计报告](../docs/backend/transaction-creation-endpoints-audit.md)
