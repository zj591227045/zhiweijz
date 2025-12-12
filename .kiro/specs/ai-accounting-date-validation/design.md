# 设计文档

## 概述

本文档描述AI记账日期校验与修正功能的技术设计。该功能通过在LLM解析结果和数据库写入之间插入日期校验中间件,实现对异常日期的检测和修正,确保记账数据的准确性。

核心设计理念:
- **单一职责**: 日期校验逻辑独立封装,不侵入现有业务代码
- **来源感知**: 根据记账来源(App/微信)采用不同的处理策略
- **无破坏性**: 完全向后兼容,不改变现有数据结构
- **可观测性**: 完整的日志记录便于问题追踪

## 架构

### 整体架构

```
┌─────────────┐
│ 图片/语音   │
│ 识别服务    │
└──────┬──────┘
       │ 识别文本
       ▼
┌─────────────┐
│ LLM智能     │
│ 记账服务    │
└──────┬──────┘
       │ 解析结果
       ▼
┌─────────────┐  ◄── 新增组件
│ 日期校验    │
│ 中间件      │
└──────┬──────┘
       │ 校验结果
       ├─────────┬─────────┐
       │         │         │
       ▼         ▼         ▼
   正常日期   App异常   微信异常
       │         │         │
       ▼         ▼         ▼
   直接创建   返回修正   自动修正
              提示       +警告
```

### 数据流

1. **输入**: LLM解析的记账结果(单条或多条)
2. **校验**: 日期校验中间件处理
3. **输出**: 
   - 正常: 原始结果
   - App异常: 带修正标识的结果
   - 微信异常: 自动修正后的结果+警告

## 组件和接口

### 1. DateValidationService (日期校验服务)

核心校验逻辑封装。

```typescript
interface DateValidationResult {
  isValid: boolean;
  originalDate: Date;
  suggestedDate: Date;
  reason?: string;
}

interface DateValidationOptions {
  source: 'app' | 'wechat';
  allowFuture?: boolean;
}

class DateValidationService {
  /**
   * 校验单个日期
   */
  validateDate(
    date: Date | null | undefined,
    options: DateValidationOptions
  ): DateValidationResult;

  /**
   * 批量校验日期
   */
  validateDates(
    dates: Array<Date | null | undefined>,
    options: DateValidationOptions
  ): DateValidationResult[];

  /**
   * 判断日期是否在合理范围内
   */
  private isDateInValidRange(date: Date): boolean;

  /**
   * 获取当前日期(北京时区)
   */
  private getCurrentDate(): Date;

  /**
   * 获取本月第一天
   */
  private getFirstDayOfMonth(): Date;

  /**
   * 获取7天前的日期
   */
  private getSevenDaysAgo(): Date;
}
```

### 2. DateCorrectionMiddleware (日期修正中间件)

集成到现有记账流程的中间件。

```typescript
interface SmartAccountingResultWithValidation extends SmartAccountingResult {
  dateValidation?: {
    isValid: boolean;
    requiresCorrection: boolean;
    originalDate: Date;
    suggestedDate: Date;
    reason: string;
  };
}

class DateCorrectionMiddleware {
  /**
   * 处理单条记账结果
   */
  processSingleRecord(
    result: SmartAccountingResult,
    source: 'app' | 'wechat'
  ): SmartAccountingResultWithValidation;

  /**
   * 处理多条记账结果
   */
  processBatchRecords(
    results: SmartAccountingResult[],
    source: 'app' | 'wechat'
  ): SmartAccountingResultWithValidation[];

  /**
   * 应用日期修正(微信端自动修正)
   */
  private applyDateCorrection(
    result: SmartAccountingResult,
    validation: DateValidationResult
  ): SmartAccountingResult;

  /**
   * 生成修正提示(App端)
   */
  private generateCorrectionPrompt(
    validation: DateValidationResult
  ): object;
}
```

### 3. WechatMessageFormatter (微信消息格式化器)

专门处理微信端的警告消息格式化。

```typescript
interface WechatWarningMessage {
  hasWarning: boolean;
  warningText: string;
  correctedRecords: Array<{
    index: number;
    originalDate: string;
    correctedDate: string;
  }>;
}

class WechatMessageFormatter {
  /**
   * 格式化日期警告消息
   */
  formatDateWarning(
    validationResults: DateValidationResult[]
  ): WechatWarningMessage;

  /**
   * 将警告消息附加到成功消息
   */
  appendWarningToSuccessMessage(
    successMessage: string,
    warning: WechatWarningMessage
  ): string;
}
```

### 4. DateValidationLogger (日期校验日志记录器)

统一的日志记录接口。

```typescript
interface DateValidationLogEntry {
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

class DateValidationLogger {
  /**
   * 记录日期校验
   */
  logValidation(entry: DateValidationLogEntry): void;

  /**
   * 记录日期修正
   */
  logCorrection(entry: DateValidationLogEntry): void;

  /**
   * 记录批量校验统计
   */
  logBatchSummary(
    totalCount: number,
    invalidCount: number,
    source: string
  ): void;
}
```

## 数据模型

### 扩展现有模型

不需要修改数据库schema,只在运行时扩展数据结构:

```typescript
// 扩展SmartAccountingResult
interface SmartAccountingResult {
  // ... 现有字段
  date: Date;
  
  // 新增字段(可选,仅在需要时添加)
  dateValidation?: {
    isValid: boolean;
    requiresCorrection: boolean;
    originalDate: Date;
    suggestedDate: Date;
    reason: string;
  };
}

// API响应格式(App端日期异常时)
interface DateCorrectionResponse {
  requiresDateCorrection: true;
  records: Array<SmartAccountingResultWithValidation>;
  message: string;
}

// API响应格式(微信端)
interface WechatAccountingResponse {
  success: boolean;
  message: string; // 包含警告文本
  transaction?: any;
  dateWarnings?: WechatWarningMessage;
}
```

## 正确性属性

*属性是一个特征或行为,应该在系统的所有有效执行中保持为真。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 空日期默认值一致性

*对于任何* AI识别结果,如果日期字段为null、undefined或空字符串,则处理后的日期应该等于当前日期(北京时区)

**验证: 需求 1.1, 1.2, 1.4**

### 属性 2: 未来日期检测准确性

*对于任何* 晚于今天的日期,系统应该判定为异常

**验证: 需求 2.1**

### 属性 3: 历史日期检测准确性

*对于任何* 不在本月且早于"今天-7天"的日期,系统应该判定为异常

**验证: 需求 2.2**

### 属性 4: 合理日期通过性

*对于任何* 在本月内或在"今天-7天"到"今天"范围内的日期,系统应该判定为正常

**验证: 需求 2.3**

### 属性 5: 来源感知处理一致性

*对于任何* 日期异常的记录,如果来源为App则返回修正提示,如果来源为微信则自动修正为今天

**验证: 需求 2.4, 2.5, 4.1**

### 属性 6: App端修正响应完整性

*对于任何* App端的日期异常,返回的响应应该包含requiresDateCorrection标识、原始日期、建议日期和异常原因

**验证: 需求 3.1, 3.2**

### 属性 7: 微信端警告消息完整性

*对于任何* 微信端的日期异常,返回消息应该包含警告emoji、原始日期和修正后日期

**验证: 需求 4.2, 4.3, 4.4**

### 属性 8: 日志记录完整性

*对于任何* 日期校验操作,日志应该包含用户ID、账本ID、原始日期、校验结果和来源渠道

**验证: 需求 5.1, 5.3**

### 属性 9: 日志级别正确性

*对于任何* 日志记录,异常日期应该使用WARN级别,正常日期应该使用INFO级别

**验证: 需求 5.5**

### 属性 10: 批量校验独立性

*对于任何* 多条记账记录,每条记录的日期校验结果应该独立,不受其他记录影响

**验证: 需求 6.1**

### 属性 11: 批量异常标记准确性

*对于任何* 批量记录,如果某条记录日期异常,则该记录应该被明确标记

**验证: 需求 6.2**

### 属性 12: 记录选择数据扩展性

*对于任何* 需要用户选择的多条记录,每条记录应该附加日期校验结果字段

**验证: 需求 7.1**

### 属性 13: 二次校验一致性

*对于任何* 用户选择的记录,创建前的二次校验结果应该与初次校验结果一致(如果日期未被修改)

**验证: 需求 7.3**

### 属性 14: 修改后日期校验实时性

*对于任何* 用户修改后的日期,系统应该立即执行校验并返回结果

**验证: 需求 7.4**

## 错误处理

### 错误场景

1. **日期解析失败**: LLM返回无效的日期格式
   - 处理: 使用当前日期作为默认值
   - 日志: WARN级别记录解析失败

2. **时区转换错误**: 北京时区转换失败
   - 处理: 回退到系统时区
   - 日志: ERROR级别记录转换错误

3. **批量处理部分失败**: 某些记录校验失败
   - 处理: 继续处理其他记录,标记失败记录
   - 日志: WARN级别记录失败详情

4. **日志写入失败**: 日志系统不可用
   - 处理: 不影响主流程,静默失败
   - 备用: 输出到console

### 错误响应格式

```typescript
interface DateValidationError {
  code: 'INVALID_DATE' | 'PARSE_ERROR' | 'TIMEZONE_ERROR';
  message: string;
  originalValue: any;
  fallbackValue: Date;
}
```

## 测试策略

### 单元测试

测试各个组件的核心逻辑:

- DateValidationService的日期范围判断
- DateCorrectionMiddleware的来源路由
- WechatMessageFormatter的消息格式化
- DateValidationLogger的日志格式

### 属性测试

使用fast-check库进行属性测试,每个属性至少运行100次:

- 生成随机日期测试属性1-4
- 生成随机来源测试属性5
- 生成随机记录数组测试属性10-11
- 生成随机用户操作测试属性13-14

### 集成测试

测试完整的记账流程:

- App端图片记账 → 日期异常 → 修正提示
- 微信端语音记账 → 日期异常 → 自动修正
- 批量记录 → 部分异常 → 混合处理

### 边界测试

重点测试边界情况:

- 今天0点0分0秒
- 本月第一天
- 今天-7天的23:59:59
- 跨月边界(月末到月初)
- 闰年2月29日

## 性能考虑

### 性能目标

- 单次日期校验: < 1ms
- 批量校验(100条): < 10ms
- 日志写入: 异步,不阻塞主流程

### 优化策略

1. **缓存当前日期**: 同一请求内复用当前日期计算结果
2. **批量处理优化**: 使用并行校验而非串行
3. **日志异步写入**: 使用队列缓冲日志,批量写入
4. **避免重复计算**: 缓存本月第一天、7天前等固定值

### 性能监控

记录关键指标:

- 日期校验平均耗时
- 异常日期比例
- 批量处理记录数分布
- 日志写入延迟

## 部署考虑

### 配置项

```typescript
interface DateValidationConfig {
  // 合理日期范围(天数)
  validDaysInPast: number; // 默认7
  
  // 是否允许未来日期
  allowFutureDates: boolean; // 默认false
  
  // 是否启用日期校验
  enabled: boolean; // 默认true
  
  // 日志级别
  logLevel: 'INFO' | 'WARN' | 'ERROR'; // 默认INFO
  
  // 是否启用批量优化
  enableBatchOptimization: boolean; // 默认true
}
```

### 向后兼容

- 新增字段都是可选的,不影响现有API
- 如果配置disabled,中间件直接透传
- 日志记录失败不影响主流程

### 监控和告警

- 异常日期比例超过20%触发告警
- 日期校验失败率超过5%触发告警
- 日志写入延迟超过1秒触发告警

## 安全考虑

### 输入验证

- 日期字符串长度限制(< 100字符)
- 日期范围限制(1900-2100年)
- 防止时区注入攻击

### 日志脱敏

- 不记录敏感的记账金额
- 不记录完整的记账描述
- 只记录必要的标识符

### 权限控制

- 日期修正操作需要用户认证
- 日志查询需要管理员权限
- 配置修改需要超级管理员权限
