# 家庭成员消费统计逻辑重构

## 概述

本次重构统一了家庭成员消费统计的逻辑，解决了托管成员和普通成员在记账归属和统计查询方面的不一致问题。

## 问题分析

### 原有问题

1. **记账归属逻辑混乱**：
   - 托管成员使用 `familyMemberId` 查询
   - 普通成员使用 `userId` 查询
   - 导致统计结果不准确

2. **预算归属不一致**：
   - 有些托管成员预算设置了 `familyMemberId`
   - 有些托管成员预算没有设置 `familyMemberId`
   - 普通用户预算不设置 `familyMemberId`

3. **数据模型混乱**：
   - 新旧架构并存
   - `familyMember.isCustodial` 与 `user.isCustodial` 不一致

## 解决方案

### 核心原则

**托管成员除了无法登录外，其他处理方式与普通用户完全一致**

### 统一的数据流

1. **预算归属**：
   - 所有个人预算：`Budget.userId` 指向用户ID，`Budget.familyMemberId` 为空
   - 通用预算：`Budget.userId` 和 `Budget.familyMemberId` 都为空

2. **记账归属**：
   - 根据预算的 `userId` 查找对应的 `FamilyMember.id`
   - 设置记账的 `familyMemberId` 为查找到的家庭成员ID
   - 无论是普通用户还是托管用户，都使用相同逻辑

3. **统计查询**：
   - 统一使用 `Transaction.familyMemberId` 进行查询
   - 不再区分托管成员和普通成员

## 修改内容

### 1. 家庭成员统计逻辑 (`family.service.ts`)

**修改前**：
```typescript
...(member.isCustodial
  ? { familyMemberId: member.id } // 托管成员通过familyMemberId查询
  : member.userId ? { userId: member.userId } : {} // 普通成员通过userId查询
),
```

**修改后**：
```typescript
familyMemberId: member.id, // 统一使用familyMemberId查询
```

### 2. 预算记账查询逻辑 (`transaction.service.ts`)

**修改前**：
```typescript
if (familyMember.isCustodial) {
  // 如果是托管成员，使用familyMemberId过滤
  where.familyMemberId = familyMemberId;
} else if (familyMember.userId) {
  // 如果是普通家庭成员，使用userId过滤
  where.userId = familyMember.userId;
}
```

**修改后**：
```typescript
// 统一使用familyMemberId过滤，无论是托管成员还是普通成员
where.familyMemberId = familyMemberId;
```

### 3. 托管成员判断逻辑

**修改前**：
```typescript
isCustodial: member.isCustodial || false,
```

**修改后**：
```typescript
// 检查成员是否为托管成员（通过关联的用户判断）
let isCustodial = false;
if (member.userId) {
  const user = await prisma.user.findUnique({
    where: { id: member.userId },
    select: { isCustodial: true }
  });
  isCustodial = user?.isCustodial || false;
}
```

## 数据一致性

### 记账创建流程

1. 用户选择预算进行记账
2. 系统根据预算的 `userId` 查找对应的 `FamilyMember.id`
3. 记账记录的 `familyMemberId` 设置为查找到的家庭成员ID
4. 统计时使用 `familyMemberId` 进行归属

### 示例场景

**场景**：用户A为托管成员B记账，选择了B的个人预算

1. B的预算：`{ userId: "custodial_user_b_id", familyMemberId: null }`
2. 查找家庭成员：`FamilyMember.findFirst({ userId: "custodial_user_b_id" })`
3. 记账记录：`{ familyMemberId: "family_member_b_id", userId: "user_a_id" }`
4. 统计时：该记账归属于托管成员B

## 优势

1. **逻辑统一**：托管成员和普通成员使用相同的处理逻辑
2. **数据准确**：记账归属基于预算所有者，而非创建者
3. **易于维护**：减少了特殊情况的处理代码
4. **扩展性好**：未来添加新的成员类型无需修改核心逻辑

## 兼容性

- 保持了与现有数据的兼容性
- 支持新旧架构的托管成员
- 不影响现有的记账记录

## 测试建议

1. 测试普通用户为自己记账
2. 测试普通用户为托管成员记账
3. 测试托管成员预算的记账归属
4. 测试通用预算的记账归属
5. 测试成员消费统计的准确性
