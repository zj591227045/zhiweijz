/**
 * 日期校验配置
 */

/**
 * 日期校验配置接口
 */
export interface DateValidationConfig {
  // 合理日期范围(天数)
  validDaysInPast: number;
  
  // 是否允许未来日期
  allowFutureDates: boolean;
  
  // 是否启用日期校验
  enabled: boolean;
  
  // 日志级别
  logLevel: 'INFO' | 'WARN' | 'ERROR';
  
  // 是否启用批量优化
  enableBatchOptimization: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_DATE_VALIDATION_CONFIG: DateValidationConfig = {
  validDaysInPast: 7,
  allowFutureDates: false,
  enabled: true,
  logLevel: 'INFO',
  enableBatchOptimization: true,
};

/**
 * 日期校验配置管理器
 */
export class DateValidationConfigManager {
  private config: DateValidationConfig;

  constructor(customConfig?: Partial<DateValidationConfig>) {
    this.config = {
      ...DEFAULT_DATE_VALIDATION_CONFIG,
      ...customConfig,
    };
  }

  /**
   * 获取配置
   */
  getConfig(): DateValidationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DateValidationConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  /**
   * 重置为默认配置
   */
  resetToDefault(): void {
    this.config = { ...DEFAULT_DATE_VALIDATION_CONFIG };
  }

  /**
   * 检查是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 获取合理日期范围(天数)
   */
  getValidDaysInPast(): number {
    return this.config.validDaysInPast;
  }

  /**
   * 是否允许未来日期
   */
  allowFutureDates(): boolean {
    return this.config.allowFutureDates;
  }

  /**
   * 获取日志级别
   */
  getLogLevel(): 'INFO' | 'WARN' | 'ERROR' {
    return this.config.logLevel;
  }

  /**
   * 是否启用批量优化
   */
  isBatchOptimizationEnabled(): boolean {
    return this.config.enableBatchOptimization;
  }
}

// 导出单例实例
export const dateValidationConfig = new DateValidationConfigManager();
