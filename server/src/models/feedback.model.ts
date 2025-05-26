/**
 * 反馈类型
 */
export enum FeedbackType {
  BUG = 'bug',
  FEATURE = 'feature',
  OTHER = 'other',
}

/**
 * 创建反馈DTO
 */
export interface CreateFeedbackDto {
  type: FeedbackType;
  title: string;
  content: string;
  contact?: string;
}

/**
 * 反馈响应DTO
 */
export interface FeedbackResponseDto {
  id: string;
  userId: string;
  feedbackType: string;
  content: string;
  createdAt: Date;
}
