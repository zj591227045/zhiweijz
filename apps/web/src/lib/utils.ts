import dayjs from "dayjs";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并CSS类名
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
  return dayjs(date).format(format);
}

/**
 * 获取相对时间
 * @param date 日期
 * @returns 相对时间字符串
 */
export function getRelativeTime(date: Date | string) {
  const relativeTime = require("dayjs/plugin/relativeTime");
  const zhCN = require("dayjs/locale/zh-cn");

  dayjs.extend(relativeTime);
  dayjs.locale("zh-cn");

  return (dayjs(date) as any).fromNow();
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

  // 如果图标名称已经包含完整的类名，则直接返回
  if (iconName.startsWith("fa-")) {
    return iconName;
  }

  // 图标映射表 - 扩展更完整的图标映射
  const iconMap: Record<string, string> = {
    // 基础分类
    food: 'fa-utensils',
    shopping: 'fa-shopping-bag',
    transport: 'fa-bus',
    entertainment: 'fa-film',
    home: 'fa-home',
    health: 'fa-heartbeat',
    education: 'fa-graduation-cap',
    travel: 'fa-plane',
    other: 'fa-ellipsis-h',

    // 收入类别
    salary: 'fa-money-bill-wave',
    investment: 'fa-chart-line',
    bonus: 'fa-gift',
    interest: 'fa-percentage',

    // 支出类别
    restaurant: 'fa-utensils',
    clothing: 'fa-tshirt',
    medical: 'fa-heartbeat',
    gift: 'fa-gift',
    communication: 'fa-mobile-alt',
    daily: 'fa-shopping-basket',
    sports: 'fa-running',
    beauty: 'fa-spa',
    child: 'fa-baby',
    elder: 'fa-user-friends',
    social: 'fa-users',
    digital: 'fa-laptop',
    car: 'fa-car',
    repayment: 'fa-hand-holding-usd',
    insurance: 'fa-shield-alt',
    office: 'fa-briefcase',
    repair: 'fa-tools',

    // 中文分类名称映射
    餐饮: 'fa-utensils',
    购物: 'fa-shopping-bag',
    交通: 'fa-bus',
    娱乐: 'fa-film',
    住房: 'fa-home',
    医疗: 'fa-heartbeat',
    学习: 'fa-graduation-cap',
    旅行: 'fa-plane',
    工资: 'fa-money-bill-wave',
    投资: 'fa-chart-line',
    奖金: 'fa-gift',
    利息: 'fa-percentage',
    服饰: 'fa-tshirt',
    通讯: 'fa-mobile-alt',
    日用: 'fa-shopping-basket',
    运动: 'fa-running',
    美容: 'fa-spa',
    孩子: 'fa-baby',
    社交: 'fa-users',
    数码: 'fa-laptop',
    汽车: 'fa-car',
    保险: 'fa-shield-alt',
    办公: 'fa-briefcase',
    维修: 'fa-tools',
    其他: 'fa-ellipsis-h',
  };

  return iconMap[iconName] || 'fa-tag';
}

/**
 * 获取图标完整类名
 * @param iconName 图标名称
 * @returns 完整的Font Awesome图标类名
 */
export function getIconClass(iconName?: string): string {
  if (!iconName) return 'fas fa-tag';

  // 如果图标名称已经包含完整的类名，则直接返回
  if (iconName.startsWith("fa-")) {
    return `fas ${iconName}`;
  }

  // 使用getCategoryIconClass获取图标名称
  const iconClass = getCategoryIconClass(iconName);
  return `fas ${iconClass}`;
}

/**
 * 格式化百分比
 * @param percentage 百分比
 * @returns 格式化后的百分比
 */
export function formatPercentage(percentage: number): string {
  return percentage.toFixed(1);
}

/**
 * 格式化日期范围
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 格式化后的日期范围
 */
export function formatDateRange(startDate: string, endDate: string): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  // 如果是同一个月
  if (start.year() === end.year() && start.month() === end.month()) {
    return `${start.year()}年${start.month() + 1}月`;
  }

  // 如果是同一年
  if (start.year() === end.year()) {
    return `${start.year()}年${start.month() + 1}月-${end.month() + 1}月`;
  }

  // 不同年
  return `${start.year()}/${start.month() + 1}-${end.year()}/${end.month() + 1}`;
}

/**
 * 获取上个月的开始和结束日期
 * @param currentDate 当前日期，默认为当前时间
 * @returns 上个月的开始和结束日期
 */
export function getPreviousMonthRange(currentDate: Date = new Date()): { startDate: string; endDate: string } {
  const start = dayjs(currentDate).subtract(1, 'month').startOf('month');
  const end = dayjs(currentDate).subtract(1, 'month').endOf('month');

  return {
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD')
  };
}

/**
 * 获取下个月的开始和结束日期
 * @param currentDate 当前日期，默认为当前时间
 * @returns 下个月的开始和结束日期
 */
export function getNextMonthRange(currentDate: Date = new Date()): { startDate: string; endDate: string } {
  const start = dayjs(currentDate).add(1, 'month').startOf('month');
  const end = dayjs(currentDate).add(1, 'month').endOf('month');

  return {
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD')
  };
}

/**
 * 复制到剪贴板
 * @param text 要复制的文本
 * @returns 是否复制成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    return false;
  }
}

/**
 * 分享内容
 * @param data 分享数据
 * @returns 是否分享成功
 */
export async function shareContent(data: ShareData): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('分享失败:', error);
      return false;
    }
  }
  return false;
}

/**
 * 检查是否过期
 * @param dateString 日期字符串
 * @returns 是否过期
 */
export function isExpired(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

/**
 * 获取头像文本
 * @param name 姓名
 * @returns 头像文本
 */
export function getAvatarText(name: string): string {
  return name.charAt(0).toUpperCase();
}

/**
 * 计算年龄
 * @param birthDate 出生日期
 * @returns 年龄字符串
 */
export function calculateAge(birthDate: string): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  return `${age}岁`;
}

/**
 * 格式化相对时间
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) {
    return '刚刚';
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`;
  } else if (diffInHours < 48) {
    return '昨天';
  } else {
    return dayjs(date).format('MM-DD');
  }
}
