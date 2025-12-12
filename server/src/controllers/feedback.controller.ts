import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto, FeedbackType } from '../models/feedback.model';

export class FeedbackController {
  private feedbackService: FeedbackService;

  constructor() {
    this.feedbackService = new FeedbackService();
  }

  /**
   * 创建反馈
   */
  async createFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const feedbackData: CreateFeedbackDto = req.body;

      // 验证反馈类型
      if (!Object.values(FeedbackType).includes(feedbackData.type)) {
        res.status(400).json({ message: '无效的反馈类型' });
        return;
      }

      // 验证必填字段
      if (!feedbackData.title?.trim()) {
        res.status(400).json({ message: '反馈标题不能为空' });
        return;
      }

      if (!feedbackData.content?.trim()) {
        res.status(400).json({ message: '反馈内容不能为空' });
        return;
      }

      const feedback = await this.feedbackService.createFeedback(userId, feedbackData);
      res.status(201).json(feedback);
    } catch (error) {
      logger.error('创建反馈失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建反馈时发生错误' });
      }
    }
  }

  /**
   * 获取用户的反馈列表
   */
  async getUserFeedbacks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const feedbacks = await this.feedbackService.getUserFeedbacks(userId);
      res.status(200).json(feedbacks);
    } catch (error) {
      logger.error('获取反馈列表失败:', error);
      res.status(500).json({ message: '获取反馈列表时发生错误' });
    }
  }

  /**
   * 获取所有反馈（管理员用）
   */
  async getAllFeedbacks(req: Request, res: Response): Promise<void> {
    try {
      const feedbacks = await this.feedbackService.getAllFeedbacks();
      res.status(200).json(feedbacks);
    } catch (error) {
      logger.error('获取所有反馈失败:', error);
      res.status(500).json({ message: '获取所有反馈时发生错误' });
    }
  }
}
