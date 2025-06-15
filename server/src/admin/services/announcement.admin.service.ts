import { PrismaClient, Announcement, announcement_status, announcement_priority } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateAnnouncementData {
  title: string;
  content: string;
  priority?: announcement_priority;
  publishedAt?: Date;
  expiresAt?: Date;
  targetUserType?: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  priority?: announcement_priority;
  publishedAt?: Date;
  expiresAt?: Date;
  targetUserType?: string;
}

export interface AnnouncementListQuery {
  page?: number;
  limit?: number;
  status?: announcement_status;
  priority?: announcement_priority;
  search?: string;
}

export interface AnnouncementWithStats extends Announcement {
  readCount: number;
  totalUsers: number;
  readRate: number;
}

export class AnnouncementAdminService {
  /**
   * 获取公告列表
   */
  async getAnnouncements(query: AnnouncementListQuery = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search
    } = query;

    const skip = (page - 1) * limit;
    
    // 构建查询条件
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 获取公告列表
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
        // 移除include以避免TypeScript错误，因为schema中没有定义creator/updater关系
      }),
      prisma.announcement.count({ where })
    ]);

    // 获取总用户数
    const totalUsers = await prisma.user.count();

    // 为每个公告计算统计数据
    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const readCount = await prisma.announcementRead.count({
          where: { announcementId: announcement.id }
        });

        return {
          ...announcement,
          readCount,
          totalUsers,
          readRate: totalUsers > 0 ? (readCount / totalUsers) * 100 : 0
        };
      })
    );

    return {
      announcements: announcementsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 根据ID获取公告详情
   */
  async getAnnouncementById(id: string): Promise<AnnouncementWithStats | null> {
    const announcement = await prisma.announcement.findUnique({
      where: { id }
      // 移除include以避免TypeScript错误，因为schema中没有定义creator/updater关系
    });

    if (!announcement) {
      return null;
    }

    // 获取统计数据
    const [readCount, totalUsers] = await Promise.all([
      prisma.announcementRead.count({
        where: { announcementId: id }
      }),
      prisma.user.count()
    ]);

    return {
      ...announcement,
      readCount,
      totalUsers,
      readRate: totalUsers > 0 ? (readCount / totalUsers) * 100 : 0
    };
  }

  /**
   * 创建公告
   */
  async createAnnouncement(data: CreateAnnouncementData, createdBy: string): Promise<Announcement> {
    // 如果设置了发布时间，自动设置状态为已发布
    const status = data.publishedAt ? announcement_status.PUBLISHED : announcement_status.DRAFT;
    
    return await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        priority: data.priority || announcement_priority.NORMAL,
        publishedAt: data.publishedAt,
        expiresAt: data.expiresAt,
        targetUserType: data.targetUserType || 'all',
        status,
        createdBy,
        updatedBy: createdBy
      }
    });
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(id: string, data: UpdateAnnouncementData, updatedBy: string): Promise<Announcement | null> {
    try {
      // 获取当前公告状态
      const currentAnnouncement = await prisma.announcement.findUnique({
        where: { id },
        select: { status: true }
      });

      if (!currentAnnouncement) {
        return null;
      }

      // 如果设置了发布时间且当前是草稿状态，自动设置为已发布
      const updateData: any = { ...data, updatedBy };
      if (data.publishedAt && currentAnnouncement.status === announcement_status.DRAFT) {
        updateData.status = announcement_status.PUBLISHED;
      }

      return await prisma.announcement.update({
        where: { id },
        data: updateData
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * 发布公告
   */
  async publishAnnouncement(id: string, updatedBy: string, publishedAt?: Date): Promise<Announcement | null> {
    try {
      return await prisma.announcement.update({
        where: { id },
        data: {
          status: announcement_status.PUBLISHED,
          publishedAt: publishedAt || new Date(),
          updatedBy
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * 撤回公告
   */
  async unpublishAnnouncement(id: string, updatedBy: string): Promise<Announcement | null> {
    try {
      return await prisma.announcement.update({
        where: { id },
        data: {
          status: announcement_status.DRAFT,
          publishedAt: null,
          updatedBy
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * 归档公告
   */
  async archiveAnnouncement(id: string, updatedBy: string): Promise<Announcement | null> {
    try {
      return await prisma.announcement.update({
        where: { id },
        data: {
          status: announcement_status.ARCHIVED,
          updatedBy
        }
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      await prisma.announcement.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取公告统计数据
   */
  async getAnnouncementStats() {
    const [
      totalCount,
      publishedCount,
      draftCount,
      archivedCount,
      totalReadCount
    ] = await Promise.all([
      prisma.announcement.count(),
      prisma.announcement.count({ where: { status: announcement_status.PUBLISHED } }),
      prisma.announcement.count({ where: { status: announcement_status.DRAFT } }),
      prisma.announcement.count({ where: { status: announcement_status.ARCHIVED } }),
      prisma.announcementRead.count()
    ]);

    return {
      totalCount,
      publishedCount,
      draftCount,
      archivedCount,
      totalReadCount
    };
  }

  /**
   * 获取公告阅读统计
   */
  async getAnnouncementReadStats(id: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id }
    });

    if (!announcement) {
      throw new Error('公告不存在');
    }

    const [readCount, totalUsers] = await Promise.all([
      prisma.announcementRead.count({
        where: { announcementId: id }
      }),
      prisma.user.count()
    ]);

    // 获取按日期分组的阅读统计
    const dailyReads = await prisma.announcementRead.groupBy({
      by: ['readAt'],
      where: { announcementId: id },
      _count: { id: true },
      orderBy: { readAt: 'asc' }
    });

    return {
      readCount,
      totalUsers,
      readRate: totalUsers > 0 ? (readCount / totalUsers) * 100 : 0,
      dailyReads: dailyReads.map(item => ({
        date: item.readAt.toISOString().split('T')[0],
        count: item._count.id
      }))
    };
  }

  /**
   * 批量操作公告
   */
  async batchOperation(ids: string[], operation: 'publish' | 'unpublish' | 'archive' | 'delete', operatorId: string) {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const id of ids) {
      try {
        switch (operation) {
          case 'publish':
            await this.publishAnnouncement(id, operatorId);
            break;
          case 'unpublish':
            await this.unpublishAnnouncement(id, operatorId);
            break;
          case 'archive':
            await this.archiveAnnouncement(id, operatorId);
            break;
          case 'delete':
            await this.deleteAnnouncement(id);
            break;
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`公告 ${id} 操作失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    return results;
  }
} 