/**
 * 格式化货币金额
 * @param amount 金额
 * @param currency 货币符号，默认为 '¥'
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(amount: number, currency: string = '¥'): string {
  // 处理0值
  if (amount === 0) return `${currency}0`;
  
  // 格式化金额
  const formattedAmount = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${currency}${formattedAmount}`;
}

/**
 * 格式化百分比
 * @param value 百分比值（0-100）
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * 格式化数字
 * @param value 数字
 * @param digits 小数位数，默认为0
 * @returns 格式化后的数字字符串
 */
export function formatNumber(value: number, digits: number = 0): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}
