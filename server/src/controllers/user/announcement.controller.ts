import { logger } from '../../utils/logger';
import { Request, Response } from 'express';
import { announcementService } from '../../services/user/announcement.service';

export const announcementController = {
  // 获取用户公告列表
  async getUserAnnouncements(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      const announcements = await announcementService.getUserAnnouncements(userId);

      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      logger.error('获取用户公告失败:', error);
      res.status(500).json({
        success: false,
        message: '获取公告失败',
      });
    }
  },

  // 获取单个公告详情
  async getAnnouncementById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const announcementId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      if (!announcementId) {
        return res.status(400).json({
          success: false,
          message: '公告ID不能为空',
        });
      }

      const announcement = await announcementService.getAnnouncementById(userId, announcementId);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: '公告不存在或已过期',
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
      });
    }
  },

  // 标记公告为已读
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const announcementId = req.params.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      if (!announcementId) {
        return res.status(400).json({
          success: false,
          message: '公告ID不能为空',
        });
      }

      await announcementService.markAsRead(userId, announcementId);

      res.json({
        success: true,
        message: '标记已读成功',
      });
    } catch (error) {
      logger.error('标记已读失败:', error);
      res.status(500).json({
        success: false,
        message: '标记已读失败',
      });
    }
  },

  // 标记所有公告为已读
  async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '用户未认证',
        });
      }

      const count = await announcementService.markAllAsRead(userId);

      res.json({
        success: true,
        message: `已标记 ${count} 条公告为已读`,
      });
    } catch (error) {
      logger.error('标记全部已读失败:', error);
      res.status(500).json({
        success: false,
        message: '标记全部已读失败',
      });
    }
  },
};
