import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from '../models/user.model';
import { UserSettingService } from '../services/user-setting.service';
import { getFileUrl } from '../middlewares/upload.middleware';

export class UserController {
  private userService: UserService;
  private userSettingService: UserSettingService;

  constructor() {
    this.userService = new UserService();
    this.userSettingService = new UserSettingService();
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

      // 转换为前端需要的格式
      const profile = {
        id: user.id,
        username: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        birthDate: user.birthDate,
        createdAt: user.createdAt
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

      const profileData: UpdateProfileDto = req.body;

      // 转换为用户更新DTO
      const updateData: UpdateUserDto = {
        name: profileData.username,
        bio: profileData.bio,
        birthDate: profileData.birthDate
      };

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
        createdAt: updatedUser.createdAt
      };

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

      // 获取文件信息
      const avatarFile = req.file;
      const avatarUrl = getFileUrl(avatarFile.filename, 'avatar');

      // 更新用户头像
      const updateData: UpdateUserDto = {
        avatar: avatarUrl
      };

      await this.userService.updateUser(userId, updateData);

      // 返回头像URL
      res.status(200).json({ avatar: avatarUrl });
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
      const userId = req.params.id;
      const userData: UpdateUserDto = req.body;
      const updatedUser = await this.userService.updateUser(userId, userData);
      res.status(200).json(updatedUser);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新用户信息时发生错误' });
      }
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
}
