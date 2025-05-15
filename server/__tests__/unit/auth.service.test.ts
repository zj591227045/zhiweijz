import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { PasswordResetTokenRepository } from '../../src/repositories/password-reset-token.repository';
import { emailService } from '../../src/utils/email';

// 模拟依赖
jest.mock('../../src/services/user.service');
jest.mock('../../src/repositories/password-reset-token.repository');
jest.mock('../../src/utils/email');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserService: jest.Mocked<UserService>;
  let mockPasswordResetTokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let mockEmailService: jest.Mocked<typeof emailService>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 设置模拟
    mockUserService = new UserService() as jest.Mocked<UserService>;
    mockPasswordResetTokenRepository = new PasswordResetTokenRepository() as jest.Mocked<PasswordResetTokenRepository>;
    mockEmailService = emailService as jest.Mocked<typeof emailService>;

    // 创建服务实例
    authService = new AuthService();

    // 替换私有属性
    (authService as any).userService = mockUserService;
    (authService as any).passwordResetTokenRepository = mockPasswordResetTokenRepository;
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email for existing user', async () => {
      // 准备
      const email = 'test@example.com';
      const user = {
        id: 'user-id',
        email,
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const resetToken = {
        id: 'token-id',
        token: 'reset-token',
        userId: user.id,
        expiresAt: new Date(),
        createdAt: new Date(),
        isUsed: false,
      };

      // 模拟行为
      mockUserService.getUserByEmail.mockResolvedValue(user);
      mockPasswordResetTokenRepository.deleteExpired.mockResolvedValue(0);
      mockPasswordResetTokenRepository.create.mockResolvedValue(resetToken);
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(true);

      // 执行
      await authService.sendPasswordResetEmail(email);

      // 验证
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(email);
      expect(mockPasswordResetTokenRepository.deleteExpired).toHaveBeenCalled();
      expect(mockPasswordResetTokenRepository.create).toHaveBeenCalledWith(user.id, expect.any(Date));
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(email, resetToken.token, user.name);
    });

    it('should not throw error for non-existing user', async () => {
      // 准备
      const email = 'nonexistent@example.com';

      // 模拟行为
      mockUserService.getUserByEmail.mockResolvedValue(null);

      // 执行
      await expect(authService.sendPasswordResetEmail(email)).resolves.not.toThrow();

      // 验证
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(email);
      expect(mockPasswordResetTokenRepository.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      // 准备
      const token = 'valid-token';
      const newPassword = 'new-password';
      const resetToken = {
        id: 'token-id',
        token,
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
        createdAt: new Date(),
        isUsed: false,
      };

      // 模拟行为
      mockPasswordResetTokenRepository.findByToken.mockResolvedValue(resetToken);
      mockUserService.updateUser.mockResolvedValue({} as any);
      mockPasswordResetTokenRepository.markAsUsed.mockResolvedValue({} as any);

      // 执行
      await authService.resetPassword(token, newPassword);

      // 验证
      expect(mockPasswordResetTokenRepository.findByToken).toHaveBeenCalledWith(token);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(resetToken.userId, { password: newPassword });
      expect(mockPasswordResetTokenRepository.markAsUsed).toHaveBeenCalledWith(resetToken.id);
    });

    it('should throw error for invalid token', async () => {
      // 准备
      const token = 'invalid-token';
      const newPassword = 'new-password';

      // 模拟行为
      mockPasswordResetTokenRepository.findByToken.mockResolvedValue(null);

      // 执行和验证
      await expect(authService.resetPassword(token, newPassword)).rejects.toThrow('无效的密码重置令牌');
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
      expect(mockPasswordResetTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should throw error for expired token', async () => {
      // 准备
      const token = 'expired-token';
      const newPassword = 'new-password';
      const resetToken = {
        id: 'token-id',
        token,
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in the past
        createdAt: new Date(),
        isUsed: false,
      };

      // 模拟行为
      mockPasswordResetTokenRepository.findByToken.mockResolvedValue(resetToken);

      // 执行和验证
      await expect(authService.resetPassword(token, newPassword)).rejects.toThrow('密码重置令牌已过期');
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
      expect(mockPasswordResetTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });

    it('should throw error for used token', async () => {
      // 准备
      const token = 'used-token';
      const newPassword = 'new-password';
      const resetToken = {
        id: 'token-id',
        token,
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour in the future
        createdAt: new Date(),
        isUsed: true,
      };

      // 模拟行为
      mockPasswordResetTokenRepository.findByToken.mockResolvedValue(resetToken);

      // 执行和验证
      await expect(authService.resetPassword(token, newPassword)).rejects.toThrow('密码重置令牌已被使用');
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
      expect(mockPasswordResetTokenRepository.markAsUsed).not.toHaveBeenCalled();
    });
  });
});
