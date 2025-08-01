"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCategoryBudgetResponseDto = void 0;
/**
 * 将分类预算实体转换为响应DTO
 */
function toCategoryBudgetResponseDto(categoryBudget, category) {
    const { id, budgetId, categoryId, amount, spent, createdAt, updatedAt } = categoryBudget;
    // 计算预算执行情况
    const numericAmount = Number(amount);
    const numericSpent = Number(spent);
    const remaining = numericAmount - numericSpent;
    const percentage = numericAmount > 0 ? (numericSpent / numericAmount) * 100 : 0;
    const isOverspent = numericSpent > numericAmount;
    return {
        id,
        budgetId,
        categoryId,
        category,
        amount: numericAmount,
        spent: numericSpent,
        remaining,
        percentage,
        isOverspent,
        createdAt,
        updatedAt,
    };
}
exports.toCategoryBudgetResponseDto = toCategoryBudgetResponseDto;
