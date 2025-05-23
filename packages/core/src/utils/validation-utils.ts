/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证手机号格式（中国大陆）
 * @param phone 手机号
 * @returns 是否有效
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 密码强度评级 (0-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;
  
  // 长度检查
  if (password.length >= 8) strength += 1;
  
  // 包含小写字母
  if (/[a-z]/.test(password)) strength += 1;
  
  // 包含大写字母
  if (/[A-Z]/.test(password)) strength += 1;
  
  // 包含数字
  if (/[0-9]/.test(password)) strength += 1;
  
  // 包含特殊字符
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  
  return strength;
}

/**
 * 验证URL格式
 * @param url URL地址
 * @returns 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 验证身份证号（中国大陆）
 * @param idNumber 身份证号
 * @returns 是否有效
 */
export function isValidIdNumber(idNumber: string): boolean {
  const idNumberRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idNumberRegex.test(idNumber);
}

/**
 * 验证金额格式
 * @param amount 金额字符串
 * @returns 是否有效
 */
export function isValidAmount(amount: string): boolean {
  const amountRegex = /^(0|[1-9]\d*)(\.\d{1,2})?$/;
  return amountRegex.test(amount);
}

/**
 * 验证日期格式 (YYYY-MM-DD)
 * @param date 日期字符串
 * @returns 是否有效
 */
export function isValidDate(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * 验证时间格式 (HH:MM:SS)
 * @param time 时间字符串
 * @returns 是否有效
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * 验证日期时间格式 (YYYY-MM-DD HH:MM:SS)
 * @param dateTime 日期时间字符串
 * @returns 是否有效
 */
export function isValidDateTime(dateTime: string): boolean {
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  if (!dateTimeRegex.test(dateTime)) return false;
  
  const d = new Date(dateTime);
  return d instanceof Date && !isNaN(d.getTime());
}
