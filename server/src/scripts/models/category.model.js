"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCategoryOrder = exports.defaultCategories = exports.toCategoryResponseDto = void 0;
const client_1 = require("@prisma/client");
/**
 * 将分类实体转换为响应DTO
 */
function toCategoryResponseDto(category) {
    return {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon || undefined,
        userId: category.userId || undefined,
        familyId: category.familyId || undefined,
        isDefault: category.isDefault,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
    };
}
exports.toCategoryResponseDto = toCategoryResponseDto;
/**
 * 默认分类数据（包含默认排序）
 */
exports.defaultCategories = [
    // 支出分类（按指定顺序）
    { name: '餐饮', type: client_1.TransactionType.EXPENSE, icon: 'restaurant', isDefault: true },
    { name: '购物', type: client_1.TransactionType.EXPENSE, icon: 'shopping', isDefault: true },
    { name: '日用', type: client_1.TransactionType.EXPENSE, icon: 'daily', isDefault: true },
    { name: '交通', type: client_1.TransactionType.EXPENSE, icon: 'transport', isDefault: true },
    { name: '运动', type: client_1.TransactionType.EXPENSE, icon: 'sports', isDefault: true },
    { name: '娱乐', type: client_1.TransactionType.EXPENSE, icon: 'entertainment', isDefault: true },
    { name: '通讯', type: client_1.TransactionType.EXPENSE, icon: 'communication', isDefault: true },
    { name: '服饰', type: client_1.TransactionType.EXPENSE, icon: 'clothing', isDefault: true },
    { name: '美容', type: client_1.TransactionType.EXPENSE, icon: 'beauty', isDefault: true },
    { name: '居家', type: client_1.TransactionType.EXPENSE, icon: 'home', isDefault: true },
    { name: '孩子', type: client_1.TransactionType.EXPENSE, icon: 'child', isDefault: true },
    { name: '长辈', type: client_1.TransactionType.EXPENSE, icon: 'elder', isDefault: true },
    { name: '社交', type: client_1.TransactionType.EXPENSE, icon: 'social', isDefault: true },
    { name: '旅行', type: client_1.TransactionType.EXPENSE, icon: 'travel', isDefault: true },
    { name: '数码', type: client_1.TransactionType.EXPENSE, icon: 'digital', isDefault: true },
    { name: '汽车', type: client_1.TransactionType.EXPENSE, icon: 'car', isDefault: true },
    { name: '医疗', type: client_1.TransactionType.EXPENSE, icon: 'medical', isDefault: true },
    { name: '还款', type: client_1.TransactionType.EXPENSE, icon: 'repayment', isDefault: true },
    { name: '保险', type: client_1.TransactionType.EXPENSE, icon: 'insurance', isDefault: true },
    { name: '学习', type: client_1.TransactionType.EXPENSE, icon: 'education', isDefault: true },
    { name: '办公', type: client_1.TransactionType.EXPENSE, icon: 'office', isDefault: true },
    { name: '维修', type: client_1.TransactionType.EXPENSE, icon: 'repair', isDefault: true },
    { name: '利息', type: client_1.TransactionType.EXPENSE, icon: 'interest', isDefault: true },
    // 收入分类（按指定顺序）
    { name: '工资', type: client_1.TransactionType.INCOME, icon: 'salary', isDefault: true },
    { name: '兼职', type: client_1.TransactionType.INCOME, icon: 'part-time', isDefault: true },
    { name: '理财', type: client_1.TransactionType.INCOME, icon: 'investment', isDefault: true },
    { name: '奖金', type: client_1.TransactionType.INCOME, icon: 'bonus', isDefault: true },
    { name: '提成', type: client_1.TransactionType.INCOME, icon: 'commission', isDefault: true },
    { name: '其他', type: client_1.TransactionType.INCOME, icon: 'other', isDefault: true },
];
/**
 * 默认分类排序映射
 */
exports.defaultCategoryOrder = {
    [client_1.TransactionType.EXPENSE]: {
        餐饮: 100,
        购物: 200,
        日用: 300,
        交通: 400,
        运动: 500,
        娱乐: 600,
        通讯: 700,
        服饰: 800,
        美容: 900,
        居家: 1000,
        孩子: 1100,
        长辈: 1200,
        社交: 1300,
        旅行: 1400,
        数码: 1500,
        汽车: 1600,
        医疗: 1700,
        还款: 1800,
        保险: 1900,
        学习: 2000,
        办公: 2100,
        维修: 2200,
        利息: 2300,
    },
    [client_1.TransactionType.INCOME]: {
        工资: 100,
        兼职: 200,
        理财: 300,
        奖金: 400,
        提成: 500,
        其他: 600,
    },
};
