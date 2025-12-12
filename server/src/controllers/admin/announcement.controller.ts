import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { announcementService } from '../../services/admin/announcement.service';
import { z } from 'zod';

// 创建公告的验证schema
const createAnnouncementSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过200个字符'),
  content: z.string().min(1, '内容不能为空'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  targetUserType: z.string().default('all'),
});

// 更新公告的验证schema
const updateAnnouncementSchema = createAnnouncementSchema.partial();

export const announcementController = {
  // 获取公告列表
  async getAnnouncements(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, priority, search } = req.query;

      const result = await announcementService.getAnnouncements({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        priority: priority as string,
        search: search as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('获取公告列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取公告列表失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 获取单个公告详情
  async getAnnouncementById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const announcement = await announcementService.getAnnouncementById(id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在',
        });
      }

      res.json({
        success: true,
        data: announcement,
      });
    } catch (error) {
      logger.error('获取公告详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取公告详情失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 创建公告
  async createAnnouncement(req: Request, res: Response) {
    try {
      const validatedData = createAnnouncementSchema.parse(req.body);
      const adminId = (req as any).user.id;

      const announcement = await announcementService.createAnnouncement({
        ...validatedData,
        publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        createdBy: adminId,
      });

      res.status(201).json({
        success: true,
        data: announcement,
        message: '公告创建成功',
      });
    } catch (error) {
      logger.error('创建公告失败:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        message: '创建公告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 更新公告
  async updateAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateAnnouncementSchema.parse(req.body);
      const adminId = (req as any).user.id;

      const announcement = await announcementService.updateAnnouncement(id, {
        ...validatedData,
        publishedAt: validatedData.publishedAt ? new Date(validatedData.publishedAt) : undefined,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        updatedBy: adminId,
      });

      res.json({
        success: true,
        data: announcement,
        message: '公告更新成功',
      });
    } catch (error) {
      logger.error('更新公告失败:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: '数据验证失败',
          errors: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        message: '更新公告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 删除公告
  async deleteAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await announcementService.deleteAnnouncement(id);

      res.json({
        success: true,
        message: '公告删除成功',
      });
    } catch (error) {
      logger.error('删除公告失败:', error);
      res.status(500).json({
        success: false,
        message: '删除公告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 发布公告
  async publishAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { publishedAt } = req.body;
      const adminId = (req as any).user.id;

      const announcement = await announcementService.publishAnnouncement(id, {
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        updatedBy: adminId,
      });

      res.json({
        success: true,
        data: announcement,
        message: '公告发布成功',
      });
    } catch (error) {
      logger.error('发布公告失败:', error);
      res.status(500).json({
        success: false,
        message: '发布公告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 撤回公告
  async unpublishAnnouncement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = (req as any).user.id;

      const announcement = await announcementService.unpublishAnnouncement(id, adminId);

      res.json({
        success: true,
        data: announcement,
        message: '公告撤回成功',
      });
    } catch (error) {
      logger.error('撤回公告失败:', error);
      res.status(500).json({
        success: false,
        message: '撤回公告失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },

  // 获取公告统计信息
  async getAnnouncementStats(req: Request, res: Response) {
    try {
      const stats = await announcementService.getAnnouncementStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('获取公告统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取公告统计失败',
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
  },
};
