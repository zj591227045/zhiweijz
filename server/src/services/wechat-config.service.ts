import prisma from '../config/database';
import config from '../config/config';

export interface WechatMenuConfig {
  button: Array<{
    name: string;
    type?: string;
    key?: string;
    url?: string;
    sub_button?: Array<{
      name: string;
      type: string;
      key?: string;
      url?: string;
    }>;
  }>;
}

export class WechatConfigService {
  /**
   * 获取微信自定义菜单配置
   */
  getMenuConfig(): WechatMenuConfig {
    return {
      button: [
        {
          type: 'view',
          name: '访问官网',
          url: 'https://www.zhiweijz.cn',
        },
        {
          type: 'view',
          name: '账号绑定',
          url: 'https://www.zhiweijz.cn',
        },
        {
          type: 'view',
          name: '下载App',
          url: 'https://www.zhiweijz.cn/downloads',
        },
      ],
    };
  }

  /**
   * 获取微信服务状态
   */
  async getServiceStatus() {
    try {
      // 检查配置
      const hasConfig = !!(
        config.wechat?.appId &&
        config.wechat?.appSecret &&
        config.wechat?.token
      );

      // 检查数据库连接
      const dbConnected = await this.checkDatabaseConnection();

      // 获取统计信息
      const stats = await this.getServiceStats();

      return {
        configured: hasConfig,
        databaseConnected: dbConnected,
        ...stats,
      };
    } catch (error) {
      console.error('获取微信服务状态失败:', error);
      return {
        configured: false,
        databaseConnected: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取服务统计信息
   */
  private async getServiceStats() {
    try {
      // 获取绑定用户数
      const totalBindings = await prisma.wechat_user_bindings.count({
        where: { is_active: true },
      });

      // 获取今日消息数
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMessages = await prisma.wechat_message_logs.count({
        where: {
          created_at: {
            gte: today,
          },
        },
      });

      // 获取今日成功处理的消息数
      const todaySuccessMessages = await prisma.wechat_message_logs.count({
        where: {
          created_at: {
            gte: today,
          },
          status: 'success',
        },
      });

      // 获取最近7天的消息统计
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weeklyStats = await prisma.wechat_message_logs.groupBy({
        by: ['status'],
        where: {
          created_at: {
            gte: weekAgo,
          },
        },
        _count: {
          id: true,
        },
      });

      const weeklyTotal = weeklyStats.reduce((sum, stat) => sum + stat._count.id, 0);
      const weeklySuccess = weeklyStats.find((s) => s.status === 'success')?._count.id || 0;
      const successRate = weeklyTotal > 0 ? ((weeklySuccess / weeklyTotal) * 100).toFixed(1) : '0';

      return {
        totalBindings,
        todayMessages,
        todaySuccessMessages,
        weeklyTotal,
        weeklySuccess,
        successRate: `${successRate}%`,
      };
    } catch (error) {
      console.error('获取服务统计失败:', error);
      return {
        totalBindings: 0,
        todayMessages: 0,
        todaySuccessMessages: 0,
        weeklyTotal: 0,
        weeklySuccess: 0,
        successRate: '0%',
      };
    }
  }

  /**
   * 清理过期的消息日志
   */
  async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.wechat_message_logs.deleteMany({
        where: {
          created_at: {
            lt: cutoffDate,
          },
        },
      });

      console.log(`清理了 ${result.count} 条过期的微信消息日志`);
      return result.count;
    } catch (error) {
      console.error('清理过期日志失败:', error);
      return 0;
    }
  }

  /**
   * 获取错误统计
   */
  async getErrorStats(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const errorLogs = await prisma.wechat_message_logs.findMany({
        where: {
          status: 'failed',
          created_at: {
            gte: startDate,
          },
        },
        select: {
          error_message: true,
          created_at: true,
          message_type: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // 统计错误类型
      const errorTypes: { [key: string]: number } = {};
      errorLogs.forEach((log) => {
        const errorType = this.categorizeError(log.error_message || '未知错误');
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });

      return {
        totalErrors: errorLogs.length,
        errorTypes,
        recentErrors: errorLogs.slice(0, 10),
      };
    } catch (error) {
      console.error('获取错误统计失败:', error);
      return {
        totalErrors: 0,
        errorTypes: {},
        recentErrors: [],
      };
    }
  }

  /**
   * 分类错误类型
   */
  private categorizeError(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('database') || lowerMessage.includes('数据库')) {
      return '数据库错误';
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('网络')) {
      return '网络错误';
    }
    if (lowerMessage.includes('token') || lowerMessage.includes('限制')) {
      return 'AI服务限制';
    }
    if (lowerMessage.includes('xml') || lowerMessage.includes('parse')) {
      return 'XML解析错误';
    }
    if (lowerMessage.includes('signature') || lowerMessage.includes('签名')) {
      return '签名验证错误';
    }

    return '其他错误';
  }

  /**
   * 获取活跃用户统计
   */
  async getActiveUserStats(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activeUsers = await prisma.wechat_message_logs.groupBy({
        by: ['openid'],
        where: {
          created_at: {
            gte: startDate,
          },
        },
        _count: {
          id: true,
        },
      });

      const totalActiveUsers = activeUsers.length;
      const totalMessages = activeUsers.reduce((sum, user) => sum + user._count.id, 0);
      const avgMessagesPerUser =
        totalActiveUsers > 0 ? (totalMessages / totalActiveUsers).toFixed(1) : '0';

      return {
        totalActiveUsers,
        totalMessages,
        avgMessagesPerUser,
      };
    } catch (error) {
      console.error('获取活跃用户统计失败:', error);
      return {
        totalActiveUsers: 0,
        totalMessages: 0,
        avgMessagesPerUser: '0',
      };
    }
  }
}
