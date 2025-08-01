"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toBudgetResponseDto = void 0;
const client_1 = require("@prisma/client");
/**
 * 将预算实体转换为响应DTO
 */
function toBudgetResponseDto(budget, category, spent) {
    const { id, name, amount, period, categoryId, startDate, endDate, rollover, userId, familyId, accountBookId, createdAt, updatedAt, } = budget;
    // 使用类型断言获取新字段
    const budgetAny = budget;
    const enableCategoryBudget = budgetAny.enableCategoryBudget;
    const isAutoCalculated = budgetAny.isAutoCalculated;
    const rolloverAmount = budgetAny.rolloverAmount;
    const budgetType = budgetAny.budgetType || client_1.BudgetType.PERSONAL;
    const amountModified = budgetAny.amountModified;
    const lastAmountModifiedAt = budgetAny.lastAmountModifiedAt;
    const familyMemberId = budgetAny.familyMemberId;
    const refreshDay = budgetAny.refreshDay;
    // 获取托管成员信息
    const familyMember = budgetAny.familyMember;
    // 计算预算执行情况
    const numericAmount = Number(amount);
    const numericRolloverAmount = rolloverAmount ? Number(rolloverAmount) : 0;
    const numericSpent = spent !== undefined ? Number(spent) : undefined;
    const remaining = numericSpent !== undefined ? numericAmount - numericSpent : undefined;
    // 计算总可用金额（基础预算 + 结转金额）
    const totalAvailable = numericAmount + numericRolloverAmount;
    // 计算考虑结转后的剩余金额：总可用金额 - 已用金额
    const adjustedRemaining = numericSpent !== undefined ? totalAvailable - numericSpent : undefined;
    // 计算基于总可用金额的进度百分比
    const progress = numericSpent !== undefined && totalAvailable > 0
        ? (numericSpent / totalAvailable) * 100
        : undefined;
    // 计算日均统计
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.max(0, totalDays - daysRemaining);
    const dailySpent = elapsedDays > 0 && numericSpent !== undefined ? numericSpent / elapsedDays : 0;
    const dailyAvailable = daysRemaining > 0 && adjustedRemaining !== undefined ? adjustedRemaining / daysRemaining : 0;
    return {
        id,
        name,
        amount: numericAmount,
        period,
        categoryId: categoryId || undefined,
        category,
        startDate,
        endDate,
        rollover,
        enableCategoryBudget: enableCategoryBudget ?? false,
        isAutoCalculated: isAutoCalculated ?? false,
        userId: userId || '',
        userName: undefined,
        familyId: familyId || undefined,
        familyMemberId: familyMemberId || undefined,
        familyMemberName: familyMember ? familyMember.name : undefined,
        accountBookId: accountBookId || undefined,
        budgetType: budgetType,
        rolloverAmount: numericRolloverAmount,
        refreshDay: refreshDay || 1,
        createdAt,
        updatedAt,
        spent: numericSpent,
        remaining,
        progress,
        adjustedRemaining,
        daysRemaining,
        dailySpent,
        dailyAvailable,
        amountModified,
        lastAmountModifiedAt,
    };
}
exports.toBudgetResponseDto = toBudgetResponseDto;
