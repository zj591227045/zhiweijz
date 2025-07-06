import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GetAnnouncementsParams {
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  search?: string;
}

interface CreateAnnouncementData {
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt?: Date;
  expiresAt?: Date;
  targetUserType: string;
  createdBy: string;
}

interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt?: Date;
  expiresAt?: Date;
  targetUserType?: string;
  updatedBy: string;
}

export const announcementService = {
  // 获取公告列表
  async getAnnouncements(params: GetAnnouncementsParams) {
    try {
      const { page, limit, status, priority, search } = params;
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
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      // 获取总数
      const total = await prisma.announcement.count({ where });

      // 获取公告列表
      const announcements = await prisma.announcement.findMany({
        where,
        include: {
          creator: {
            select: { username: true },
          },
          updater: {
            select: { username: true },
          },
          _count: {
            select: { readings: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      });

      // 转换数据格式
      const result = announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
        updater: announcement.updater?.username || null,
        readCount: announcement._count.readings,
      }));

      return {
        data: result,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取公告列表失败:', error);
      throw error;
    }
  },

  // 获取单个公告详情
  async getAnnouncementById(id: string) {
    try {
      const announcement = await prisma.announcement.findUnique({
        where: { id },
        include: {
          creator: {
            select: { username: true },
          },
          updater: {
            select: { username: true },
          },
          _count: {
            select: { readings: true },
          },
        },
      });

      if (!announcement) {
        return null;
      }

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
        updater: announcement.updater?.username || null,
        readCount: announcement._count.readings,
      };
    } catch (error) {
      console.error('获取公告详情失败:', error);
      throw error;
    }
  },

  // 创建公告
  async createAnnouncement(data: CreateAnnouncementData) {
    try {
      const announcement = await prisma.announcement.create({
        data: {
          title: data.title,
          content: data.content,
          priority: data.priority,
          publishedAt: data.publishedAt,
          expiresAt: data.expiresAt,
          targetUserType: data.targetUserType,
          createdBy: data.createdBy,
          status: data.publishedAt ? 'PUBLISHED' : 'DRAFT',
        },
        include: {
          creator: {
            select: { username: true },
          },
        },
      });

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
      };
    } catch (error) {
      console.error('创建公告失败:', error);
      throw error;
    }
  },

  // 更新公告
  async updateAnnouncement(id: string, data: UpdateAnnouncementData) {
    try {
      // 检查公告是否存在
      const existingAnnouncement = await prisma.announcement.findUnique({
        where: { id },
      });

      if (!existingAnnouncement) {
        throw new Error('公告不存在');
      }

      // 如果设置了发布时间，自动将状态设为已发布
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.publishedAt && existingAnnouncement.status === 'DRAFT') {
        updateData.status = 'PUBLISHED';
      }

      const announcement = await prisma.announcement.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: { username: true },
          },
          updater: {
            select: { username: true },
          },
        },
      });

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
        updater: announcement.updater?.username || null,
      };
    } catch (error) {
      console.error('更新公告失败:', error);
      throw error;
    }
  },

  // 删除公告
  async deleteAnnouncement(id: string) {
    try {
      // 检查公告是否存在
      const existingAnnouncement = await prisma.announcement.findUnique({
        where: { id },
      });

      if (!existingAnnouncement) {
        throw new Error('公告不存在');
      }

      // 删除公告（会级联删除相关的已读记录）
      await prisma.announcement.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error('删除公告失败:', error);
      throw error;
    }
  },

  // 发布公告
  async publishAnnouncement(id: string, data: { publishedAt: Date; updatedBy: string }) {
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: data.publishedAt,
          updatedBy: data.updatedBy,
          updatedAt: new Date(),
        },
        include: {
          creator: {
            select: { username: true },
          },
          updater: {
            select: { username: true },
          },
        },
      });

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
        updater: announcement.updater?.username || null,
      };
    } catch (error) {
      console.error('发布公告失败:', error);
      throw error;
    }
  },

  // 撤回公告
  async unpublishAnnouncement(id: string, updatedBy: string) {
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          updatedBy,
          updatedAt: new Date(),
        },
        include: {
          creator: {
            select: { username: true },
          },
          updater: {
            select: { username: true },
          },
        },
      });

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        status: announcement.status,
        publishedAt: announcement.publishedAt?.toISOString() || null,
        expiresAt: announcement.expiresAt?.toISOString() || null,
        targetUserType: announcement.targetUserType,
        createdAt: announcement.createdAt.toISOString(),
        updatedAt: announcement.updatedAt.toISOString(),
        creator: announcement.creator.username,
        updater: announcement.updater?.username || null,
      };
    } catch (error) {
      console.error('撤回公告失败:', error);
      throw error;
    }
  },

  // 获取公告统计信息
  async getAnnouncementStats() {
    try {
      const [
        totalCount,
        publishedCount,
        draftCount,
        archivedCount,
        todayCount,
        weekCount,
        totalReadCount,
      ] = await Promise.all([
        // 总公告数
        prisma.announcement.count(),
        // 已发布公告数
        prisma.announcement.count({
          where: { status: 'PUBLISHED' },
        }),
        // 草稿公告数
        prisma.announcement.count({
          where: { status: 'DRAFT' },
        }),
        // 已归档公告数
        prisma.announcement.count({
          where: { status: 'ARCHIVED' },
        }),
        // 今日创建公告数
        prisma.announcement.count({
          where: {
            createdAt: {
              gte: (() => {
                const now = new Date();
                const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
                beijingTime.setUTCHours(0, 0, 0, 0);
                return new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);
              })(),
            },
          },
        }),
        // 本周创建公告数
        prisma.announcement.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // 总阅读次数
        prisma.announcementRead.count(),
      ]);

      // 获取优先级分布
      const priorityStats = await prisma.announcement.groupBy({
        by: ['priority'],
        _count: {
          id: true,
        },
      });

      // 获取状态分布
      const statusStats = await prisma.announcement.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });

      return {
        overview: {
          total: totalCount,
          published: publishedCount,
          draft: draftCount,
          archived: archivedCount,
          todayCreated: todayCount,
          weekCreated: weekCount,
          totalReads: totalReadCount,
        },
        priorityDistribution: priorityStats.map((stat) => ({
          priority: stat.priority,
          count: stat._count.id,
        })),
        statusDistribution: statusStats.map((stat) => ({
          status: stat.status,
          count: stat._count.id,
        })),
      };
    } catch (error) {
      console.error('获取公告统计失败:', error);
      throw error;
    }
  },
};
