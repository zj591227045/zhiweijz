import { UserSetting } from '@prisma/client';

/**
 * 用户设置创建DTO
 */
export interface CreateUserSettingDto {
  key: string;
  value: string;
}

/**
 * 用户设置更新DTO
 */
export interface UpdateUserSettingDto {
  value: string;
}

/**
 * 用户设置批量更新DTO
 */
export interface BatchUpdateUserSettingsDto {
  settings: {
    key: string;
    value: string;
  }[];
}

/**
 * 用户设置响应DTO
 */
export interface UserSettingResponseDto {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 将用户设置实体转换为响应DTO
 */
export function toUserSettingResponseDto(setting: UserSetting): UserSettingResponseDto {
  const { id, key, value, createdAt, updatedAt } = setting;
  return { id, key, value, createdAt, updatedAt };
}

/**
 * 预定义的用户设置键
 */
export enum UserSettingKey {
  // 主题设置
  THEME = 'theme',
  // 语言设置
  LANGUAGE = 'language',
  // 货币设置
  CURRENCY = 'currency',
  // 通知设置
  NOTIFICATIONS_ENABLED = 'notifications_enabled',
  // 预算提醒设置
  BUDGET_ALERT_THRESHOLD = 'budget_alert_threshold',
  // 显示设置
  DISPLAY_MODE = 'display_mode',
  // 默认视图设置
  DEFAULT_VIEW = 'default_view',
  // 日期格式设置
  DATE_FORMAT = 'date_format',
  // 时间格式设置
  TIME_FORMAT = 'time_format',
  // 首页设置
  HOME_PAGE = 'home_page',
  // 默认账本ID
  DEFAULT_ACCOUNT_BOOK_ID = 'default_account_book_id',
  // AI服务启用状态
  AI_SERVICE_ENABLED = 'ai_service_enabled',
  // AI服务类型
  AI_SERVICE_TYPE = 'ai_service_type',
}
