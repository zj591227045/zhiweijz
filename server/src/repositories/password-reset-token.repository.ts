import { PrismaClient, PasswordResetToken } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

export class PasswordResetTokenRepository {
  /**
   * 创建密码重置令牌
   */
  async create(userId: string, expiresAt: Date): Promise<PasswordResetToken> {
    // 生成随机令牌
    const token = randomBytes(32).toString('hex');

    return prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  }

  /**
   * 根据令牌查找
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * 标记令牌为已使用
   */
  async markAsUsed(id: string): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { isUsed: true },
    });
  }

  /**
   * 删除过期的令牌
   */
  async deleteExpired(): Promise<number> {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { isUsed: true }],
      },
    });

    return result.count;
  }
}
