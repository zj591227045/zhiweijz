import { UserService } from './user.service';
import { CreateUserDto } from '../models/user.model';
import { LoginResponseDto } from '../models/auth.model';
import { generateToken } from '../utils/jwt';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { emailService } from '../utils/email';
import { config } from '../config';
import { AccountBookService } from './account-book.service';
import { CategoryService } from './category.service';

export class AuthService {
  private userService: UserService;
  private passwordResetTokenRepository: PasswordResetTokenRepository;
  private accountBookService: AccountBookService;

  constructor() {
    this.userService = new UserService();
    this.passwordResetTokenRepository = new PasswordResetTokenRepository();
    this.accountBookService = new AccountBookService();
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string): Promise<LoginResponseDto> {
    try {
      const user = await this.userService.login(email, password);

      // 生成JWT令牌
      const token = generateToken({
        id: user.id,
        email: user.email,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 用户注册
   */
  async register(userData: CreateUserDto): Promise<LoginResponseDto> {
    try {
      // 创建用户
      const newUser = await this.userService.createUser(userData);

      // 为新用户创建默认账本
      let defaultAccountBook = null;
      try {
        defaultAccountBook = await this.accountBookService.createDefaultAccountBook(newUser.id);
      } catch (accountBookError) {
        console.error('创建默认账本失败:', accountBookError);
        // 不影响用户注册流程，继续执行
      }

      // 确保系统默认分类存在（不为用户创建配置记录）
      try {
        const categoryService = new CategoryService();
        await categoryService.initializeDefaultCategories();
      } catch (categoryError) {
        console.error('初始化默认分类失败:', categoryError);
        // 不影响用户注册流程，继续执行
      }

      // 初始化用户设置
      try {
        const { UserSettingService } = require('./user-setting.service');
        const { UserSettingKey } = require('../models/user-setting.model');
        const userSettingService = new UserSettingService();

        // 初始化默认设置
        await userSettingService.initializeDefaultSettings(newUser.id);

        // 如果成功创建了默认账本，将其ID保存到用户设置中
        if (defaultAccountBook) {
          await userSettingService.createOrUpdateUserSetting(newUser.id, {
            key: UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
            value: defaultAccountBook.id,
          });
        }
      } catch (settingError) {
        console.error('初始化用户设置失败:', settingError);
        // 不影响用户注册流程，继续执行
      }

      // 生成JWT令牌
      const token = generateToken({
        id: newUser.id,
        email: newUser.email,
      });

      return {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      // 检查用户是否存在
      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        // 出于安全考虑，即使用户不存在也不返回错误
        // 这样可以防止恶意用户探测系统中存在的邮箱
        return;
      }

      // 清理过期的令牌
      await this.passwordResetTokenRepository.deleteExpired();

      // 计算过期时间（24小时后）
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + config.passwordReset.tokenExpiresIn);

      // 创建密码重置令牌
      const resetToken = await this.passwordResetTokenRepository.create(user.id, expiresAt);

      // 发送密码重置邮件
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken.token,
        user.name,
      );

      if (!emailSent) {
        throw new Error('发送密码重置邮件失败');
      }
    } catch (error) {
      console.error('密码重置邮件发送失败:', error);
      throw new Error('发送密码重置邮件时发生错误');
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // 查找令牌
      const resetToken = await this.passwordResetTokenRepository.findByToken(token);

      // 验证令牌
      if (!resetToken) {
        throw new Error('无效的密码重置令牌');
      }

      // 检查令牌是否过期
      if (resetToken.expiresAt < new Date()) {
        throw new Error('密码重置令牌已过期');
      }

      // 检查令牌是否已使用
      if (resetToken.isUsed) {
        throw new Error('密码重置令牌已被使用');
      }

      // 更新用户密码
      await this.userService.updateUser(resetToken.userId, { password: newPassword });

      // 标记令牌为已使用
      await this.passwordResetTokenRepository.markAsUsed(resetToken.id);
    } catch (error) {
      console.error('密码重置失败:', error);
      throw error;
    }
  }

  /**
   * 刷新用户token
   */
  async refreshToken(userId: string): Promise<LoginResponseDto> {
    try {
      // 获取用户信息
      const user = await this.userService.getUserById(userId);

      if (!user) {
        throw new Error('用户不存在');
      }

      // 生成新的JWT令牌
      const token = generateToken({
        id: user.id,
        email: user.email,
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    } catch (error) {
      console.error('刷新token失败:', error);
      throw error;
    }
  }
}
