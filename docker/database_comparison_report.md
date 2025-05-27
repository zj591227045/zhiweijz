# 数据库结构对比报告

生成时间: Wed May 28 00:55:07 CST 2025
生产数据库: postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz
初始化文件: config/init.sql

## 表结构对比

### 生产环境表列表
```
_prisma_migrations
account_books
ai_models
budget_histories
budgets
categories
category_budgets
families
family_members
invitations
password_reset_tokens
security_logs
sessions
transactions
user_account_books
user_category_configs
user_feedback
user_llm_settings
user_settings
users
verification_codes
```

### 初始化文件表列表
```
account_books
account_llm_settings
ai_models
budget_histories
budgets
categories
category_budgets
families
family_members
invitations
password_reset_tokens
security_logs
sessions
transactions
user_account_books
user_category_configs
user_feedback
user_llm_settings
user_settings
users
verification_codes
```

### 枚举类型
```
AccountBookType
BudgetPeriod
BudgetType
Role
RolloverType
TransactionType
```

## 建议

1. 如果发现缺失的表或字段，请更新Prisma schema
2. 重新运行 `./scripts/generate-schema.sh` 生成最新的初始化文件
3. 使用 `./scripts/reset-database.sh --both` 重置数据库状态

## 下一步

- [ ] 修复发现的问题
- [ ] 重新生成初始化文件
- [ ] 测试部署
