import { PrismaClient, Admin, AdminRole } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminService {
  /**
   * 根据用户名查找管理员
   */
  async findByUsername(username: string): Promise<Admin | null> {
    try {
      return await prisma.admin.findUnique({
        where: { username }
      });
    } catch (error) {
      console.error('查找管理员错误:', error);
      throw new Error('查找管理员失败');
    }
  }

  /**
   * 根据ID查找管理员
   */
  async findById(id: string): Promise<Admin | null> {
    try {
      return await prisma.admin.findUnique({
        where: { id }
      });
    } catch (error) {
      console.error('查找管理员错误:', error);
      throw new Error('查找管理员失败');
    }
  }

  /**
   * 根据邮箱查找管理员
   */
  async findByEmail(email: string): Promise<Admin | null> {
    try {
      return await prisma.admin.findUnique({
        where: { email }
      });
    } catch (error) {
      console.error('查找管理员错误:', error);
      throw new Error('查找管理员失败');
    }
  }

  /**
   * 创建管理员
   */
  async create(data: {
    username: string;
    passwordHash: string;
    email?: string;
    role?: AdminRole;
  }): Promise<Admin> {
    try {
      return await prisma.admin.create({
        data: {
          username: data.username,
          passwordHash: data.passwordHash,
          email: data.email,
          role: data.role || AdminRole.ADMIN
        }
      });
    } catch (error) {
      console.error('创建管理员错误:', error);
      throw new Error('创建管理员失败');
    }
  }

  /**
   * 更新最后登录时间
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id },
        data: {
          lastLoginAt: new Date()
        }
      });
    } catch (error) {
      console.error('更新最后登录时间错误:', error);
      throw new Error('更新最后登录时间失败');
    }
  }

  /**
   * 更新管理员密码
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await prisma.admin.update({
        where: { id },
        data: { passwordHash }
      });
    } catch (error) {
      console.error('更新管理员密码错误:', error);
      throw new Error('更新管理员密码失败');
    }
  }

  /**
   * 获取所有管理员
   */
  async findAll(): Promise<Admin[]> {
    try {
      return await prisma.admin.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('获取管理员列表错误:', error);
      throw new Error('获取管理员列表失败');
    }
  }

  /**
   * 删除管理员
   */
  async delete(id: string): Promise<void> {
    try {
      await prisma.admin.delete({
        where: { id }
      });
    } catch (error) {
      console.error('删除管理员错误:', error);
      throw new Error('删除管理员失败');
    }
  }
} 