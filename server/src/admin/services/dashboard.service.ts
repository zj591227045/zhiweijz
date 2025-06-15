import { PrismaClient } from '@prisma/client';
import os from 'os';

const prisma = new PrismaClient();

export class DashboardService {
  /**
   * 获取北京时间的今日开始时间（UTC时间）
   */
  private getBeijingTodayStart(): Date {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // 设置为北京时间的0点0分0秒
    beijingTime.setUTCHours(0, 0, 0, 0);
    // 转换回UTC时间（减去8小时）
    return new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);
  }

  /**
   * 获取指定天数前的北京时间日期开始时间（UTC时间）
   */
  private getBeijingDateStart(daysAgo: number): Date {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // 减去指定天数
    beijingTime.setUTCDate(beijingTime.getUTCDate() - daysAgo);
    // 设置为北京时间的0点0分0秒
    beijingTime.setUTCHours(0, 0, 0, 0);
    // 转换回UTC时间（减去8小时）
    return new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStats() {
    try {
      const todayStart = this.getBeijingTodayStart();
      
      // 并行查询各种统计数据
      const [
        totalUsers,
        totalTransactions,
        todayUsers,
        todayTransactions,
        totalAccountBooks,
        activeFamilies
      ] = await Promise.all([
        // 总用户数
        prisma.user.count(),
        
        // 总交易记录数
        prisma.transaction.count(),
        
        // 今日新注册用户数（按北京时间计算）
        prisma.user.count({
          where: {
            createdAt: {
              gte: todayStart
            }
          }
        }),
        
        // 今日交易记录数（按北京时间计算）
        prisma.transaction.count({
          where: {
            createdAt: {
              gte: todayStart
            }
          }
        }),
        
        // 总账本数
        prisma.accountBook.count(),
        
        // 活跃家庭数（有成员的家庭）
        prisma.family.count({
          where: {
            members: {
              some: {}
            }
          }
        })
      ]);

      return {
        totalUsers,
        totalTransactions,
        todayUsers,
        todayTransactions,
        totalAccountBooks,
        activeFamilies
      };
    } catch (error) {
      console.error('获取概览统计数据错误:', error);
      throw new Error('获取概览统计数据失败');
    }
  }

  /**
   * 获取用户统计数据
   * @param period 时间周期：7d, 30d, 90d
   */
  async getUserStats(period: string) {
    try {
      let days: number;
      switch (period) {
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '7d':
        default:
          days = 7;
      }

      const startDate = this.getBeijingDateStart(days);

      // 获取时间段内每日新注册用户数（按北京时间分组）
      const dailyRegistrations = await prisma.$queryRaw`
        SELECT 
          DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) as date,
          COUNT(*) as count
        FROM users 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(CONVERT_TZ(created_at, '+00:00', '+08:00'))
        ORDER BY date ASC
      ` as Array<{ date: Date; count: bigint }>;

      // 获取活跃用户数（有交易记录的用户）
      const activeUsers = await prisma.user.count({
        where: {
          transactions: {
            some: {
              createdAt: {
                gte: startDate
              }
            }
          }
        }
      });

      return {
        period,
        days,
        dailyRegistrations: dailyRegistrations.map(item => ({
          date: item.date,
          count: Number(item.count)
        })),
        activeUsers
      };
    } catch (error) {
      console.error('获取用户统计数据错误:', error);
      throw new Error('获取用户统计数据失败');
    }
  }

  /**
   * 获取交易统计数据
   * @param period 时间周期：7d, 30d, 90d
   */
  async getTransactionStats(period: string) {
    try {
      let days: number;
      switch (period) {
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '7d':
        default:
          days = 7;
      }

      const startDate = this.getBeijingDateStart(days);

      // 获取时间段内每日交易数量（按北京时间分组）
      const dailyTransactions = await prisma.$queryRaw`
        SELECT 
          DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) as date,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense_amount,
          SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income_amount
        FROM transactions 
        WHERE created_at >= ${startDate}
        GROUP BY DATE(CONVERT_TZ(created_at, '+00:00', '+08:00'))
        ORDER BY date ASC
      ` as Array<{ 
        date: Date; 
        count: bigint; 
        expense_amount: any; 
        income_amount: any; 
      }>;

      // 获取分类统计（按交易数量排序的前10个分类）
      const categoryStats = await prisma.$queryRaw`
        SELECT 
          c.name,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as total_amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.created_at >= ${startDate}
        GROUP BY c.id, c.name
        ORDER BY transaction_count DESC
        LIMIT 10
      ` as Array<{ 
        name: string; 
        transaction_count: bigint; 
        total_amount: any; 
      }>;

      return {
        period,
        days,
        dailyTransactions: dailyTransactions.map(item => ({
          date: item.date,
          count: Number(item.count),
          expenseAmount: parseFloat(item.expense_amount || '0'),
          incomeAmount: parseFloat(item.income_amount || '0')
        })),
        categoryStats: categoryStats.map(item => ({
          name: item.name,
          transactionCount: Number(item.transaction_count),
          totalAmount: parseFloat(item.total_amount || '0')
        }))
      };
    } catch (error) {
      console.error('获取交易统计数据错误:', error);
      throw new Error('获取交易统计数据失败');
    }
  }

  /**
   * 获取系统资源使用情况
   */
  async getSystemResources() {
    try {
      // 获取内存使用情况
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // 获取CPU信息
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // 获取系统运行时间
      const uptime = os.uptime();
      const processUptime = process.uptime();

      return {
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          usagePercent: (usedMemory / totalMemory) * 100,
          process: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
          }
        },
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          loadAverage: {
            '1min': loadAverage[0],
            '5min': loadAverage[1],
            '15min': loadAverage[2]
          }
        },
        uptime: {
          system: uptime,
          process: processUptime
        },
        platform: os.platform(),
        nodeVersion: process.version
      };
    } catch (error) {
      console.error('获取系统资源数据错误:', error);
      throw new Error('获取系统资源数据失败');
    }
  }
} 