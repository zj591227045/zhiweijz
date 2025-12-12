/**
 * 日期校验日志记录服务
 * 统一记录日期校验和修正操作
 */

/**
 * 日期校验日志条目
 */
export interface DateValidationLogEntry {
  timestamp: Date;
  userId: string;
  accountBookId: string;
  transactionId?: string;
  source: 'app' | 'wechat';
  originalDate: Date | null;
  validationResult: boolean;
  correctedDate?: Date;
  reason?: string;
}

/**
 * 日期校验日志记录器类
 */
export class DateValidationLogger {
  /**
   * 记录日期校验
   * @param entry 日志条目
   */
  logValidation(entry: DateValidationLogEntry): void {
    const level = entry.validationResult ? 'INFO' : 'WARN';
    const logMessage = this.formatLogMessage(entry, 'VALIDATION');
    
    if (level === 'WARN') {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * 记录日期修正
   * @param entry 日志条目
   */
  logCorrection(entry: DateValidationLogEntry): void {
    const logMessage = this.formatLogMessage(entry, 'CORRECTION');
    console.warn(logMessage);
  }

  /**
   * 记录批量校验统计
   * @param totalCount 总记录数
   * @param invalidCount 异常记录数
   * @param source 来源渠道
   * @param userId 用户ID
   * @param accountBookId 账本ID
   */
  logBatchSummary(
    totalCount: number,
    invalidCount: number,
    source: string,
    userId: string,
    accountBookId: string
  ): void {
    const validCount = totalCount - invalidCount;
    const logMessage = `[日期校验批量统计] 用户: ${userId}, 账本: ${accountBookId}, 来源: ${source}, 总数: ${totalCount}, 有效: ${validCount}, 异常: ${invalidCount}`;
    
    if (invalidCount > 0) {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * 格式化日志消息
   * @param entry 日志条目
   * @param type 日志类型
   * @returns 格式化后的日志消息
   */
  private formatLogMessage(entry: DateValidationLogEntry, type: 'VALIDATION' | 'CORRECTION'): string {
    const timestamp = entry.timestamp.toISOString();
    const originalDateStr = entry.originalDate ? entry.originalDate.toISOString() : 'null';
    const correctedDateStr = entry.correctedDate ? entry.correctedDate.toISOString() : 'N/A';
    
    let message = `[日期校验-${type}] `;
    message += `时间: ${timestamp}, `;
    message += `用户: ${entry.userId}, `;
    message += `账本: ${entry.accountBookId}, `;
    
    if (entry.transactionId) {
      message += `记账: ${entry.transactionId}, `;
    }
    
    message += `来源: ${entry.source}, `;
    message += `原始日期: ${originalDateStr}, `;
    message += `校验结果: ${entry.validationResult ? '有效' : '异常'}`;
    
    if (!entry.validationResult) {
      message += `, 修正日期: ${correctedDateStr}`;
      if (entry.reason) {
        message += `, 原因: ${entry.reason}`;
      }
    }
    
    return message;
  }

  /**
   * 记录日期校验错误
   * @param error 错误信息
   * @param context 上下文信息
   */
  logError(error: Error, context: {
    userId: string;
    accountBookId: string;
    source: string;
  }): void {
    console.error(
      `[日期校验错误] 用户: ${context.userId}, 账本: ${context.accountBookId}, 来源: ${context.source}, 错误: ${error.message}`,
      error.stack
    );
  }
}
