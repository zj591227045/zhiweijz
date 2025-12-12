/**
 * 日期校验服务
 * 提供日期合理性校验和修正建议
 */

import { DateValidationLogger } from './date-validation-logger.service';
import { dateValidationConfig } from '../config/date-validation.config';

/**
 * 日期校验结果
 */
export interface DateValidationResult {
  isValid: boolean;           // 日期是否有效
  originalDate: Date | null;  // 原始日期
  suggestedDate: Date;        // 建议日期(当前日期)
  reason?: string;            // 异常原因
}

/**
 * 日期校验选项
 */
export interface DateValidationOptions {
  source: 'app' | 'wechat';   // 来源渠道
  allowFuture?: boolean;      // 是否允许未来日期(默认false)
}

/**
 * 日期校验服务类
 */
export class DateValidationService {
  private logger: DateValidationLogger;

  constructor() {
    this.logger = new DateValidationLogger();
  }

  /**
   * 校验单个日期
   * @param date 待校验的日期
   * @param options 校验选项
   * @param context 上下文信息(用于日志记录)
   * @returns 校验结果
   */
  validateDate(
    date: Date | null | undefined,
    options: DateValidationOptions,
    context?: { userId: string; accountBookId: string }
  ): DateValidationResult {
    // 检查是否启用日期校验
    if (!dateValidationConfig.isEnabled()) {
      // 如果禁用,直接返回有效结果
      return {
        isValid: true,
        originalDate: date instanceof Date ? date : (date ? new Date(date) : null),
        suggestedDate: this.getCurrentDate(),
      };
    }

    let currentDate: Date;
    try {
      currentDate = this.getCurrentDate();
    } catch (error) {
      // 时区转换错误 - 回退到系统时区
      console.error('[日期校验] 北京时区转换失败,使用系统时区:', error);
      currentDate = new Date();
    }
    
    // 处理空日期 - 使用当前日期作为默认值
    if (!date) {
      const result = {
        isValid: true,
        originalDate: null,
        suggestedDate: currentDate,
        reason: '日期为空,使用当前日期',
      };

      // 记录日志
      if (context) {
        this.logger.logValidation({
          timestamp: new Date(),
          userId: context.userId,
          accountBookId: context.accountBookId,
          source: options.source,
          originalDate: null,
          validationResult: true,
          correctedDate: currentDate,
          reason: result.reason,
        });
      }

      return result;
    }

    // 转换为Date对象(如果是字符串)
    let dateObj: Date;
    try {
      dateObj = date instanceof Date ? date : new Date(date);
      
      // 检查日期是否有效
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      // 日期解析失败 - 使用当前日期作为默认值
      console.warn('[日期校验] 日期解析失败,使用当前日期:', error);
      
      const result = {
        isValid: false,
        originalDate: null,
        suggestedDate: currentDate,
        reason: '日期格式无效,已使用当前日期',
      };

      if (context) {
        this.logger.logValidation({
          timestamp: new Date(),
          userId: context.userId,
          accountBookId: context.accountBookId,
          source: options.source,
          originalDate: null,
          validationResult: false,
          correctedDate: currentDate,
          reason: result.reason,
        });
      }

      return result;
    }

    // 检查日期是否在合理范围内
    const isValid = this.isDateInValidRange(dateObj);
    const reason = isValid ? undefined : this.getInvalidReason(dateObj, currentDate);
    
    const result = {
      isValid,
      originalDate: dateObj,
      suggestedDate: currentDate,
      reason,
    };

    // 记录日志
    if (context) {
      this.logger.logValidation({
        timestamp: new Date(),
        userId: context.userId,
        accountBookId: context.accountBookId,
        source: options.source,
        originalDate: dateObj,
        validationResult: isValid,
        correctedDate: isValid ? undefined : currentDate,
        reason,
      });
    }

    return result;
  }

  /**
   * 批量校验日期
   * @param dates 待校验的日期数组
   * @param options 校验选项
   * @param context 上下文信息(用于日志记录)
   * @returns 校验结果数组
   */
  validateDates(
    dates: Array<Date | null | undefined>,
    options: DateValidationOptions,
    context?: { userId: string; accountBookId: string }
  ): DateValidationResult[] {
    const results = dates.map(date => this.validateDate(date, options, context));
    
    // 记录批量统计
    if (context) {
      const invalidCount = results.filter(r => !r.isValid).length;
      this.logger.logBatchSummary(
        results.length,
        invalidCount,
        options.source,
        context.userId,
        context.accountBookId
      );
    }
    
    return results;
  }

  /**
   * 判断日期是否在合理范围内
   * 合理范围: 本月内 或 过去7天内
   * @param date 待判断的日期
   * @returns 是否在合理范围内
   */
  private isDateInValidRange(date: Date): boolean {
    const currentDate = this.getCurrentDate();
    const firstDayOfMonth = this.getFirstDayOfMonth();
    const sevenDaysAgo = this.getSevenDaysAgo();

    // 不能是未来日期
    if (date > currentDate) {
      return false;
    }

    // 在本月内
    if (date >= firstDayOfMonth && date <= currentDate) {
      return true;
    }

    // 在过去7天内
    if (date >= sevenDaysAgo && date <= currentDate) {
      return true;
    }

    return false;
  }

  /**
   * 获取日期异常的具体原因
   * @param date 异常日期
   * @param currentDate 当前日期
   * @returns 异常原因描述
   */
  private getInvalidReason(date: Date, currentDate: Date): string {
    if (date > currentDate) {
      return '日期不能是未来';
    }

    const firstDayOfMonth = this.getFirstDayOfMonth();
    const sevenDaysAgo = this.getSevenDaysAgo();

    if (date < sevenDaysAgo && date < firstDayOfMonth) {
      return '日期过早(不在本月且超过7天前)';
    }

    return '日期不在合理范围内';
  }

  /**
   * 获取当前日期(北京时区)
   * @returns 当前日期
   */
  private getCurrentDate(): Date {
    try {
      const now = new Date();
      const beijingOffset = 8 * 60; // 北京时区 UTC+8
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      return new Date(utc + beijingOffset * 60000);
    } catch (error) {
      // 时区转换失败,回退到系统时区
      console.error('[日期校验] 时区转换失败:', error);
      return new Date();
    }
  }

  /**
   * 获取本月第一天(北京时区)
   * @returns 本月第一天
   */
  private getFirstDayOfMonth(): Date {
    const currentDate = this.getCurrentDate();
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
      0, 0, 0, 0
    );
  }

  /**
   * 获取7天前的日期(北京时区)
   * @returns 7天前的日期
   */
  private getSevenDaysAgo(): Date {
    const currentDate = this.getCurrentDate();
    const sevenDaysAgo = new Date(currentDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return sevenDaysAgo;
  }
}
