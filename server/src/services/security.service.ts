import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import {
  ChangePasswordDto,
  ChangeEmailDto,
  SendVerificationCodeDto,
  Session,
  SecurityLog,
  SecurityLogType,
  SecurityLogQueryParams,
  UserSecurity
} from '../models/security.model';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class SecurityService {
  private prisma: PrismaClient;
  private userService: UserService;

  constructor() {
    this.prisma = new PrismaClient();
    this.userService = new UserService();
  }

  /**
   * 修改用户密码
   * @param userId 用户ID
   * @param data 密码修改数据
   */
  async changePassword(userId: string, data: ChangePasswordDto): Promise<void> {
    // 获取用户 - 直接从数据库获取以访问密码哈希
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('当前密码不正确');
    }

    // 检查新密码是否与当前密码相同
    if (data.currentPassword === data.newPassword) {
      throw new Error('新密码不能与当前密码相同');
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // 更新密码
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date()
      }
    });

    // 记录安全日志
    await this.createSecurityLog(userId, {
      type: SecurityLogType.PASSWORD_CHANGE,
      description: '密码已修改',
      deviceInfo: '未知设备', // 实际应用中应从请求中获取
      ipAddress: '0.0.0.0',  // 实际应用中应从请求中获取
      location: '未知位置'    // 实际应用中应从IP获取
    });
  }

  /**
   * 发送邮箱验证码
   * @param userId 用户ID
   * @param data 验证码请求数据
   */
  async sendEmailVerificationCode(userId: string, data: SendVerificationCodeDto): Promise<void> {
    // 检查邮箱是否已被其他用户使用
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser && existingUser.id !== userId) {
      throw new Error('该邮箱已被其他用户使用');
    }

    // 生成6位数验证码
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 保存验证码到数据库，设置15分钟过期
    await this.prisma.verificationCode.create({
      data: {
        userId,
        code: verificationCode,
        email: data.email,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15分钟后过期
      }
    });

    // TODO: 发送验证码到邮箱
    console.log(`发送验证码 ${verificationCode} 到邮箱 ${data.email}`);

    // 实际应用中应该调用邮件服务发送验证码
  }

  /**
   * 修改用户邮箱
   * @param userId 用户ID
   * @param data 邮箱修改数据
   */
  async changeEmail(userId: string, data: ChangeEmailDto): Promise<void> {
    // 检查邮箱是否已被其他用户使用
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.newEmail }
    });

    if (existingUser && existingUser.id !== userId) {
      throw new Error('该邮箱已被其他用户使用');
    }

    // 验证验证码
    const verificationCode = await this.prisma.verificationCode.findFirst({
      where: {
        userId,
        email: data.newEmail,
        code: data.verificationCode,
        expiresAt: { gt: new Date() } // 验证码未过期
      }
    });

    if (!verificationCode) {
      throw new Error('验证码无效或已过期');
    }

    // 更新用户邮箱
    await this.prisma.user.update({
      where: { id: userId },
      data: { email: data.newEmail }
    });

    // 删除已使用的验证码
    await this.prisma.verificationCode.delete({
      where: { id: verificationCode.id }
    });

    // 记录安全日志
    await this.createSecurityLog(userId, {
      type: SecurityLogType.EMAIL_CHANGE,
      description: '邮箱已修改',
      deviceInfo: '未知设备', // 实际应用中应从请求中获取
      ipAddress: '0.0.0.0',  // 实际应用中应从请求中获取
      location: '未知位置'    // 实际应用中应从IP获取
    });
  }

  /**
   * 获取用户安全设置
   * @param userId 用户ID
   */
  async getUserSecurity(userId: string): Promise<UserSecurity> {
    // 获取用户 - 直接从数据库获取以访问 passwordChangedAt
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    // 获取用户设置
    const securityQuestionSetting = await this.prisma.userSetting.findFirst({
      where: { userId, key: 'securityQuestionSet' }
    });

    const loginNotificationSetting = await this.prisma.userSetting.findFirst({
      where: { userId, key: 'loginNotification' }
    });

    const recoveryEmailSetting = await this.prisma.userSetting.findFirst({
      where: { userId, key: 'recoveryEmail' }
    });

    // 构建安全设置对象
    return {
      email: this.maskEmail(user.email),
      lastPasswordChange: user.passwordChangedAt,
      securityQuestionSet: securityQuestionSetting?.value === 'true',
      loginNotification: loginNotificationSetting?.value === 'true',
      recoveryEmailSet: !!recoveryEmailSetting?.value,
      recoveryEmail: recoveryEmailSetting?.value ? this.maskEmail(recoveryEmailSetting.value) : null
    };
  }

  /**
   * 获取用户登录会话列表
   * @param userId 用户ID
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    // 从数据库获取会话
    const sessions = await this.prisma.session.findMany({
      where: { userId }
    });

    // 转换为前端需要的格式
    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      deviceName: session.deviceName || '未知设备',
      deviceType: session.deviceType || 'unknown',
      browser: session.browser || '未知浏览器',
      os: session.os || '未知系统',
      ip: session.ip || '0.0.0.0',
      location: session.location || '未知位置',
      lastActive: session.lastActive || new Date(),
      isCurrent: session.isCurrent || false
    }));
  }

  /**
   * 登出指定会话
   * @param userId 用户ID
   * @param sessionId 会话ID
   */
  async logoutSession(userId: string, sessionId: string): Promise<void> {
    // 检查会话是否存在且属于该用户
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      throw new Error('会话不存在或不属于该用户');
    }

    // 删除会话
    await this.prisma.session.delete({
      where: { id: sessionId }
    });

    // 记录安全日志
    await this.createSecurityLog(userId, {
      type: SecurityLogType.DEVICE_LOGOUT,
      description: `设备已登出: ${session.deviceName || '未知设备'}`,
      deviceInfo: session.deviceName || '未知设备',
      ipAddress: session.ip || '0.0.0.0',
      location: session.location || '未知位置'
    });
  }

  /**
   * 获取用户安全日志
   * @param userId 用户ID
   * @param params 查询参数
   */
  async getSecurityLogs(userId: string, params: SecurityLogQueryParams): Promise<{ logs: SecurityLog[], total: number }> {
    const { page = 1, limit = 10, type, startDate, endDate } = params;

    // 构建查询条件
    const where: any = { userId };

    if (type) {
      where.type = type;
    }

    if (startDate) {
      where.createdAt = { ...(where.createdAt || {}), gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) };
    }

    // 查询总数
    const total = await this.prisma.securityLog.count({ where });

    // 查询日志
    const logs = await this.prisma.securityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        type: log.type as SecurityLogType,
        description: log.description,
        deviceInfo: log.deviceInfo,
        ipAddress: log.ipAddress,
        location: log.location,
        createdAt: log.createdAt
      })),
      total
    };
  }

  /**
   * 创建安全日志
   * @param userId 用户ID
   * @param logData 日志数据
   */
  private async createSecurityLog(userId: string, logData: {
    type: SecurityLogType;
    description: string;
    deviceInfo: string;
    ipAddress: string;
    location: string;
  }): Promise<void> {
    await this.prisma.securityLog.create({
      data: {
        id: uuidv4(),
        userId,
        type: logData.type,
        description: logData.description,
        deviceInfo: logData.deviceInfo,
        ipAddress: logData.ipAddress,
        location: logData.location,
        createdAt: new Date()
      }
    });
  }

  /**
   * 掩码邮箱地址
   * @param email 邮箱地址
   */
  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');

    if (username.length <= 2) {
      return `${username[0]}****@${domain}`;
    }

    return `${username[0]}${username[1]}****@${domain}`;
  }
}
