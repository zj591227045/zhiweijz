/**
 * 微信查询意图识别服务
 */

export interface QueryIntent {
  type: 'balance' | 'category' | 'budget' | 'recent' | 'timeRange' | 'accounting';
  timeRange?: {
    start: Date;
    end: Date;
    period: string;
  };
  category?: string;
  limit?: number;
  confidence: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
  period: string;
}

export class WechatQueryIntentService {
  /**
   * 识别用户查询意图
   */
  public recognizeIntent(content: string): QueryIntent {
    const cleanContent = content.trim().toLowerCase();

    // 1. 账本统计查询
    if (this.isBalanceQuery(cleanContent)) {
      const timeRange = this.parseTimeRange(cleanContent);
      if (timeRange) {
        return {
          type: 'timeRange',
          timeRange,
          confidence: 0.9,
        };
      }
      return {
        type: 'balance',
        confidence: 0.9,
      };
    }

    // 2. 分类统计查询
    if (this.isCategoryQuery(cleanContent)) {
      return {
        type: 'category',
        confidence: 0.9,
      };
    }

    // 3. 预算查询
    if (this.isBudgetQuery(cleanContent)) {
      return {
        type: 'budget',
        confidence: 0.9,
      };
    }

    // 4. 最近记账查询
    if (this.isRecentQuery(cleanContent)) {
      const limit = this.extractLimit(cleanContent);
      return {
        type: 'recent',
        limit,
        confidence: 0.9,
      };
    }

    // 5. 时间范围查询
    const timeRange = this.parseTimeRange(cleanContent);
    if (timeRange && this.hasQueryKeywords(cleanContent)) {
      return {
        type: 'timeRange',
        timeRange,
        confidence: 0.8,
      };
    }

    // 6. 默认为记账
    return {
      type: 'accounting',
      confidence: 0.7,
    };
  }

  /**
   * 判断是否为账本统计查询
   */
  private isBalanceQuery(content: string): boolean {
    const balanceKeywords = [
      '查看余额',
      '余额查询',
      '账本统计',
      '收支情况',
      '本月支出',
      '本月收入',
      '支出统计',
      '收入统计',
      '财务状况',
      '账户余额',
      '月度统计',
    ];

    return balanceKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * 判断是否为分类统计查询
   */
  private isCategoryQuery(content: string): boolean {
    const categoryKeywords = [
      '分类统计',
      '消费统计',
      '支出分类',
      '收入分类',
      '分类查询',
      '消费分析',
      '支出分析',
      '分类明细',
    ];

    return categoryKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * 判断是否为预算查询
   */
  private isBudgetQuery(content: string): boolean {
    const budgetKeywords = [
      '预算情况',
      '预算统计',
      '查看预算',
      '预算状态',
      '预算执行',
      '预算余额',
      '预算使用',
      '预算分析',
    ];

    return budgetKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * 判断是否为最近记账查询
   */
  private isRecentQuery(content: string): boolean {
    const recentKeywords = [
      '最近记账',
      '最近记录',
      '最新记账',
      '近期记账',
      '记账记录',
      '最近消费',
      '最近支出',
      '最近收入',
    ];

    return recentKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * 判断是否包含查询关键词
   */
  private hasQueryKeywords(content: string): boolean {
    const queryKeywords = ['查看', '统计', '查询', '分析', '情况', '状态', '记录', '明细'];

    return queryKeywords.some((keyword) => content.includes(keyword));
  }

  /**
   * 解析时间范围
   */
  private parseTimeRange(content: string): TimeRange | null {
    const now = new Date();

    // 今天
    if (content.includes('今天') || content.includes('今日')) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start, end, period: '今天' };
    }

    // 昨天
    if (content.includes('昨天') || content.includes('昨日')) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
      return { start, end, period: '昨天' };
    }

    // 本周
    if (content.includes('本周') || content.includes('这周')) {
      const dayOfWeek = now.getDay();
      const start = new Date(
        now.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000,
      );
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { start, end, period: '本周' };
    }

    // 上周
    if (content.includes('上周') || content.includes('上星期')) {
      const dayOfWeek = now.getDay();
      const thisWeekStart = new Date(
        now.getTime() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) * 24 * 60 * 60 * 1000,
      );
      const start = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { start, end, period: '上周' };
    }

    // 本月
    if (content.includes('本月') || content.includes('这个月')) {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, period: '本月' };
    }

    // 上月
    if (content.includes('上月') || content.includes('上个月')) {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end, period: '上月' };
    }

    // 本年
    if (content.includes('本年') || content.includes('今年')) {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end, period: '本年' };
    }

    return null;
  }

  /**
   * 提取数量限制
   */
  private extractLimit(content: string): number {
    // 匹配数字
    const numberMatch = content.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      return Math.min(Math.max(num, 1), 20); // 限制在1-20之间
    }

    return 5; // 默认5条
  }
}
