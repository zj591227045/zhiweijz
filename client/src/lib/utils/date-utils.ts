import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

// 设置语言为中文
dayjs.locale('zh-cn');

/**
 * 格式化日期为友好显示
 * @param dateString 日期字符串
 * @param format 格式化模式，默认为 'YYYY年MM月DD日'
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateString: string, format: string = 'YYYY年MM月DD日'): string {
  return dayjs(dateString).format(format);
}

/**
 * 获取相对时间（例如：3分钟前，1小时前，昨天，等）
 * @param dateString 日期字符串
 * @returns 相对时间字符串
 */
export function getRelativeTime(dateString: string): string {
  const date = dayjs(dateString);
  const now = dayjs();
  
  const diffMinutes = now.diff(date, 'minute');
  const diffHours = now.diff(date, 'hour');
  const diffDays = now.diff(date, 'day');
  
  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 30) {
    if (diffDays === 1) {
      return '昨天';
    } else if (diffDays === 2) {
      return '前天';
    } else {
      return `${diffDays}天前`;
    }
  } else {
    return formatDate(dateString, 'YYYY年MM月DD日');
  }
}
