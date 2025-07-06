import { Request, Response } from 'express';
import { UserSettingService } from '../services/user-setting.service';
import {
  CreateUserSettingDto,
  UpdateUserSettingDto,
  BatchUpdateUserSettingsDto,
} from '../models/user-setting.model';

export class UserSettingController {
  private userSettingService: UserSettingService;

  constructor() {
    this.userSettingService = new UserSettingService();
  }

  /**
   * 获取用户的所有设置
   */
  async getUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const settings = await this.userSettingService.getUserSettings(userId);
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ message: '获取用户设置时发生错误' });
    }
  }

  /**
   * 获取用户的特定设置
   */
  async getUserSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const key = req.params.key;
      const setting = await this.userSettingService.getUserSetting(userId, key);

      if (!setting) {
        res.status(404).json({ message: `设置 ${key} 不存在` });
        return;
      }

      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取用户设置时发生错误' });
      }
    }
  }

  /**
   * 创建或更新用户设置
   */
  async createOrUpdateUserSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const settingData: CreateUserSettingDto = req.body;
      const setting = await this.userSettingService.createOrUpdateUserSetting(userId, settingData);
      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建或更新用户设置时发生错误' });
      }
    }
  }

  /**
   * 批量创建或更新用户设置
   */
  async batchCreateOrUpdateUserSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const data: BatchUpdateUserSettingsDto = req.body;
      const count = await this.userSettingService.batchCreateOrUpdateUserSettings(userId, data);
      res.status(200).json({ message: `成功更新 ${count} 个设置` });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '批量更新用户设置时发生错误' });
      }
    }
  }

  /**
   * 更新用户设置
   */
  async updateUserSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const key = req.params.key;
      const settingData: UpdateUserSettingDto = req.body;
      const setting = await this.userSettingService.updateUserSetting(userId, key, settingData);
      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新用户设置时发生错误' });
      }
    }
  }

  /**
   * 删除用户设置
   */
  async deleteUserSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const key = req.params.key;
      await this.userSettingService.deleteUserSetting(userId, key);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除用户设置时发生错误' });
      }
    }
  }

  /**
   * 初始化用户默认设置
   */
  async initializeDefaultSettings(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const count = await this.userSettingService.initializeDefaultSettings(userId);
      res.status(200).json({ message: `成功初始化 ${count} 个默认设置` });
    } catch (error) {
      res.status(500).json({ message: '初始化默认设置时发生错误' });
    }
  }
}
