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
      // 1. 删除用户的记账记录
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

      // 5. 处理用户拥有的账本（userId字段）
      const userOwnedBooks = await tx.accountBook.findMany({
        where: { userId },
      });

      for (const book of userOwnedBooks) {
        // 检查账本是否有其他成员
        const otherMembers = await tx.user_account_books.findMany({
          where: {
            account_book_id: book.id,
            user_id: { not: userId },
          },
        });

        if (otherMembers.length === 0) {
          // 如果账本只有拥有者一个成员，删除整个账本
          await tx.accountBook.delete({
            where: { id: book.id },
          });
        } else {
          // 如果有其他成员，转移拥有权给第一个有编辑权限的成员
          const otherAdmin = otherMembers.find((member) => member.can_edit);
          if (otherAdmin) {
            await tx.accountBook.update({
              where: { id: book.id },
              data: {
                userId: otherAdmin.user_id,
                createdBy: otherAdmin.user_id
              },
            });
          } else {
            // 如果没有有编辑权限的成员，转移给第一个成员并给予编辑权限
            const firstMember = otherMembers[0];
            await tx.user_account_books.update({
              where: {
                user_id_account_book_id: {
                  user_id: firstMember.user_id,
                  account_book_id: book.id,
                },
              },
              data: { can_edit: true },
            });
            await tx.accountBook.update({
              where: { id: book.id },
              data: {
                userId: firstMember.user_id,
                createdBy: firstMember.user_id
              },
            });
          }
        }
      }

      // 6. 处理用户创建但不拥有的账本（createdBy字段）
      const userCreatedBooks = await tx.accountBook.findMany({
        where: {
          createdBy: userId,
          userId: { not: userId } // 排除已经在上面处理过的账本
        },
      });

      for (const book of userCreatedBooks) {
        // 检查账本是否有其他成员
        const otherMembers = await tx.user_account_books.findMany({
          where: {
            account_book_id: book.id,
            user_id: { not: userId },
          },
        });

        if (otherMembers.length > 0) {
          // 转移创建者权限给第一个有编辑权限的成员
          const otherAdmin = otherMembers.find((member) => member.can_edit);
          if (otherAdmin) {
            await tx.accountBook.update({
              where: { id: book.id },
              data: { createdBy: otherAdmin.user_id },
            });
          } else {
            // 如果没有有编辑权限的成员，转移给第一个成员并给予编辑权限
            const firstMember = otherMembers[0];
            await tx.user_account_books.update({
              where: {
                user_id_account_book_id: {
                  user_id: firstMember.user_id,
                  account_book_id: book.id,
                },
              },
              data: { can_edit: true },
            });
            await tx.accountBook.update({
              where: { id: book.id },
              data: { createdBy: firstMember.user_id },
            });
          }
        }
      }

      // 7. 删除用户设置
      await tx.userSetting.deleteMany({
        where: { userId },
      });

      // 8. 删除用户反馈
      await tx.userFeedback.deleteMany({
        where: { userId },
      });

      // 9. 删除用户的会话
      await tx.session.deleteMany({
        where: { userId },
      });

      // 10. 删除用户的安全日志
      await tx.securityLog.deleteMany({
        where: { userId },
      });

      // 11. 删除用户的验证码
      await tx.verificationCode.deleteMany({
        where: { userId },
      });

      // 12. 删除用户的密码重置令牌
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      // 13. 删除微信绑定
      await tx.wechat_user_bindings.deleteMany({
        where: { user_id: userId },
      });

      // 14. 删除用户会员信息
      await tx.userMembership.deleteMany({
        where: { userId },
      });

      // 15. 删除用户徽章
      await tx.userBadge.deleteMany({
        where: { userId },
      });

      // 16. 删除用户积分记录
      await tx.userAccountingPoints.deleteMany({
        where: { userId },
      });

      // 17. 删除用户签到记录
      await tx.userCheckins.deleteMany({
        where: { userId },
      });

      // 18. 删除用户LLM设置
      await tx.userLLMSetting.deleteMany({
        where: { userId },
      });

      // 19. 删除用户分类配置
      await tx.userCategoryConfig.deleteMany({
        where: { userId },
      });

      // 20. 删除用户支付订单
      await tx.payment_orders.deleteMany({
        where: { user_id: userId },
      });

      // 21. 删除用户订阅
      await tx.subscriptions.deleteMany({
        where: { user_id: userId },
      });

      // 22. 删除用户支付历史
      await tx.payment_history.deleteMany({
        where: { user_id: userId },
      });

      // 23. 删除用户版本状态
      await tx.userVersionStatus.deleteMany({
        where: { userId },
      });

      // 24. 删除用户创建的应用版本
      await tx.appVersion.deleteMany({
        where: { createdBy: userId },
      });

      // 25. 删除用户版本检查日志
      await tx.versionCheckLog.deleteMany({
        where: { userId },
      });

      // 26. 删除用户文件存储
      await tx.fileStorage.deleteMany({
        where: { uploadedBy: userId },
      });

      // 27. 删除用户LLM调用日志
      await tx.llmCallLog.deleteMany({
        where: { userId },
      });

      // 28. 删除用户多模态AI调用日志
      await tx.multimodalAiCallLog.deleteMany({
        where: { userId },
      });

      // 29. 删除用户标签
      await tx.tag.deleteMany({
        where: { createdBy: userId },
      });

      // 30. 删除用户每日礼品记录
      await tx.dailyGiftRecords.deleteMany({
        where: { userId },
      });

      // 31. 处理用户创建的家庭
      const userFamilies = await tx.family.findMany({
        where: { createdBy: userId },
      });

      for (const family of userFamilies) {
        // 检查家庭是否有其他成员
        const otherMembers = await tx.familyMember.findMany({
          where: {
            familyId: family.id,
            userId: { not: userId },
          },
        });

        if (otherMembers.length === 0) {
          // 如果家庭只有创建者一个成员，删除整个家庭
          await tx.family.delete({
            where: { id: family.id },
          });
        } else {
          // 如果有其他成员，转移创建权给第一个成员
          const firstMember = otherMembers[0];
          await tx.family.update({
            where: { id: family.id },
            data: { createdBy: firstMember.userId || firstMember.id },
          });
        }
      }

      // 32. 删除用户的家庭成员记录
      await tx.familyMember.deleteMany({
        where: { userId },
      });

      // 33. 最后删除用户账户
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
