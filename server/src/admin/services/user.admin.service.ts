import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export interface UserListParams {
  page: number;
  limit: number;
  search?: string;
  status?: 'active' | 'inactive';
  sort: string;
  order: 'asc' | 'desc';
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  bio?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  bio?: string;
  dailyLlmTokenLimit?: number | null;
}

export class UserAdminService {
  /**
   * 获取用户列表
   */
  async getUsers(params: UserListParams) {
    try {
      const { page, limit, search, status, sort, order } = params;
      const skip = (page - 1) * limit;

      // 构建查询条件
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }

      // 构建排序条件
      const orderBy: any = {};
      if (sort === 'name') {
        orderBy.name = order;
      } else if (sort === 'email') {
        orderBy.email = order;
      } else {
        orderBy.createdAt = order;
      }

      // 并行查询用户列表和总数
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          select: {
            id: true,
            name: true,
            email: true,
            bio: true,
            avatar: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            dailyLlmTokenLimit: true,
            _count: {
              select: {
                transactions: true,
                accountBooks: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      // 格式化用户数据
      const formattedUsers = users.map(user => ({
        ...user,
        transactionCount: user._count.transactions,
        accountBookCount: user._count.accountBooks,
        _count: undefined
      }));

      return {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('获取用户列表错误:', error);
      throw new Error('获取用户列表失败');
    }
  }

  /**
   * 根据ID获取用户详情
   */
  async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          dailyLlmTokenLimit: true,
          _count: {
            select: {
              transactions: true,
              accountBooks: true,
              familyMembers: true
            }
          },
          transactions: {
            select: {
              amount: true
            }
          }
        }
      });

      if (!user) {
        return null;
      }

      // 计算总金额
      const totalAmount = user.transactions.reduce((sum, transaction) => {
        return sum + parseFloat(transaction.amount.toString());
      }, 0);

      return {
        ...user,
        stats: {
          transactionCount: user._count.transactions,
          accountBookCount: user._count.accountBooks,
          familyMemberCount: user._count.familyMembers,
          totalAmount
        },
        _count: undefined,
        transactions: undefined
      };
    } catch (error) {
      console.error('获取用户详情错误:', error);
      throw new Error('获取用户详情失败');
    }
  }

  /**
   * 创建用户
   */
  async createUser(data: CreateUserData) {
    try {
      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('邮箱已存在');
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: hashedPassword,
          bio: data.bio,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return user;
    } catch (error) {
      console.error('创建用户错误:', error);
      if (error instanceof Error && error.message.includes('已存在')) {
        throw error;
      }
      throw new Error('创建用户失败');
    }
  }

  /**
   * 更新用户
   */
  async updateUser(id: string, data: UpdateUserData) {
    try {
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error('用户不存在');
      }

      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (data.email) {
        const emailUser = await prisma.user.findUnique({
          where: { email: data.email }
        });

        if (emailUser && emailUser.id !== id) {
          throw new Error('邮箱已被其他用户使用');
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          ...(data.bio && { bio: data.bio }),
          ...(data.dailyLlmTokenLimit !== undefined && { dailyLlmTokenLimit: data.dailyLlmTokenLimit }),
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          dailyLlmTokenLimit: true
        }
      });

      return user;
    } catch (error) {
      console.error('更新用户错误:', error);
      if (error instanceof Error && (error.message.includes('不存在') || error.message.includes('已被使用'))) {
        throw error;
      }
      throw new Error('更新用户失败');
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(id: string) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error('用户不存在');
      }

      // 软删除：设置isActive为false，并添加删除时间标记
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('删除用户错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      throw new Error('删除用户失败');
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(id: string, newPassword: string) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error('用户不存在');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: hashedPassword,
          updatedAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('重置密码错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      throw new Error('重置密码失败');
    }
  }

  /**
   * 切换用户状态
   */
  async toggleUserStatus(id: string) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new Error('用户不存在');
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          isActive: !existingUser.isActive,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          updatedAt: true
        }
      });

      return user;
    } catch (error) {
      console.error('切换用户状态错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        throw error;
      }
      throw new Error('切换用户状态失败');
    }
  }

  /**
   * 批量操作用户
   */
  async batchOperation(userIds: string[], operation: 'activate' | 'deactivate' | 'delete') {
    try {
      let updateData: any = { updatedAt: new Date() };

      switch (operation) {
        case 'activate':
          updateData.isActive = true;
          break;
        case 'deactivate':
        case 'delete':
          updateData.isActive = false;
          break;
      }

      const result = await prisma.user.updateMany({
        where: {
          id: { in: userIds }
        },
        data: updateData
      });

      return {
        count: result.count,
        operation
      };
    } catch (error) {
      console.error('批量操作错误:', error);
      throw new Error('批量操作失败');
    }
  }

  /**
   * 获取注册开关状态
   */
  async getRegistrationStatus(): Promise<boolean> {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'REGISTRATION_ENABLED' }
      });

      // 默认开启注册
      if (!config) {
        await prisma.systemConfig.create({
          data: {
            key: 'REGISTRATION_ENABLED',
            value: 'true',
            description: '用户注册开关',

          }
        });
        return true;
      }

      return config.value === 'true';
    } catch (error) {
      console.error('获取注册开关状态错误:', error);
      throw new Error('获取注册开关状态失败');
    }
  }

  /**
   * 切换注册开关
   */
  async toggleRegistration(enabled: boolean) {
    try {
      await prisma.systemConfig.upsert({
        where: { key: 'REGISTRATION_ENABLED' },
        update: {
          value: enabled.toString(),
          updatedAt: new Date()
        },
        create: {
          key: 'REGISTRATION_ENABLED',
          value: enabled.toString(),
          description: '用户注册开关',

        }
      });

      return true;
    } catch (error) {
      console.error('切换注册开关错误:', error);
      throw new Error('切换注册开关失败');
    }
  }
} 