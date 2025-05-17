import { Request, Response } from 'express';
import { UserCategoryConfigService } from '../services/user-category-config.service';
import { UpdateUserCategoryConfigDto } from '../models/user-category-config.model';

export class UserCategoryConfigController {
  private userCategoryConfigService: UserCategoryConfigService;

  constructor() {
    this.userCategoryConfigService = new UserCategoryConfigService();
  }

  /**
   * 获取用户的所有分类配置
   */
  async getUserCategoryConfigs(req: Request, res: Response): Promise<void> {
    try {
      // 确保用户已认证
      if (!req.user) {
        res.status(401).json({ message: '用户未认证' });
        return;
      }

      const userId = req.user.id;
      const configs = await this.userCategoryConfigService.getUserCategoryConfigs(userId);
      res.json(configs);
    } catch (error) {
      console.error('获取用户分类配置失败:', error);
      res.status(500).json({ message: '获取用户分类配置失败' });
    }
  }

  /**
   * 更新用户分类配置
   */
  async updateUserCategoryConfig(req: Request, res: Response): Promise<void> {
    try {
      // 确保用户已认证
      if (!req.user) {
        res.status(401).json({ message: '用户未认证' });
        return;
      }

      const userId = req.user.id;
      const categoryId = req.params.categoryId;
      const configData: UpdateUserCategoryConfigDto = req.body;

      // 查找是否已存在配置
      const existingConfigs = await this.userCategoryConfigService.getUserCategoryConfigs(userId);
      const existingConfig = existingConfigs.find(config => config.categoryId === categoryId);

      let result;
      if (existingConfig) {
        // 更新现有配置
        result = await this.userCategoryConfigService.updateUserCategoryConfigByUserIdAndCategoryId(
          userId,
          categoryId,
          configData
        );
      } else {
        // 创建新配置
        result = await this.userCategoryConfigService.createUserCategoryConfig({
          userId,
          categoryId,
          ...configData
        });
      }

      res.json(result);
    } catch (error) {
      console.error('更新用户分类配置失败:', error);
      res.status(500).json({ message: '更新用户分类配置失败' });
    }
  }

  /**
   * 批量更新用户分类配置
   */
  async batchUpdateUserCategoryConfigs(req: Request, res: Response): Promise<void> {
    try {
      // 确保用户已认证
      if (!req.user) {
        res.status(401).json({ message: '用户未认证' });
        return;
      }

      const userId = req.user.id;
      const configsData = req.body;

      const results = [];
      for (const configData of configsData) {
        const { categoryId, ...updateData } = configData;

        // 查找是否已存在配置
        const existingConfigs = await this.userCategoryConfigService.getUserCategoryConfigs(userId);
        const existingConfig = existingConfigs.find(config => config.categoryId === categoryId);

        let result;
        if (existingConfig) {
          // 更新现有配置
          result = await this.userCategoryConfigService.updateUserCategoryConfigByUserIdAndCategoryId(
            userId,
            categoryId,
            updateData
          );
        } else {
          // 创建新配置
          result = await this.userCategoryConfigService.createUserCategoryConfig({
            userId,
            categoryId,
            ...updateData
          });
        }

        results.push(result);
      }

      res.json(results);
    } catch (error) {
      console.error('批量更新用户分类配置失败:', error);
      res.status(500).json({ message: '批量更新用户分类配置失败' });
    }
  }
}
