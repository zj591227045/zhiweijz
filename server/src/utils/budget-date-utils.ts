/**
 * 预算日期计算工具类
 * 支持自定义结转日期的预算周期计算
 */

export interface BudgetPeriod {
  startDate: Date;
  endDate: Date;
  year: number;
  month: number;
  refreshDay: number;
}

export class BudgetDateUtils {
  /**
   * 根据refreshDay计算指定月份的预算周期
   * @param year 年份
   * @param month 月份 (1-12)
   * @param refreshDay 刷新日期 (1, 5, 10, 15, 20, 25)
   * @returns 预算周期
   */
  static calculateBudgetPeriod(year: number, month: number, refreshDay: number): BudgetPeriod {
    // 验证refreshDay
    if (![1, 5, 10, 15, 20, 25].includes(refreshDay)) {
      throw new Error(`Invalid refreshDay: ${refreshDay}. Must be one of: 1, 5, 10, 15, 20, 25`);
    }

    // 计算预算开始日期
    const startDate = new Date(year, month - 1, refreshDay);
    
    // 计算预算结束日期（下个月的refreshDay前一天）
    let endYear = year;
    let endMonth = month + 1;

    // 处理跨年情况
    if (endMonth > 12) {
      endYear++;
      endMonth = 1;
    }

    // 下个月的refreshDay前一天作为结束日期
    const endDate = new Date(endYear, endMonth - 1, refreshDay - 1);

    return {
      startDate,
      endDate,
      year,
      month,
      refreshDay
    };
  }

  /**
   * 根据当前日期和refreshDay计算当前预算周期
   * @param currentDate 当前日期
   * @param refreshDay 刷新日期
   * @returns 当前预算周期
   */
  static getCurrentBudgetPeriod(currentDate: Date, refreshDay: number): BudgetPeriod {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    // 如果当前日期在refreshDay之前，说明还在上个月的预算周期内
    if (day < refreshDay) {
      let prevYear = year;
      let prevMonth = month - 1;
      
      if (prevMonth < 1) {
        prevYear--;
        prevMonth = 12;
      }
      
      return this.calculateBudgetPeriod(prevYear, prevMonth, refreshDay);
    } else {
      // 当前日期在refreshDay之后，在当前月的预算周期内
      return this.calculateBudgetPeriod(year, month, refreshDay);
    }
  }

  /**
   * 计算下一个预算周期
   * @param currentPeriod 当前预算周期
   * @returns 下一个预算周期
   */
  static getNextBudgetPeriod(currentPeriod: BudgetPeriod): BudgetPeriod {
    let nextYear = currentPeriod.year;
    let nextMonth = currentPeriod.month + 1;
    
    if (nextMonth > 12) {
      nextYear++;
      nextMonth = 1;
    }
    
    return this.calculateBudgetPeriod(nextYear, nextMonth, currentPeriod.refreshDay);
  }

  /**
   * 计算上一个预算周期
   * @param currentPeriod 当前预算周期
   * @returns 上一个预算周期
   */
  static getPreviousBudgetPeriod(currentPeriod: BudgetPeriod): BudgetPeriod {
    let prevYear = currentPeriod.year;
    let prevMonth = currentPeriod.month - 1;
    
    if (prevMonth < 1) {
      prevYear--;
      prevMonth = 12;
    }
    
    return this.calculateBudgetPeriod(prevYear, prevMonth, currentPeriod.refreshDay);
  }

  /**
   * 计算两个日期之间缺失的预算周期
   * @param lastEndDate 最后一个预算的结束日期
   * @param currentDate 当前日期
   * @param refreshDay 刷新日期
   * @returns 缺失的预算周期数组
   */
  static calculateMissingPeriods(lastEndDate: Date, currentDate: Date, refreshDay: number): BudgetPeriod[] {
    const periods: BudgetPeriod[] = [];
    
    // 从最后一个预算结束后的下一个周期开始
    let checkDate = new Date(lastEndDate.getTime() + 24 * 60 * 60 * 1000); // 下一天
    
    while (checkDate <= currentDate) {
      const period = this.getCurrentBudgetPeriod(checkDate, refreshDay);
      
      // 检查是否已经添加过这个周期
      const exists = periods.some(p => 
        p.year === period.year && 
        p.month === period.month && 
        p.refreshDay === period.refreshDay
      );
      
      if (!exists) {
        periods.push(period);
      }
      
      // 移动到下一个周期的开始
      const nextPeriod = this.getNextBudgetPeriod(period);
      checkDate = new Date(nextPeriod.startDate);
    }
    
    return periods;
  }

  /**
   * 检查日期是否在预算周期内
   * @param date 要检查的日期
   * @param period 预算周期
   * @returns 是否在周期内
   */
  static isDateInPeriod(date: Date, period: BudgetPeriod): boolean {
    return date >= period.startDate && date <= period.endDate;
  }

  /**
   * 格式化预算周期为字符串
   * @param period 预算周期
   * @returns 格式化字符串，如 "2024年6月(25日起)"
   */
  static formatPeriod(period: BudgetPeriod): string {
    if (period.refreshDay === 1) {
      return `${period.year}年${period.month}月`;
    } else {
      return `${period.year}年${period.month}月(${period.refreshDay}日起)`;
    }
  }

  /**
   * 验证refreshDay是否有效
   * @param refreshDay 刷新日期
   * @returns 是否有效
   */
  static isValidRefreshDay(refreshDay: number): boolean {
    return [1, 5, 10, 15, 20, 25].includes(refreshDay);
  }

  /**
   * 计算预算周期的天数
   * @param period 预算周期
   * @returns 天数
   */
  static calculatePeriodDays(period: BudgetPeriod): number {
    const timeDiff = period.endDate.getTime() - period.startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 因为包含开始和结束日期
  }

  /**
   * 获取预算周期内剩余天数
   * @param period 预算周期
   * @param currentDate 当前日期
   * @returns 剩余天数
   */
  static getRemainingDays(period: BudgetPeriod, currentDate: Date = new Date()): number {
    if (currentDate > period.endDate) {
      return 0;
    }
    if (currentDate < period.startDate) {
      return this.calculatePeriodDays(period);
    }
    
    const timeDiff = period.endDate.getTime() - currentDate.getTime();
    return Math.max(0, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  }
}
