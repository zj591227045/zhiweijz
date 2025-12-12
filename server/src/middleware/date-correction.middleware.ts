/**
 * 日期修正中间件
 * 在LLM解析结果和数据库写入之间进行日期校验和修正
 */

import { DateValidationService, DateValidationResult } from '../services/date-validation.service';
import { SmartAccountingResult } from '../types/smart-accounting';

/**
 * 带日期校验信息的记账结果
 */
export interface SmartAccountingResultWithValidation extends SmartAccountingResult {
  dateValidation?: {
    isValid: boolean;
    requiresCorrection: boolean;
    originalDate: Date | null;
    suggestedDate: Date;
    reason: string;
  };
}

/**
 * 日期修正中间件类
 */
export class DateCorrectionMiddleware {
  private validationService: DateValidationService;

  constructor() {
    this.validationService = new DateValidationService();
  }

  /**
   * 处理单条记账结果
   * @param result 记账结果
   * @param source 来源渠道
   * @param context 上下文信息(用于日志记录)
   * @returns 带校验信息的记账结果
   */
  processSingleRecord(
    result: SmartAccountingResult,
    source: 'app' | 'wechat',
    context?: { userId: string; accountBookId: string }
  ): SmartAccountingResultWithValidation {
    // 校验日期
    const validation = this.validationService.validateDate(result.date, { source }, context);

    // 如果日期有效,直接返回
    if (validation.isValid) {
      // 如果原始日期为空,使用建议日期
      if (!validation.originalDate) {
        result.date = validation.suggestedDate;
      }
      return result;
    }

    // 日期异常处理
    if (source === 'wechat') {
      // 微信端: 自动修正为今天
      return this.applyDateCorrection(result, validation);
    } else {
      // App端: 返回修正提示
      return this.generateCorrectionPrompt(result, validation);
    }
  }

  /**
   * 处理多条记账结果
   * @param results 记账结果数组
   * @param source 来源渠道
   * @param context 上下文信息(用于日志记录)
   * @returns 带校验信息的记账结果数组
   */
  processBatchRecords(
    results: SmartAccountingResult[],
    source: 'app' | 'wechat',
    context?: { userId: string; accountBookId: string }
  ): SmartAccountingResultWithValidation[] {
    return results.map(result => this.processSingleRecord(result, source, context));
  }

  /**
   * 应用日期修正(微信端自动修正)
   * @param result 记账结果
   * @param validation 校验结果
   * @returns 修正后的记账结果
   */
  private applyDateCorrection(
    result: SmartAccountingResult,
    validation: DateValidationResult
  ): SmartAccountingResultWithValidation {
    const correctedResult: SmartAccountingResultWithValidation = {
      ...result,
      date: validation.suggestedDate,
      dateValidation: {
        isValid: false,
        requiresCorrection: false, // 已自动修正
        originalDate: validation.originalDate,
        suggestedDate: validation.suggestedDate,
        reason: validation.reason || '日期异常,已自动修正为今天',
      },
    };

    return correctedResult;
  }

  /**
   * 生成修正提示(App端)
   * @param result 记账结果
   * @param validation 校验结果
   * @returns 带修正提示的记账结果
   */
  private generateCorrectionPrompt(
    result: SmartAccountingResult,
    validation: DateValidationResult
  ): SmartAccountingResultWithValidation {
    const resultWithPrompt: SmartAccountingResultWithValidation = {
      ...result,
      dateValidation: {
        isValid: false,
        requiresCorrection: true, // 需要用户修正
        originalDate: validation.originalDate,
        suggestedDate: validation.suggestedDate,
        reason: validation.reason || '日期异常,请确认修正',
      },
    };

    return resultWithPrompt;
  }

  /**
   * 检查批量结果中是否有日期异常
   * @param results 带校验信息的记账结果数组
   * @returns 是否有异常
   */
  hasDateAnomalies(results: SmartAccountingResultWithValidation[]): boolean {
    return results.some(r => r.dateValidation && !r.dateValidation.isValid);
  }

  /**
   * 获取异常记录的索引列表
   * @param results 带校验信息的记账结果数组
   * @returns 异常记录的索引数组
   */
  getAnomalyIndices(results: SmartAccountingResultWithValidation[]): number[] {
    return results
      .map((r, index) => (r.dateValidation && !r.dateValidation.isValid ? index : -1))
      .filter(index => index !== -1);
  }

  /**
   * 统计批量校验结果
   * @param results 带校验信息的记账结果数组
   * @returns 统计信息
   */
  getBatchSummary(results: SmartAccountingResultWithValidation[]): {
    total: number;
    valid: number;
    invalid: number;
    corrected: number;
    requiresCorrection: number;
  } {
    const total = results.length;
    let valid = 0;
    let invalid = 0;
    let corrected = 0;
    let requiresCorrection = 0;

    results.forEach(r => {
      if (!r.dateValidation || r.dateValidation.isValid) {
        valid++;
      } else {
        invalid++;
        if (r.dateValidation.requiresCorrection) {
          requiresCorrection++;
        } else {
          corrected++;
        }
      }
    });

    return { total, valid, invalid, corrected, requiresCorrection };
  }
}
