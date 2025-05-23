/**
 * 格式化金额
 * @param amount 金额
 * @param currency 货币符号
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(amount: number | undefined | null, currency: string = "¥"): string {
  if (amount === undefined || amount === null) return `${currency}0.00`;

  // 处理负数
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  return isNegative ? `-${currency}${absAmount.toFixed(2)}` : `${currency}${absAmount.toFixed(2)}`;
}

/**
 * 格式化百分比
 * @param value 百分比值 (0-100)
 * @param decimalPlaces 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercentage(value: number | undefined | null, decimalPlaces: number = 2): string {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(decimalPlaces)}%`;
}

/**
 * 格式化数字
 * @param value 数字
 * @param decimalPlaces 小数位数
 * @returns 格式化后的数字字符串
 */
export function formatNumber(value: number | undefined | null, decimalPlaces: number = 2): string {
  if (value === undefined || value === null) return '0';
  return value.toFixed(decimalPlaces);
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化手机号码
 * @param phoneNumber 手机号码
 * @returns 格式化后的手机号码字符串
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.length !== 11) return phoneNumber;
  return `${phoneNumber.substring(0, 3)}****${phoneNumber.substring(7)}`;
}

/**
 * 格式化银行卡号
 * @param cardNumber 银行卡号
 * @returns 格式化后的银行卡号字符串
 */
export function formatBankCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return cardNumber;
  return `****${cardNumber.substring(cardNumber.length - 4)}`;
}

/**
 * 格式化身份证号
 * @param idNumber 身份证号
 * @returns 格式化后的身份证号字符串
 */
export function formatIdNumber(idNumber: string): string {
  if (!idNumber || idNumber.length !== 18) return idNumber;
  return `${idNumber.substring(0, 6)}********${idNumber.substring(14)}`;
}

/**
 * 格式化邮箱地址
 * @param email 邮箱地址
 * @returns 格式化后的邮箱地址字符串
 */
export function formatEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [username, domain] = email.split('@');
  if (username.length <= 2) return email;
  
  return `${username.substring(0, 2)}***@${domain}`;
}
