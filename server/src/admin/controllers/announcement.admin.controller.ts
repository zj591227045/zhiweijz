import { Request, Response } from 'express';
import {
  AnnouncementAdminService,
  CreateAnnouncementData,
  UpdateAnnouncementData,
} from '../services/announcement.admin.service';
import { announcement_status, announcement_priority } from '@prisma/client';

export class AnnouncementAdminController {
  private announcementAdminService: AnnouncementAdminService;

  constructor() {
    this.announcementAdminService = new AnnouncementAdminService();
  }

  /**
   * 获取公告列表
   */
  async getAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '20', status, priority, search } = req.query;

      const query = {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as announcement_status,
        priority: priority as announcement_priority,
        search: search as string,
      };

      const result = await this.announcementAdminService.getAnnouncements(query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('获取公告列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取公告列表失败',
      });
    }
  }

  /**
   * 获取公告详情
   */
  async getAnnouncementById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const announcement = await this.announcementAdminService.getAnnouncementById(id);

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: '公告不存在',
        });
        return;
      }

      res.json({
        success: true,
        data: { announcement },
      });
    } catch (error) {
      console.error('获取公告详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取公告详情失败',
      });
    }
  }

  /**
   * 创建公告
   */
  async createAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { title, content, priority, publishedAt, expiresAt, targetUserType } = req.body;
      const adminId = (req as any).admin.id;

      if (!title || !content) {
        res.status(400).json({
          success: false,
          message: '标题和内容不能为空',
        });
        return;
      }

      const data: CreateAnnouncementData = {
        title,
        content,
        priority: priority as announcement_priority,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        targetUserType,
      };

      const announcement = await this.announcementAdminService.createAnnouncement(data, adminId);

      res.status(201).json({
        success: true,
        message: '公告创建成功',
        data: { announcement },
      });
    } catch (error) {
      console.error('创建公告错误:', error);
      res.status(500).json({
        success: false,
        message: '创建公告失败',
      });
    }
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, content, priority, publishedAt, expiresAt, targetUserType } = req.body;
      const adminId = (req as any).admin.id;

      const data: UpdateAnnouncementData = {
        title,
        content,
        priority: priority as announcement_priority,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        targetUserType,
      };

      const announcement = await this.announcementAdminService.updateAnnouncement(
        id,
        data,
        adminId,
      );

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: '公告不存在',
        });
        return;
      }

      res.json({
        success: true,
        message: '公告更新成功',
        data: { announcement },
      });
    } catch (error) {
      console.error('更新公告错误:', error);
      res.status(500).json({
        success: false,
        message: '更新公告失败',
      });
    }
  }

  /**
   * 发布公告
   */
  async publishAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { publishedAt } = req.body;
      const adminId = (req as any).admin.id;

      const publishTime = publishedAt ? new Date(publishedAt) : undefined;
      const announcement = await this.announcementAdminService.publishAnnouncement(
        id,
        adminId,
        publishTime,
      );

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: '公告不存在',
        });
        return;
      }

      res.json({
        success: true,
        message: '公告发布成功',
        data: {
          announcement,
          publishedAt: announcement.publishedAt,
        },
      });
    } catch (error) {
      console.error('发布公告错误:', error);
      res.status(500).json({
        success: false,
        message: '发布公告失败',
      });
    }
  }

  /**
   * 撤回公告
   */
  async unpublishAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).admin.id;

      const announcement = await this.announcementAdminService.unpublishAnnouncement(id, adminId);

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: '公告不存在',
        });
        return;
      }

      res.json({
        success: true,
        message: '公告撤回成功',
        data: { announcement },
      });
    } catch (error) {
      console.error('撤回公告错误:', error);
      res.status(500).json({
        success: false,
        message: '撤回公告失败',
      });
    }
  }

  /**
   * 归档公告
   */
  async archiveAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).admin.id;

      const announcement = await this.announcementAdminService.archiveAnnouncement(id, adminId);

      if (!announcement) {
        res.status(404).json({
          success: false,
          message: '公告不存在',
        });
        return;
      }

      res.json({
        success: true,
        message: '公告归档成功',
        data: { announcement },
      });
    } catch (error) {
      console.error('归档公告错误:', error);
      res.status(500).json({
        success: false,
        message: '归档公告失败',
      });
    }
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const success = await this.announcementAdminService.deleteAnnouncement(id);

      if (!success) {
        res.status(404).json({
          success: false,
          message: '公告不存在或删除失败',
        });
        return;
      }

      res.json({
        success: true,
        message: '公告删除成功',
      });
    } catch (error) {
      console.error('删除公告错误:', error);
      res.status(500).json({
        success: false,
        message: '删除公告失败',
      });
    }
  }

  /**
   * 获取公告统计数据
   */
  async getAnnouncementStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.announcementAdminService.getAnnouncementStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('获取公告统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取公告统计失败',
      });
    }
  }

  /**
   * 获取公告阅读统计
   */
  async getAnnouncementReadStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await this.announcementAdminService.getAnnouncementReadStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('获取公告阅读统计错误:', error);
      res.status(500).json({
        success: false,
        message: '获取公告阅读统计失败',
      });
    }
  }

  /**
   * 批量操作公告
   */
  async batchOperation(req: Request, res: Response): Promise<void> {
    try {
      const { ids, operation } = req.body;
      const adminId = (req as any).admin.id;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({
          success: false,
          message: '请选择要操作的公告',
        });
        return;
      }

      if (!['publish', 'unpublish', 'archive', 'delete'].includes(operation)) {
        res.status(400).json({
          success: false,
          message: '无效的操作类型',
        });
        return;
      }

      const results = await this.announcementAdminService.batchOperation(ids, operation, adminId);

      res.json({
        success: true,
        message: `批量操作完成：成功 ${results.success} 个，失败 ${results.failed} 个`,
        data: results,
      });
    } catch (error) {
      console.error('批量操作公告错误:', error);
      res.status(500).json({
        success: false,
        message: '批量操作失败',
      });
    }
  }
}
