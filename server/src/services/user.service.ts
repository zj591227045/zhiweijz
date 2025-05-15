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
}
