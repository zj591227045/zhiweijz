import { PrismaClient } from '@prisma/client';
import { CreateFeedbackDto } from '../models/feedback.model';

export class FeedbackRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 创建反馈
   */
  async create(userId: string, data: CreateFeedbackDto) {
    // 将title和content合并到content字段中
    const content = `标题: ${data.title}\n\n内容: ${data.content}${data.contact ? `\n\n联系方式: ${data.contact}` : ''}`;
    
    return this.prisma.userFeedback.create({
      data: {
        userId,
        feedbackType: data.type,
        content,
      },
    });
  }

  /**
   * 获取用户的反馈列表
   */
  async findByUserId(userId: string) {
    return this.prisma.userFeedback.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 获取所有反馈（管理员用）
   */
  async findAll() {
    return this.prisma.userFeedback.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
