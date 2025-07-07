import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from '../models/user.model';
import { UserSettingService } from '../services/user-setting.service';
import { getFileUrl } from '../middlewares/upload.middleware';
import { FileStorageService } from '../services/file-storage.service';
import { BUCKET_CONFIG, FileUploadRequestDto } from '../models/file-storage.model';
import { comparePasswords } from '../utils/password';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
  private userService: UserService;
  private userSettingService: UserSettingService;
  private fileStorageService: FileStorageService;

  constructor() {
    this.userService = new UserService();
    this.userSettingService = new UserSettingService();
    this.fileStorageService = new FileStorageService();
  }

  /**
   * 获取当前用户的个人资料
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const user = await this.userService.getUserById(userId);

      // 获取用户注册序号
      const registrationOrder = await this.userService.getUserRegistrationOrder(userId);

      // 转换为前端需要的格式
      const profile = {
        id: user.id,
        username: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthDate: user.birthDate,
        createdAt: user.createdAt,
        registrationOrder: registrationOrder,
      };

      res.status(200).json(profile);
    } catch (error) {
      console.error('获取用户资料失败:', error);
      res.status(500).json({ message: '获取用户资料失败' });
    }
  }

  /**
   * 更新当前用户的个人资料
   */
  async updateUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      console.log('更新用户资料请求数据:', req.body);
      const profileData: UpdateProfileDto = req.body;

      // 验证必要字段
      if (!profileData.username || profileData.username.trim() === '') {
        res.status(400).json({ message: '用户名不能为空' });
        return;
      }

      // 转换为用户更新DTO
      const updateData: UpdateUserDto = {
        name: profileData.username.trim(),
        bio: profileData.bio?.trim() || undefined,
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
      };

      console.log('转换后的更新数据:', updateData);

      // 更新用户信息
      const updatedUser = await this.userService.updateUser(userId, updateData);

      // 转换为前端需要的格式
      const profile = {
        id: updatedUser.id,
        username: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        birthDate: updatedUser.birthDate,
        createdAt: updatedUser.createdAt,
      };

      console.log('更新用户资料成功:', profile);
      res.status(200).json(profile);
    } catch (error) {
      console.error('更新用户资料失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新用户资料失败' });
      }
    }
  }

  /**
   * 上传用户头像
   */
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 检查是否有文件上传
      if (!req.file) {
        res.status(400).json({ message: '未上传文件' });
        return;
      }

      // 删除用户之前的头像文件（如果存在）
      await this.deleteUserPreviousAvatar(userId);

      // 上传新头像到S3
      const uploadRequest: FileUploadRequestDto = {
        bucket: BUCKET_CONFIG.AVATARS,
        category: 'avatar',
        description: '用户头像',
        metadata: {
          userId,
          uploadType: 'avatar',
        },
      };

      const uploadResult = await this.fileStorageService.uploadFile(
        req.file,
        uploadRequest,
        userId,
      );

      // 更新用户头像URL
      const updateData: UpdateUserDto = {
        avatar: uploadResult.url,
      };

      await this.userService.updateUser(userId, updateData);

      // 返回头像信息
      res.status(200).json({
        avatar: uploadResult.url,
        fileId: uploadResult.fileId,
        message: '头像上传成功',
      });
    } catch (error) {
      console.error('上传头像失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '上传头像失败' });
      }
    }
  }

  /**
   * 更新用户头像ID（预设头像）
   */
  async updateAvatarId(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { avatarId } = req.body;
      if (!avatarId || typeof avatarId !== 'string') {
        res.status(400).json({ message: '头像ID不能为空' });
        return;
      }

      console.log('更新用户头像ID:', { userId, avatarId });

      // 更新用户头像ID
      const updateData: UpdateUserDto = {
        avatar: avatarId,
      };

      await this.userService.updateUser(userId, updateData);

      // 返回头像ID
      res.status(200).json({ avatar: avatarId });
    } catch (error) {
      console.error('更新头像ID失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新头像ID失败' });
      }
    }
  }

  /**
   * 创建新用户
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserDto = req.body;
      const newUser = await this.userService.createUser(userData);

      // 初始化用户默认设置
      await this.userSettingService.initializeDefaultSettings(newUser.id);

      res.status(201).json(newUser);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建用户时发生错误' });
      }
    }
  }

  /**
   * 获取用户信息
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const user = await this.userService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取用户信息时发生错误' });
      }
    }
  }

  /**
   * 更新用户信息
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const targetUserId = req.params.id;
      const currentUserId = req.user?.id;
      const userData: UpdateUserDto = req.body;

      if (!currentUserId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 检查权限：只能更新自己的信息，或者管理员更新托管用户的信息
      if (currentUserId !== targetUserId) {
        // 检查目标用户是否是托管用户
        const targetUser = await this.userService.getUserById(targetUserId);
        if (!targetUser) {
          res.status(404).json({ message: '用户不存在' });
          return;
        }

        if (!targetUser.isCustodial) {
          res.status(403).json({ message: '无权更新其他用户的信息' });
          return;
        }

        // 检查当前用户是否是托管用户所在家庭的管理员
        const hasPermission = await this.checkCustodialUserPermission(currentUserId, targetUserId);
        if (!hasPermission) {
          res.status(403).json({ message: '无权更新此托管用户的信息' });
          return;
        }
      }

      console.log('🔧 更新用户信息:', { targetUserId, currentUserId, userData });
      const updatedUser = await this.userService.updateUser(targetUserId, userData);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('更新用户信息失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新用户信息时发生错误' });
      }
    }
  }

  /**
   * 检查用户是否有权限管理托管用户
   * @param currentUserId 当前用户ID
   * @param custodialUserId 托管用户ID
   * @returns 是否有权限
   */
  private async checkCustodialUserPermission(currentUserId: string, custodialUserId: string): Promise<boolean> {
    try {
      // 查找托管用户所在的家庭
      const familyMembers = await prisma.familyMember.findMany({
        where: { userId: custodialUserId },
        include: {
          family: {
            include: {
              members: {
                where: {
                  userId: currentUserId,
                  role: 'ADMIN'
                }
              }
            }
          }
        }
      });

      // 检查当前用户是否是托管用户所在任何家庭的管理员
      return familyMembers.some(member =>
        member.family.members.length > 0
      );
    } catch (error) {
      console.error('检查托管用户权限失败:', error);
      return false;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      await this.userService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除用户时发生错误' });
      }
    }
  }

  /**
   * 获取所有用户
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: '获取用户列表时发生错误' });
    }
  }

  /**
   * 发起注销请求
   */
  async requestDeletion(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { password, confirmText } = req.body;

      // 验证密码
      if (!password) {
        res.status(400).json({ message: '请输入当前密码' });
        return;
      }

      // 验证确认文字
      if (confirmText !== '确认注销') {
        res.status(400).json({ message: '请输入正确的确认文字' });
        return;
      }

      // 获取用户信息验证密码
      const user = await this.userService.getUserByIdWithPassword(userId);
      const isPasswordValid = await comparePasswords(password, user.passwordHash);

      if (!isPasswordValid) {
        res.status(400).json({ message: '密码错误' });
        return;
      }

      // 检查用户是否是账本的唯一管理员
      const isOnlyAdmin = await this.userService.checkIfOnlyAccountBookAdmin(userId);
      if (isOnlyAdmin) {
        res.status(400).json({
          message: '您是某些账本的唯一管理员，请先转移管理权或删除账本后再注销账户',
        });
        return;
      }

      // 发起注销请求
      const result = await this.userService.requestDeletion(userId);

      res.status(200).json({
        message: '注销请求已提交，24小时后将自动删除账户',
        deletionScheduledAt: result.deletionScheduledAt,
      });
    } catch (error) {
      console.error('发起注销请求失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '发起注销请求失败' });
      }
    }
  }

  /**
   * 取消注销请求
   */
  async cancelDeletion(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      await this.userService.cancelDeletion(userId);

      res.status(200).json({ message: '注销请求已取消' });
    } catch (error) {
      console.error('取消注销请求失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '取消注销请求失败' });
      }
    }
  }

  /**
   * 查询注销状态
   */
  async getDeletionStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const status = await this.userService.getDeletionStatus(userId);

      res.status(200).json(status);
    } catch (error) {
      console.error('查询注销状态失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '查询注销状态失败' });
      }
    }
  }

  /**
   * 验证密码
   */
  async verifyPassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({ message: '请输入密码' });
        return;
      }

      // 获取用户信息验证密码
      const user = await this.userService.getUserByIdWithPassword(userId);
      const isPasswordValid = await comparePasswords(password, user.passwordHash);

      if (!isPasswordValid) {
        res.status(400).json({ message: '密码错误' });
        return;
      }

      res.status(200).json({ message: '密码验证成功' });
    } catch (error) {
      console.error('密码验证失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '密码验证失败' });
      }
    }
  }

  /**
   * 删除用户之前的头像文件
   */
  private async deleteUserPreviousAvatar(userId: string): Promise<void> {
    try {
      // 查找用户之前上传的头像文件
      const previousAvatars = await this.fileStorageService.getFiles({
        uploadedBy: userId,
        bucket: BUCKET_CONFIG.AVATARS,
        limit: 10, // 最多查找10个之前的头像
      });

      // 删除之前的头像文件
      for (const avatar of previousAvatars.files) {
        try {
          await this.fileStorageService.deleteFile(avatar.id, userId);
          console.log(`已删除用户 ${userId} 的旧头像文件: ${avatar.id}`);
        } catch (error) {
          console.error(`删除旧头像文件失败: ${avatar.id}`, error);
          // 继续删除其他文件，不中断流程
        }
      }
    } catch (error) {
      console.error('删除用户旧头像失败:', error);
      // 不抛出错误，允许继续上传新头像
    }
  }
}
