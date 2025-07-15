import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const announcementService = {
  // 获取用户公告列表
  async getUserAnnouncements(userId: string) {
    try {
      // 获取用户注册时间
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取用户注册后发布的公告
      const announcements = await prisma.announcement.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: {
            gte: user.createdAt, // 只显示用户注册后发布的公告
            lte: new Date(), // 不显示未来发布的公告
          },
          OR: [
            { expiresAt: null }, // 永不过期
            { expiresAt: { gt: new Date() } }, // 未过期
          ],
        },
        orderBy: [
          { priority: 'desc' }, // 优先级高的在前
          { publishedAt: 'desc' }, // 发布时间新的在前
        ],
      });

      // 获取用户已读的公告ID列表
      const readAnnouncements = await prisma.announcementRead.findMany({
        where: {
          userId,
          announcementId: { in: announcements.map((a) => a.id) },
        },
        select: { announcementId: true },
      });
      const readIds = new Set(readAnnouncements.map((r) => r.announcementId));

      // 转换数据格式，添加已读状态
      const result = announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        publishedAt: announcement.publishedAt?.toISOString() || '',
        expiresAt: announcement.expiresAt?.toISOString() || null,
        isRead: readIds.has(announcement.id),
      }));

      return result;
    } catch (error) {
      console.error('获取用户公告失败:', error);
      throw error;
    }
  },

  // 获取单个公告详情
  async getAnnouncementById(userId: string, announcementId: string) {
    try {
      // 获取用户注册时间
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取公告详情，确保用户有权限查看
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          status: 'PUBLISHED',
          publishedAt: {
            gte: user.createdAt, // 只显示用户注册后发布的公告
            lte: new Date(), // 不显示未来发布的公告
          },
          OR: [
            { expiresAt: null }, // 永不过期
            { expiresAt: { gt: new Date() } }, // 未过期
          ],
        },
      });

      if (!announcement) {
        return null;
      }

      // 检查用户是否已读
      let readRecord = await prisma.announcementRead.findUnique({
        where: {
          announcementId_userId: {
            announcementId,
            userId,
          },
        },
      });

      // 如果用户未读，自动标记为已读（查看即已读）
      if (!readRecord) {
        try {
          readRecord = await prisma.announcementRead.create({
            data: {
              announcementId,
              userId,
            },
          });
        } catch (error) {
          // 如果创建失败（可能是并发问题），忽略错误，不影响主要功能
          console.warn('自动标记已读失败:', error);
        }
      }

      return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        publishedAt: announcement.publishedAt?.toISOString() || '',
        expiresAt: announcement.expiresAt?.toISOString() || null,
        isRead: true, // 查看详情后即为已读
      };
    } catch (error) {
      console.error('获取公告详情失败:', error);
      throw error;
    }
  },

  // 标记公告为已读
  async markAsRead(userId: string, announcementId: string) {
    try {
      // 检查公告是否存在且已发布
      const announcement = await prisma.announcement.findFirst({
        where: {
          id: announcementId,
          status: 'PUBLISHED',
        },
      });

      if (!announcement) {
        throw new Error('公告不存在或未发布');
      }

      // 检查是否已经标记为已读
      const existingRead = await prisma.announcementRead.findFirst({
        where: {
          announcementId,
          userId,
        },
      });

      if (existingRead) {
        // 已经标记为已读，直接返回成功
        return true;
      }

      // 创建已读记录
      await prisma.announcementRead.create({
        data: {
          userId,
          announcementId,
          readAt: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error('标记已读失败:', error);
      throw error;
    }
  },

  // 标记所有公告为已读
  async markAllAsRead(userId: string) {
    try {
      // 获取用户注册时间
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取用户可见的所有公告
      const allAnnouncements = await prisma.announcement.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: {
            gte: user.createdAt,
            lte: new Date(),
          },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { id: true },
      });

      // 获取已读的公告ID
      const readAnnouncements = await prisma.announcementRead.findMany({
        where: {
          userId,
          announcementId: { in: allAnnouncements.map((a) => a.id) },
        },
        select: { announcementId: true },
      });
      const readIds = new Set(readAnnouncements.map((r) => r.announcementId));

      // 筛选出未读的公告
      const unreadAnnouncements = allAnnouncements.filter((a) => !readIds.has(a.id));

      if (unreadAnnouncements.length === 0) {
        return 0;
      }

      // 批量创建已读记录
      const readRecords = unreadAnnouncements.map((announcement) => ({
        userId,
        announcementId: announcement.id,
        readAt: new Date(),
      }));

      await prisma.announcementRead.createMany({
        data: readRecords,
        skipDuplicates: true,
      });

      return unreadAnnouncements.length;
    } catch (error) {
      console.error('标记全部已读失败:', error);
      throw error;
    }
  },
};
