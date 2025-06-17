import { User } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDto, UpdateUserDto, UserResponseDto, toUserResponseDto } from '../models/user.model';
import { hashPassword, comparePasswords } from '../utils/password';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * 创建新用户
   */
  async createUser(userData: CreateUserDto): Promise<UserResponseDto> {
    // 检查邮箱是否已存在
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('邮箱已被注册');
    }

    // 哈希密码
    const passwordHash = await hashPassword(userData.password);

    // 创建用户
    const newUser = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    return toUserResponseDto(newUser);
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }
    return toUserResponseDto(user);
  }

  /**
   * 根据ID获取用户（包含密码哈希）
   */
  async getUserByIdWithPassword(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new Error('用户不存在');
    }
    return user;
  }

  /**
   * 更新用户信息
   */
  async updateUser(id: string, userData: UpdateUserDto): Promise<UserResponseDto> {
    // 检查用户是否存在
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    // 如果更新邮箱，检查邮箱是否已被其他用户使用
    if (userData.email && userData.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(userData.email);
      if (userWithEmail && userWithEmail.id !== id) {
        throw new Error('邮箱已被其他用户使用');
      }
    }

    // 如果更新密码，哈希新密码
    let passwordHash: string | undefined;
    if (userData.password) {
      passwordHash = await hashPassword(userData.password);
    }

    // 更新用户
    const updatedUser = await this.userRepository.update(id, {
      ...userData,
      passwordHash,
    });

    return toUserResponseDto(updatedUser);
  }

  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<void> {
    // 检查用户是否存在
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    await this.userRepository.delete(id);
  }

  /**
   * 获取所有用户
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map(toUserResponseDto);
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return toUserResponseDto(user);
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<User> {
    // 查找用户
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('邮箱或密码不正确');
    }

    // 验证密码
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('邮箱或密码不正确');
    }

    return user;
  }

  /**
   * 获取用户注册序号（该用户是第几个注册的用户）
   */
  async getUserRegistrationOrder(userId: string): Promise<number> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 计算在该用户注册时间之前注册的用户数量
    const earlierUsersCount = await this.userRepository.countUsersBeforeDate(user.createdAt);

    // 用户序号 = 之前注册的用户数量 + 1
    return earlierUsersCount + 1;
  }

  /**
   * 发起注销请求
   */
  async requestDeletion(userId: string): Promise<{ deletionScheduledAt: Date }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 检查是否已经有注销请求
    if (user.deletionRequestedAt) {
      throw new Error('已存在注销请求');
    }

    const now = new Date();
    const deletionScheduledAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24小时后

    await this.userRepository.update(userId, {
      deletionRequestedAt: now,
      deletionScheduledAt: deletionScheduledAt
    });

    return { deletionScheduledAt };
  }

  /**
   * 取消注销请求
   */
  async cancelDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (!user.deletionRequestedAt) {
      throw new Error('没有待取消的注销请求');
    }

    await this.userRepository.update(userId, {
      deletionRequestedAt: null,
      deletionScheduledAt: null
    });
  }

  /**
   * 查询注销状态
   */
  async getDeletionStatus(userId: string): Promise<{
    isDeletionRequested: boolean;
    deletionRequestedAt?: Date;
    deletionScheduledAt?: Date;
    remainingHours?: number;
  }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    if (!user.deletionRequestedAt || !user.deletionScheduledAt) {
      return { isDeletionRequested: false };
    }

    const now = new Date();
    const remainingMs = user.deletionScheduledAt.getTime() - now.getTime();
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));

    return {
      isDeletionRequested: true,
      deletionRequestedAt: user.deletionRequestedAt,
      deletionScheduledAt: user.deletionScheduledAt,
      remainingHours
    };
  }

  /**
   * 检查用户是否是某些账本的唯一管理员
   */
  async checkIfOnlyAccountBookAdmin(userId: string): Promise<boolean> {
    return await this.userRepository.checkIfOnlyAccountBookAdmin(userId);
  }

  /**
   * 执行用户数据删除（由定时任务调用）
   */
  async executeUserDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return; // 用户已不存在
    }

    // 检查是否到了删除时间
    if (!user.deletionScheduledAt || new Date() < user.deletionScheduledAt) {
      return; // 还未到删除时间
    }

    // 执行数据清理
    await this.userRepository.deleteUserData(userId);
  }
}
