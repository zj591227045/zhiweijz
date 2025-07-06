import { User } from '@prisma/client';
import prisma from '../config/database';
import { CreateUserDto, UpdateUserDto } from '../models/user.model';

export class UserRepository {
  /**
   * 根据ID查找用户
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 创建新用户
   */
  async create(userData: CreateUserDto & { passwordHash: string }): Promise<User> {
    const { password, ...userDataWithoutPassword } = userData;
    return prisma.user.create({
      data: userDataWithoutPassword,
    });
  }

  /**
   * 更新用户信息
   */
  async update(
    id: string,
    userData: UpdateUserDto & {
      passwordHash?: string;
      deletionRequestedAt?: Date | null;
      deletionScheduledAt?: Date | null;
    },
  ): Promise<User> {
    const { password, ...updateData } = userData;
    return prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * 删除用户
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * 获取所有用户
   */
  async findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }

  /**
   * 计算在指定日期之前注册的用户数量（排除托管用户）
   */
  async countUsersBeforeDate(date: Date): Promise<number> {
    return prisma.user.count({
      where: {
        createdAt: {
          lt: date,
        },
        isCustodial: {
          not: true, // 排除托管用户
        },
      },
    });
  }

  /**
   * 检查用户是否是某些账本的唯一管理员
   */
  async checkIfOnlyAccountBookAdmin(userId: string): Promise<boolean> {
    // 查找用户创建的账本
    const adminAccountBooks = await prisma.accountBook.findMany({
      where: {
        createdBy: userId,
      },
    });

    // 检查用户账本权限表中是否有其他管理员
    for (const book of adminAccountBooks) {
      const adminCount = await prisma.user_account_books.count({
        where: {
          account_book_id: book.id,
          can_edit: true, // 假设can_edit为true表示管理员权限
        },
      });

      // 如果只有一个管理员（创建者），则返回true
      if (adminCount <= 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * 删除用户的所有数据
   */
  async deleteUserData(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. 删除用户的交易记录
      await tx.transaction.deleteMany({
        where: { userId },
      });

      // 2. 删除用户的预算
      await tx.budget.deleteMany({
        where: { userId },
      });

      // 3. 删除用户的分类
      await tx.category.deleteMany({
        where: { userId },
      });

      // 4. 从账本成员中移除用户
      await tx.user_account_books.deleteMany({
        where: { user_id: userId },
      });

      // 5. 删除用户创建的账本（如果没有其他成员）
      const userAccountBooks = await tx.accountBook.findMany({
        where: { createdBy: userId },
      });

      for (const book of userAccountBooks) {
        // 检查账本是否有其他成员
        const otherMembers = await tx.user_account_books.findMany({
          where: {
            account_book_id: book.id,
            user_id: { not: userId },
          },
        });

        if (otherMembers.length === 0) {
          // 如果账本只有创建者一个成员，删除整个账本
          await tx.accountBook.delete({
            where: { id: book.id },
          });
        } else {
          // 如果有其他成员，转移管理权给第一个其他成员
          const otherAdmin = otherMembers.find((member) => member.can_edit);
          if (otherAdmin) {
            await tx.accountBook.update({
              where: { id: book.id },
              data: { createdBy: otherAdmin.user_id },
            });
          }
        }
      }

      // 6. 删除用户设置
      await tx.userSetting.deleteMany({
        where: { userId },
      });

      // 7. 删除用户反馈
      await tx.userFeedback.deleteMany({
        where: { userId },
      });

      // 8. 删除用户的会话
      await tx.session.deleteMany({
        where: { userId },
      });

      // 9. 删除用户的安全日志
      await tx.securityLog.deleteMany({
        where: { userId },
      });

      // 10. 删除用户的验证码
      await tx.verificationCode.deleteMany({
        where: { userId },
      });

      // 11. 删除用户的密码重置令牌
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      // 12. 删除微信绑定
      await tx.wechat_user_bindings.deleteMany({
        where: { user_id: userId },
      });

      // 13. 最后删除用户账户
      await tx.user.delete({
        where: { id: userId },
      });
    });
  }

  /**
   * 获取需要删除的用户列表（已过期的注销请求）
   */
  async getUsersToDelete(): Promise<User[]> {
    const now = new Date();
    return prisma.user.findMany({
      where: {
        deletionScheduledAt: {
          lte: now,
        },
        deletionRequestedAt: {
          not: null,
        },
      },
    });
  }
}
