"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryBudgetRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CategoryBudgetRepository {
    /**
     * 创建分类预算
     */
    async create(data) {
        return prisma.categoryBudget.create({
            data: {
                budgetId: data.budgetId,
                categoryId: data.categoryId,
                amount: new client_1.Prisma.Decimal(data.amount),
            },
            include: {
                category: true,
            },
        });
    }
    /**
     * 根据ID查找分类预算
     */
    async findById(id) {
        return prisma.categoryBudget.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });
    }
    /**
     * 根据预算ID和分类ID查找分类预算
     */
    async findByBudgetAndCategory(budgetId, categoryId) {
        return prisma.categoryBudget.findUnique({
            where: {
                budgetId_categoryId: {
                    budgetId,
                    categoryId,
                },
            },
            include: {
                category: true,
            },
        });
    }
    /**
     * 查询分类预算列表
     */
    async findAll(params) {
        const { budgetId, categoryId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', } = params;
        // 构建查询条件
        const where = {
            ...(budgetId && { budgetId }),
            ...(categoryId && { categoryId }),
        };
        // 构建排序条件
        const orderBy = {
            [sortBy]: sortOrder,
        };
        // 查询总数
        const total = await prisma.categoryBudget.count({ where });
        // 查询分类预算列表
        const categoryBudgets = await prisma.categoryBudget.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                category: true,
            },
        });
        return { categoryBudgets, total };
    }
    /**
     * 根据预算ID查找分类预算列表
     */
    async findByBudgetId(budgetId) {
        return prisma.categoryBudget.findMany({
            where: { budgetId },
            include: {
                category: true,
            },
        });
    }
    /**
     * 更新分类预算
     */
    async update(id, data) {
        const updateData = {
            ...(data.amount !== undefined && { amount: new client_1.Prisma.Decimal(data.amount) }),
            ...(data.spent !== undefined && { spent: new client_1.Prisma.Decimal(data.spent) }),
        };
        return prisma.categoryBudget.update({
            where: { id },
            data: updateData,
            include: {
                category: true,
            },
        });
    }
    /**
     * 更新分类预算已用金额
     */
    async updateSpent(id, spent) {
        return prisma.categoryBudget.update({
            where: { id },
            data: {
                spent: new client_1.Prisma.Decimal(spent),
            },
            include: {
                category: true,
            },
        });
    }
    /**
     * 删除分类预算
     */
    async delete(id) {
        await prisma.categoryBudget.delete({
            where: { id },
        });
    }
    /**
     * 删除预算下的所有分类预算
     */
    async deleteByBudgetId(budgetId) {
        await prisma.categoryBudget.deleteMany({
            where: { budgetId },
        });
    }
    /**
     * 计算预算下所有分类预算的总金额
     */
    async calculateTotalAmount(budgetId) {
        const result = await prisma.categoryBudget.aggregate({
            where: { budgetId },
            _sum: {
                amount: true,
            },
        });
        return result._sum.amount ? Number(result._sum.amount) : 0;
    }
    /**
     * 计算预算下所有分类预算的总支出
     */
    async calculateTotalSpent(budgetId) {
        const result = await prisma.categoryBudget.aggregate({
            where: { budgetId },
            _sum: {
                spent: true,
            },
        });
        return result._sum.spent ? Number(result._sum.spent) : 0;
    }
}
exports.CategoryBudgetRepository = CategoryBudgetRepository;
