import { UserService } from './user.service';
import { CreateUserDto } from '../models/user.model';
import { LoginResponseDto } from '../models/auth.model';
import { generateToken } from '../utils/jwt';

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
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
    // 检查用户是否存在
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new Error('用户不存在');
    }

    // TODO: 实现发送密码重置邮件的逻辑
    // 1. 生成密码重置令牌
    // 2. 存储令牌和过期时间
    // 3. 发送包含重置链接的邮件
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: 实现重置密码的逻辑
    // 1. 验证令牌的有效性
    // 2. 更新用户密码
    // 3. 删除已使用的令牌
  }
}
