/**
 * 格式化货币金额
 * @param amount 金额
 * @param currency 货币符号，默认为 '¥'
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(amount: number | undefined | null, currency: string = '¥'): string {
  // 处理undefined、null或0值
  if (amount === undefined || amount === null) return `${currency}0.00`;
  if (amount === 0) return `${currency}0.00`;

  // 格式化金额
  try {
    // 处理负数
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);

    const formattedAmount = absAmount.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return isNegative ? `-${currency}${formattedAmount}` : `${currency}${formattedAmount}`;
  } catch (error) {
    console.error('格式化金额错误:', error, '金额:', amount);
    return `${currency}0.00`;
  }
}

/**
 * 格式化百分比
 * @param value 百分比值（0-100）
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0.0%';
  try {
    return `${value.toFixed(1)}%`;
  } catch (error) {
    console.error('格式化百分比错误:', error, '值:', value);
    return '0.0%';
  }
}

/**
 * 格式化数字
 * @param value 数字
 * @param digits 小数位数，默认为0
 * @returns 格式化后的数字字符串
 */
export function formatNumber(value: number | undefined | null, digits: number = 0): string {
  if (value === undefined || value === null) return '0';
  try {
    return value.toLocaleString('zh-CN', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  } catch (error) {
    console.error('格式化数字错误:', error, '值:', value);
    return '0';
  }
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
