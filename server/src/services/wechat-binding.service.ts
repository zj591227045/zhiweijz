import { logger } from '../utils/logger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import config from '../config/config';

export interface BindingResult {
  success: boolean;
  message: string;
  data?: any;
}

export class WechatBindingService {
  /**
   * 验证用户账号密码并创建绑定
   */
  async bindUserAccount(openid: string, email: string, password: string): Promise<BindingResult> {
    try {
      // 1. 验证用户账号密码
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在，请检查邮箱地址',
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          message: '账号已被禁用，请联系管理员',
        };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: '密码错误，请重新输入',
        };
      }

      // 2. 检查是否已经绑定
      const existingBinding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (existingBinding) {
        // 更新绑定信息
        await prisma.wechat_user_bindings.update({
          where: { openid },
          data: {
            user_id: user.id,
            is_active: true,
          },
        });
      } else {
        // 创建新绑定
        await prisma.wechat_user_bindings.create({
          data: {
            id: crypto.randomUUID(),
            openid,
            user_id: user.id,
            is_active: true,
            updated_at: new Date(),
          },
        });
      }

      // 3. 获取用户的账本列表
      const accountBooks = await this.getUserAccountBooks(user.id);

      return {
        success: true,
        message: '绑定成功！',
        data: {
          userId: user.id,
          userName: user.name,
          accountBooks,
        },
      };
    } catch (error) {
      logger.error('绑定用户账号失败:', error);
      return {
        success: false,
        message: '绑定失败，请稍后重试',
      };
    }
  }

  /**
   * 设置默认账本
   */
  async setDefaultAccountBook(openid: string, accountBookId: string): Promise<BindingResult> {
    try {
      const binding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (!binding) {
        return {
          success: false,
          message: '请先绑定账号',
        };
      }

      // 验证账本是否属于该用户
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId: binding.user_id },
            {
              type: 'FAMILY',
              familyId: {
                not: null,
              },
              family: {
                members: {
                  some: {
                    userId: binding.user_id,
                  },
                },
              },
            },
          ],
        },
        include: {
          family: true,
        },
      });

      if (!accountBook) {
        return {
          success: false,
          message: '账本不存在或无权访问',
        };
      }

      // 更新默认账本
      await prisma.wechat_user_bindings.update({
        where: { openid },
        data: {
          default_account_book_id: accountBookId,
        },
      });

      return {
        success: true,
        message: `已设置"${accountBook.name}"为默认账本`,
        data: {
          accountBookId,
          accountBookName: accountBook.name,
        },
      };
    } catch (error) {
      logger.error('设置默认账本失败:', error);
      return {
        success: false,
        message: '设置失败，请稍后重试',
      };
    }
  }

  /**
   * 获取用户账本列表
   */
  async getUserAccountBooks(userId: string) {
    try {
      const accountBooks = await prisma.accountBook.findMany({
        where: {
          OR: [
            { userId: userId },
            {
              type: 'FAMILY',
              family: {
                members: {
                  some: { userId: userId },
                },
              },
            },
          ],
        },
        include: {
          family: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });

      return accountBooks.map((book: any) => ({
        id: book.id,
        name: book.name,
        type: book.type,
        isDefault: book.isDefault,
        familyName: book.family?.name,
      }));
    } catch (error) {
      logger.error('获取账本列表失败:', error);
      return [];
    }
  }

  /**
   * 获取绑定信息
   */
  async getBindingInfo(openid: string) {
    try {
      const binding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (!binding) {
        return null;
      }

      // 手动获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: binding.user_id },
      });

      // 手动获取账本信息（如果有默认账本）
      let accountBook = null;
      if (binding.default_account_book_id) {
        accountBook = await prisma.accountBook.findUnique({
          where: { id: binding.default_account_book_id },
        });
      }

      return {
        openid: binding.openid,
        userId: binding.user_id,
        userName: user?.name || '',
        userEmail: user?.email || '',
        defaultAccountBookId: binding.default_account_book_id,
        defaultAccountBookName: accountBook?.name,
        isActive: binding.is_active,
        createdAt: binding.created_at,
      };
    } catch (error) {
      logger.error('获取绑定信息失败:', error);
      return null;
    }
  }

  /**
   * 解除绑定
   */
  async unbindAccount(openid: string): Promise<BindingResult> {
    try {
      const binding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (!binding) {
        return {
          success: false,
          message: '未找到绑定信息',
        };
      }

      // 软删除：设置为非活跃状态
      await prisma.wechat_user_bindings.update({
        where: { openid },
        data: {
          is_active: false,
        },
      });

      return {
        success: true,
        message: '已成功解除绑定',
      };
    } catch (error) {
      logger.error('解除绑定失败:', error);
      return {
        success: false,
        message: '解除绑定失败，请稍后重试',
      };
    }
  }

  /**
   * 生成绑定令牌（用于网页绑定）
   */
  generateBindingToken(openid: string): string {
    return jwt.sign(
      { openid, type: 'wechat_binding' },
      config.jwt.secret,
      { expiresIn: '10m' }, // 10分钟有效期
    );
  }

  /**
   * 验证绑定令牌
   */
  verifyBindingToken(token: string): { openid: string } | null {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      if (decoded.type === 'wechat_binding' && decoded.openid) {
        return { openid: decoded.openid };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}
