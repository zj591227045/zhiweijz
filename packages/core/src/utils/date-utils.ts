import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// 加载相对时间插件
dayjs.extend(relativeTime);

/**
 * 格式化日期为输入框格式 (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return dayjs(date).format("YYYY-MM-DD");
}

/**
 * 格式化日期为API格式 (ISO 8601)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString();
}

/**
 * 获取当前月份字符串
 */
export function getCurrentMonthString(): string {
  return dayjs().format("YYYY-MM");
}

/**
 * 获取当前月份的开始和结束日期
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const startDate = dayjs().startOf("month").format("YYYY-MM-DD");
  const endDate = dayjs().endOf("month").format("YYYY-MM-DD");
  return { startDate, endDate };
}

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string, format: string = "YYYY-MM-DD"): string {
  return dayjs(date).format(format);
}

/**
 * 获取相对时间
 * @param date 日期
 * @returns 相对时间字符串
 */
export function getRelativeTime(date: Date | string): string {
  return dayjs(date).fromNow();
}

/**
 * 获取指定月份的开始和结束日期
 * @param year 年份
 * @param month 月份 (1-12)
 * @returns 开始和结束日期
 */
export function getMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = dayjs().year(year).month(month - 1).startOf("month").format("YYYY-MM-DD");
  const endDate = dayjs().year(year).month(month - 1).endOf("month").format("YYYY-MM-DD");
  return { startDate, endDate };
}

/**
 * 获取指定日期所在月份的天数
 * @param date 日期
 * @returns 天数
 */
export function getDaysInMonth(date: Date | string): number {
  return dayjs(date).daysInMonth();
}

/**
 * 计算两个日期之间的天数差
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 天数差
 */
export function getDaysDiff(startDate: Date | string, endDate: Date | string): number {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return end.diff(start, 'day');
}

/**
 * 获取今天到月底的剩余天数
 * @returns 剩余天数
 */
export function getDaysRemainingInMonth(): number {
  const today = dayjs();
  const endOfMonth = today.endOf('month');
  return endOfMonth.diff(today, 'day');
}

/**
 * 检查日期是否在指定范围内
 * @param date 要检查的日期
 * @param startDate 范围开始日期
 * @param endDate 范围结束日期
 * @returns 是否在范围内
 */
export function isDateInRange(date: Date | string, startDate: Date | string, endDate: Date | string): boolean {
  const d = dayjs(date);
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  return d.isAfter(start) && d.isBefore(end) || d.isSame(start) || d.isSame(end);
}

/**
 * 获取最近N个月的月份列表（YYYY-MM格式）
 * @param n 月份数量
 * @returns 月份列表
 */
export function getLastNMonths(n: number): string[] {
  const result = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    result.push(`${year}-${month}`);
  }

  return result;
}
