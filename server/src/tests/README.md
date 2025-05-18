# 活跃预算API修复说明

## 问题描述

活跃预算API (`/budgets/active`) 返回了所有用户的预算，而不是仅返回当前用户的个人预算和所属家庭的预算。

## 修复内容

1. 更新了 `BudgetWithCategory` 类型定义，添加了 `accountBook` 字段，包含账本的 ID、名称、类型和家庭 ID。

2. 修改了 `BudgetResponseDto` 接口，添加了 `accountBookName` 和 `accountBookType` 字段，用于前端显示。

3. 重构了 `findActiveBudgets` 方法：
   - 查询用户所属的所有家庭 ID
   - 构建查询条件，包括用户的个人预算和用户所属家庭的预算
   - 添加了详细的日志记录，便于调试

4. 更新了 `getActiveBudgets` 服务方法，确保返回的预算包含账本信息。

## 测试结果

测试脚本 `test-active-budgets.js` 验证了修复的有效性：
- 正确查询了用户的个人预算和所属家庭的预算
- 返回了预算的账本信息，包括账本类型和家庭ID
- 不再返回其他用户的预算

## 注意事项

前端已经实现了根据账本类型和家庭ID过滤预算的逻辑，因此不需要修改前端代码。
