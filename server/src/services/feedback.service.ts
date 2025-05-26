import { FeedbackRepository } from '../repositories/feedback.repository';
import { CreateFeedbackDto, FeedbackResponseDto } from '../models/feedback.model';

export class FeedbackService {
  private feedbackRepository: FeedbackRepository;

  constructor() {
    this.feedbackRepository = new FeedbackRepository();
  }

  /**
   * 创建反馈
   */
  async createFeedback(userId: string, data: CreateFeedbackDto): Promise<FeedbackResponseDto> {
    const feedback = await this.feedbackRepository.create(userId, data);
    
    return {
      id: feedback.id,
      userId: feedback.userId,
      feedbackType: feedback.feedbackType,
      content: feedback.content || '',
      createdAt: feedback.createdAt,
    };
  }

  /**
   * 获取用户的反馈列表
   */
  async getUserFeedbacks(userId: string): Promise<FeedbackResponseDto[]> {
    const feedbacks = await this.feedbackRepository.findByUserId(userId);
    
    return feedbacks.map(feedback => ({
      id: feedback.id,
      userId: feedback.userId,
      feedbackType: feedback.feedbackType,
      content: feedback.content || '',
      createdAt: feedback.createdAt,
    }));
  }

  /**
   * 获取所有反馈（管理员用）
   */
  async getAllFeedbacks() {
    return this.feedbackRepository.findAll();
  }
}
