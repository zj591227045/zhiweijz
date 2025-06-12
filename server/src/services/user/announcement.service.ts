import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const announcementService = {
  // 获取用户公告列表
  async getUserAnnouncements(userId: string) {
    try {
      // 获取用户注册时间
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true }
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
            lte: new Date() // 不显示未来发布的公告
          },
          OR: [
            { expiresAt: null }, // 永不过期
            { expiresAt: { gt: new Date() } } // 未过期
          ]
        },
        include: {
          readings: {
            where: { userId },
            select: { id: true }
          }
        },
        orderBy: [
          { priority: 'desc' }, // 优先级高的在前
          { publishedAt: 'desc' } // 发布时间新的在前
        ]
      });

      // 转换数据格式，添加已读状态
      const result = announcements.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        publishedAt: announcement.publishedAt?.toISOString() || '',
        expiresAt: announcement.expiresAt?.toISOString() || null,
        isRead: announcement.readings.length > 0
      }));

      return result;
    } catch (error) {
      console.error('获取用户公告失败:', error);
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
          status: 'PUBLISHED'
        }
      });

      if (!announcement) {
        throw new Error('公告不存在或未发布');
      }

      // 检查是否已经标记为已读
      const existingRead = await prisma.announcementRead.findFirst({
        where: {
          announcementId,
          userId
        }
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
          readAt: new Date()
        }
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
        select: { createdAt: true }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 获取用户可见的所有未读公告
      const unreadAnnouncements = await prisma.announcement.findMany({
        where: {
          status: 'PUBLISHED',
          publishedAt: {
            gte: user.createdAt,
            lte: new Date()
          },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          readings: {
            none: { userId }
          }
        },
        select: { id: true }
      });

      if (unreadAnnouncements.length === 0) {
        return 0;
      }

      // 批量创建已读记录
      const readRecords = unreadAnnouncements.map(announcement => ({
        userId,
        announcementId: announcement.id,
        readAt: new Date()
      }));

      await prisma.announcementRead.createMany({
        data: readRecords,
        skipDuplicates: true
      });

      return unreadAnnouncements.length;
    } catch (error) {
      console.error('标记全部已读失败:', error);
      throw error;
    }
  }
}; 