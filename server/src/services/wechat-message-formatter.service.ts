/**
 * 微信消息格式化服务
 * 专门处理微信端的日期警告消息格式化
 */

import { SmartAccountingResultWithValidation } from '../middleware/date-correction.middleware';

/**
 * 微信警告消息
 */
export interface WechatWarningMessage {
  hasWarning: boolean;
  warningText: string;
  correctedRecords: Array<{
    index: number;
    originalDate: string;
    correctedDate: string;
  }>;
}

/**
 * 微信消息格式化服务类
 */
export class WechatMessageFormatter {
  /**
   * 格式化日期警告消息
   * @param results 带校验信息的记账结果数组
   * @returns 警告消息
   */
  formatDateWarning(results: SmartAccountingResultWithValidation[]): WechatWarningMessage {
    const correctedRecords: Array<{
      index: number;
      originalDate: string;
      correctedDate: string;
    }> = [];

    results.forEach((result, index) => {
      if (result.dateValidation && !result.dateValidation.isValid) {
        const originalDate = result.dateValidation.originalDate
          ? this.formatDate(result.dateValidation.originalDate)
          : '无法识别';
        const correctedDate = this.formatDate(result.dateValidation.suggestedDate);

        correctedRecords.push({
          index: index + 1,
          originalDate,
          correctedDate,
        });
      }
    });

    if (correctedRecords.length === 0) {
      return {
        hasWarning: false,
        warningText: '',
        correctedRecords: [],
      };
    }

    // 生成警告文本
    let warningText = '\n\n⚠️ 日期修正提示:\n';
    
    if (correctedRecords.length === 1) {
      const record = correctedRecords[0];
      warningText += `识别日期"${record.originalDate}"不在合理范围内，已自动修正为今天(${record.correctedDate})`;
    } else {
      warningText += `以下记录的日期已自动修正为今天:\n`;
      correctedRecords.forEach(record => {
        warningText += `• 记录${record.index}: ${record.originalDate} → ${record.correctedDate}\n`;
      });
    }

    return {
      hasWarning: true,
      warningText,
      correctedRecords,
    };
  }

  /**
   * 将警告消息附加到成功消息
   * @param successMessage 成功消息
   * @param warning 警告消息
   * @returns 附加警告后的消息
   */
  appendWarningToSuccessMessage(
    successMessage: string,
    warning: WechatWarningMessage
  ): string {
    if (!warning.hasWarning) {
      return successMessage;
    }

    return successMessage + warning.warningText;
  }

  /**
   * 格式化日期为中文格式
   * @param date 日期对象
   * @returns 格式化后的日期字符串
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
}
