import crypto from 'crypto';
import prisma from '../config/database';
import { AIController } from '../controllers/ai-controller';
import { SmartAccountingResult, SmartAccountingError } from '../types/smart-accounting';

export interface WechatSmartAccountingResult {
  success: boolean;
  message: string;
  transaction?: any;
  error?: string;
}

export class WechatSmartAccountingService {
  private aiController: AIController;

  constructor() {
    this.aiController = new AIController();
  }

  /**
   * 处理微信智能记账请求
   */
  async processWechatAccounting(
    userId: string, 
    accountBookId: string, 
    description: string,
    createTransaction: boolean = false
  ): Promise<WechatSmartAccountingResult> {
    try {
      // 1. 验证账本权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return {
          success: false,
          message: '账本不存在或无权访问，请重新设置默认账本。'
        };
      }

      // 2. 调用智能记账分析
      const smartAccounting = this.aiController['smartAccounting'];
      if (!smartAccounting) {
        return {
          success: false,
          message: '智能记账服务暂时不可用，请稍后重试。'
        };
      }

      const analysisResult = await smartAccounting.processDescription(
        description,
        userId,
        accountBookId,
        accountBook.type
      );

      if (!analysisResult) {
        return {
          success: false,
          message: '智能记账分析失败，请稍后重试。'
        };
      }

      // 3. 检查分析结果
      if ('error' in analysisResult) {
        if (analysisResult.error.includes('Token使用受限')) {
          return {
            success: false,
            message: 'AI服务使用受限，请稍后重试。',
            error: 'TOKEN_LIMIT_EXCEEDED'
          };
        }
        return {
          success: false,
          message: `${analysisResult.error}\n\n请发送有效的记账信息，例如："50 餐饮 午餐"`
        };
      }

      // 4. 如果需要创建交易记录
      if (createTransaction) {
        const transaction = await this.createTransactionRecord(analysisResult, userId);
        if (transaction) {
          return {
            success: true,
            message: this.formatSuccessMessage(analysisResult, true),
            transaction
          };
        } else {
          return {
            success: false,
            message: '记账分析成功，但创建交易记录失败。'
          };
        }
      }

      // 5. 仅返回分析结果
      return {
        success: true,
        message: this.formatSuccessMessage(analysisResult, false)
      };

    } catch (error) {
      console.error('微信智能记账处理失败:', error);
      return {
        success: false,
        message: '记账处理失败，请稍后重试。'
      };
    }
  }

  /**
   * 验证账本访问权限
   */
  private async validateAccountBookAccess(userId: string, accountBookId: string) {
    return await prisma.accountBook.findFirst({
      where: {
        id: accountBookId,
        OR: [
          { userId },
          {
            type: 'FAMILY',
            familyId: {
              not: null
            },
            family: {
              members: {
                some: {
                  userId
                }
              }
            }
          }
        ]
      }
    });
  }

  /**
   * 创建交易记录
   */
  private async createTransactionRecord(result: SmartAccountingResult, userId: string) {
    try {
      // 确保日期包含当前时间（北京时区）
      let transactionDate: Date;

      // 获取当前时间并转换为北京时区
      const now = new Date();
      const beijingOffset = 8 * 60; // 北京时区 UTC+8
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const beijingTime = new Date(utc + (beijingOffset * 60000));

      if (result.date) {
        // 如果智能分析返回了日期，使用该日期但设置为当前北京时间
        const resultDate = new Date(result.date);
        transactionDate = new Date(
          resultDate.getFullYear(),
          resultDate.getMonth(),
          resultDate.getDate(),
          beijingTime.getHours(),
          beijingTime.getMinutes(),
          beijingTime.getSeconds(),
          beijingTime.getMilliseconds()
        );
      } else {
        // 如果没有日期，使用当前北京时间
        transactionDate = beijingTime;
      }

      const transaction = await prisma.transaction.create({
        data: {
          id: crypto.randomUUID(),
          amount: result.amount,
          type: result.type,
          description: result.note,
          date: transactionDate,
          categoryId: result.categoryId,
          accountBookId: result.accountId,
          userId: userId,
          budgetId: result.budgetId || null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          category: true,
          budget: true,
          accountBook: true
        }
      });

      return transaction;
    } catch (error) {
      console.error('创建交易记录失败:', error);
      return null;
    }
  }

  /**
   * 格式化成功消息
   */
  private formatSuccessMessage(result: SmartAccountingResult, transactionCreated: boolean): string {
    const amount = result.amount;
    const type = result.type === 'EXPENSE' ? '支出' : '收入';
    const categoryIcon = this.getCategoryIcon(result.categoryName);
    const category = `${categoryIcon}${result.categoryName || '未分类'}`;
    const desc = result.note || '';
    const status = transactionCreated ? '记账成功' : '分析完成';

    // 格式化日期 - 只显示日期部分
    const transactionDate = new Date(result.date);
    const dateStr = transactionDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 构建预算信息
    let budgetInfo = '';
    if (result.budgetName) {
      // 检查是否是个人预算，如果是则在括号中显示所有者名字
      if (result.budgetOwnerName && result.budgetName !== result.budgetOwnerName) {
        // 个人预算：显示"个人预算（张三）"
        budgetInfo = `📊 预算：个人预算（${result.budgetOwnerName}）`;
      } else {
        // 通用预算：直接显示预算名称
        budgetInfo = `📊 预算：${result.budgetName}`;
      }
    }

    return `✅ ${status}！\n` +
           `📝 明细：${desc}\n` +
           `📅 日期：${dateStr}\n` +
           `💸 方向：${type}；分类：${category}\n` +
           `💰 金额：${amount}元` +
           (budgetInfo ? `\n${budgetInfo}` : '');
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(categoryName?: string): string {
    if (!categoryName) return '📝';

    const iconMap: { [key: string]: string } = {
      '餐饮': '🍽️',
      '交通': '🚗',
      '购物': '🛒',
      '娱乐': '🎮',
      '医疗': '🏥',
      '教育': '📚',
      '学习': '📝',
      '住房': '🏠',
      '通讯': '📱',
      '服装': '👕',
      '美容': '💄',
      '运动': '⚽',
      '旅游': '✈️',
      '工资': '💼',
      '奖金': '🎁',
      '投资': '📈',
      '其他': '📝'
    };

    // 查找匹配的图标
    for (const [key, icon] of Object.entries(iconMap)) {
      if (categoryName.includes(key)) {
        return icon;
      }
    }

    return '📝'; // 默认图标
  }

  /**
   * 获取账本统计信息
   */
  async getAccountBookStats(userId: string, accountBookId: string): Promise<string> {
    try {
      // 验证权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return '无权访问该账本统计信息。';
      }

      // 获取本月统计
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const monthlyStats = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
          accountBookId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      let message = `📊 ${accountBook.name} 本月统计\n\n`;
      
      const expenseStats = monthlyStats.find(s => s.type === 'EXPENSE');
      const incomeStats = monthlyStats.find(s => s.type === 'INCOME');
      
      const totalExpense = Number(expenseStats?._sum.amount || 0);
      const totalIncome = Number(incomeStats?._sum.amount || 0);
      const expenseCount = expenseStats?._count.id || 0;
      const incomeCount = incomeStats?._count.id || 0;
      
      message += `💰 收入：¥${totalIncome.toFixed(2)} (${incomeCount}笔)\n`;
      message += `💸 支出：¥${totalExpense.toFixed(2)} (${expenseCount}笔)\n`;
      message += `📈 结余：¥${(totalIncome - totalExpense).toFixed(2)}\n\n`;
      
      // 获取最近5笔交易
      const recentTransactions = await prisma.transaction.findMany({
        where: { accountBookId },
        include: { category: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (recentTransactions.length > 0) {
        message += '📝 最近交易：\n';
        recentTransactions.forEach((tx, index) => {
          const type = tx.type === 'EXPENSE' ? '支出' : '收入';
          const date = new Date(tx.date).toLocaleDateString('zh-CN');
          message += `${index + 1}. ${date} ${type} ¥${tx.amount.toFixed(2)} ${tx.category?.name || '未分类'}\n`;
        });
      }

      return message;

    } catch (error) {
      console.error('获取账本统计失败:', error);
      return '获取统计信息失败，请稍后重试。';
    }
  }

  /**
   * 获取最近交易记录
   */
  async getRecentTransactions(userId: string, accountBookId: string, limit: number = 5): Promise<string> {
    try {
      // 验证权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return '无权访问该账本交易记录。';
      }

      // 获取最近交易
      const recentTransactions = await prisma.transaction.findMany({
        where: { accountBookId },
        include: {
          category: true,
          budget: {
            include: {
              user: { select: { name: true } },
              familyMember: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });

      if (recentTransactions.length === 0) {
        return `📝 ${accountBook.name}\n\n暂无交易记录`;
      }

      let message = `📝 ${accountBook.name} 最近交易\n\n`;

      recentTransactions.forEach((tx, index) => {
        const type = tx.type === 'EXPENSE' ? '支出' : '收入';
        const date = new Date(tx.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
        const category = tx.category?.name || '未分类';

        // 预算信息
        let budgetInfo = '';
        if (tx.budget) {
          const budgetOwner = tx.budget.familyMember?.name || tx.budget.user?.name;
          if (budgetOwner && tx.budget.name !== budgetOwner) {
            budgetInfo = ` (${budgetOwner})`;
          }
        }

        message += `${index + 1}. ${date} ${type} ¥${tx.amount.toFixed(2)} ${category}${budgetInfo}\n`;
      });

      return message;

    } catch (error) {
      console.error('获取最近交易失败:', error);
      return '获取交易记录失败，请稍后重试。';
    }
  }

  /**
   * 获取指定时间范围的统计
   */
  async getTimeRangeStats(userId: string, accountBookId: string, startDate: Date, endDate: Date, period: string): Promise<string> {
    try {
      // 验证权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return '无权访问该账本统计信息。';
      }

      // 获取时间范围内的统计
      const stats = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
          accountBookId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      const expenseStats = stats.find(s => s.type === 'EXPENSE');
      const incomeStats = stats.find(s => s.type === 'INCOME');

      const totalExpense = Number(expenseStats?._sum.amount || 0);
      const totalIncome = Number(incomeStats?._sum.amount || 0);
      const expenseCount = expenseStats?._count.id || 0;
      const incomeCount = incomeStats?._count.id || 0;

      let message = `📊 ${accountBook.name} ${period}统计\n\n`;
      message += `💰 收入：¥${totalIncome.toFixed(2)} (${incomeCount}笔)\n`;
      message += `💸 支出：¥${totalExpense.toFixed(2)} (${expenseCount}笔)\n`;
      message += `📈 结余：¥${(totalIncome - totalExpense).toFixed(2)}\n`;

      // 如果有交易，显示最近几笔
      if (expenseCount > 0 || incomeCount > 0) {
        const recentTransactions = await prisma.transaction.findMany({
          where: {
            accountBookId,
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          include: { category: true },
          orderBy: { date: 'desc' },
          take: 3
        });

        if (recentTransactions.length > 0) {
          message += '\n📝 最近交易：\n';
          recentTransactions.forEach((tx, index) => {
            const type = tx.type === 'EXPENSE' ? '支出' : '收入';
            const date = new Date(tx.date).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
            message += `${index + 1}. ${date} ${type} ¥${tx.amount.toFixed(2)} ${tx.category?.name || '未分类'}\n`;
          });
        }
      }

      return message;

    } catch (error) {
      console.error('获取时间范围统计失败:', error);
      return '获取统计信息失败，请稍后重试。';
    }
  }

  /**
   * 获取预算状态查询
   */
  async getBudgetStatus(userId: string, accountBookId: string): Promise<string> {
    try {
      // 验证权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return '无权访问该账本预算信息。';
      }

      // 获取当前活跃的预算
      const now = new Date();
      const budgets = await prisma.budget.findMany({
        where: {
          accountBookId,
          startDate: { lte: now },
          endDate: { gte: now }
        },
        include: {
          category: true,
          user: { select: { name: true } },
          familyMember: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (budgets.length === 0) {
        return `📊 ${accountBook.name}\n\n暂无活跃预算`;
      }

      let message = `📊 ${accountBook.name} 预算执行情况\n\n`;

      for (const budget of budgets) {
        // 计算已使用金额
        const spent = await prisma.transaction.aggregate({
          where: {
            budgetId: budget.id,
            date: {
              gte: budget.startDate,
              lte: budget.endDate
            }
          },
          _sum: { amount: true }
        });

        const spentAmount = Number(spent._sum.amount || 0);
        const totalAmount = budget.amount + (budget.rolloverAmount || 0);
        const remaining = totalAmount - spentAmount;
        const percentage = totalAmount > 0 ? (spentAmount / totalAmount) * 100 : 0;

        // 预算状态图标
        let statusIcon = '✅';
        if (percentage >= 100) {
          statusIcon = '🔴';
        } else if (percentage >= 80) {
          statusIcon = '⚠️';
        }

        // 预算名称
        let budgetName = budget.name;
        const budgetOwner = budget.familyMember?.name || budget.user?.name;
        if (budgetOwner && budget.name !== budgetOwner) {
          budgetName = `个人预算（${budgetOwner}）`;
        }

        message += `${statusIcon} ${budgetName}\n`;
        message += `💰 总额：¥${totalAmount.toFixed(2)} | 已用：¥${spentAmount.toFixed(2)}\n`;

        if (remaining >= 0) {
          message += `📈 剩余：¥${remaining.toFixed(2)} (${(100 - percentage).toFixed(1)}%)\n\n`;
        } else {
          message += `📈 超支：¥${Math.abs(remaining).toFixed(2)} (${percentage.toFixed(1)}%)\n\n`;
        }
      }

      return message.trim();

    } catch (error) {
      console.error('获取预算状态失败:', error);
      return '获取预算状态失败，请稍后重试。';
    }
  }

  /**
   * 获取分类统计
   */
  async getCategoryStats(userId: string, accountBookId: string): Promise<string> {
    try {
      // 验证权限
      const accountBook = await this.validateAccountBookAccess(userId, accountBookId);
      if (!accountBook) {
        return '无权访问该账本分类统计。';
      }

      // 获取本月分类统计
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const categoryStats = await prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where: {
          accountBookId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      // 获取分类信息
      const categoryIds = [...new Set(categoryStats.map(s => s.categoryId))];
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });

      let message = `📊 ${accountBook.name} 本月分类统计\n\n`;

      // 支出分类统计
      const expenseStats = categoryStats.filter(s => s.type === 'EXPENSE');
      if (expenseStats.length > 0) {
        message += '💸 支出分类：\n';
        expenseStats
          .sort((a, b) => Number(b._sum.amount || 0) - Number(a._sum.amount || 0))
          .slice(0, 5)
          .forEach(stat => {
            const category = categories.find(c => c.id === stat.categoryId);
            const amount = Number(stat._sum.amount || 0);
            const count = stat._count.id;
            message += `• ${category?.name || '未分类'}：¥${amount.toFixed(2)} (${count}笔)\n`;
          });
        message += '\n';
      }

      // 收入分类统计
      const incomeStats = categoryStats.filter(s => s.type === 'INCOME');
      if (incomeStats.length > 0) {
        message += '💰 收入分类：\n';
        incomeStats
          .sort((a, b) => Number(b._sum.amount || 0) - Number(a._sum.amount || 0))
          .slice(0, 5)
          .forEach(stat => {
            const category = categories.find(c => c.id === stat.categoryId);
            const amount = Number(stat._sum.amount || 0);
            const count = stat._count.id;
            message += `• ${category?.name || '未分类'}：¥${amount.toFixed(2)} (${count}笔)\n`;
          });
      }

      return message;

    } catch (error) {
      console.error('获取分类统计失败:', error);
      return '获取分类统计失败，请稍后重试。';
    }
  }
}
