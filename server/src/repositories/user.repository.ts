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
  async update(id: string, userData: UpdateUserDto & { passwordHash?: string }): Promise<User> {
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
}
