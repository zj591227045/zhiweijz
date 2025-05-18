import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";

/**
 * 合并Tailwind CSS类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
 * 格式化金额
 * @param amount 金额
 * @param currency 货币符号
 * @returns 格式化后的金额字符串
 */
export function formatCurrency(amount: number | undefined | null, currency: string = "¥") {
  if (amount === undefined || amount === null) return `${currency}0.00`;

  // 处理负数
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  return isNegative ? `-${currency}${absAmount.toFixed(2)}` : `${currency}${absAmount.toFixed(2)}`;
}

/**
 * 格式化日期
 * @param date 日期
 * @param format 格式
 * @returns 格式化后的日期字符串
 */
export function formatDate(date: Date | string, format: string = "YYYY-MM-DD") {
  const dayjs = require("dayjs");
  return dayjs(date).format(format);
}

/**
 * 获取相对时间
 * @param date 日期
 * @returns 相对时间字符串
 */
export function getRelativeTime(date: Date | string) {
  const dayjs = require("dayjs");
  const relativeTime = require("dayjs/plugin/relativeTime");
  const zhCN = require("dayjs/locale/zh-cn");

  dayjs.extend(relativeTime);
  dayjs.locale("zh-cn");

  return dayjs(date).fromNow();
}

/**
 * 防抖函数
 * @param fn 要执行的函数
 * @param ms 延迟时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * 节流函数
 * @param fn 要执行的函数
 * @param ms 延迟时间
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return function(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= ms) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * 获取分类图标类名
 * @param iconName 图标名称
 * @returns Font Awesome图标类名
 */
export function getCategoryIconClass(iconName?: string): string {
  if (!iconName) return 'fa-tag';

  // 图标映射表
  const iconMap: Record<string, string> = {
    food: 'fa-utensils',
    shopping: 'fa-shopping-bag',
    transport: 'fa-bus',
    entertainment: 'fa-film',
    home: 'fa-home',
    health: 'fa-heartbeat',
    education: 'fa-graduation-cap',
    travel: 'fa-plane',
    other: 'fa-ellipsis-h',
    // 添加更多图标映射
    utensils: 'fa-utensils',
    'shopping-bag': 'fa-shopping-bag',
    bus: 'fa-bus',
    film: 'fa-film',
    home: 'fa-home',
    heartbeat: 'fa-heartbeat',
    'graduation-cap': 'fa-graduation-cap',
    plane: 'fa-plane',
    'ellipsis-h': 'fa-ellipsis-h',
  };

  return iconMap[iconName] || 'fa-tag';
}


