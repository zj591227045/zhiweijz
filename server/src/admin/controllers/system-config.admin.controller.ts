import { Request, Response } from 'express';
import { SystemConfigAdminService } from '../services/system-config.admin.service';
import { CreateSystemConfigSchema, UpdateSystemConfigSchema } from '../validators/system-config.validator';

export class SystemConfigAdminController {
  private systemConfigAdminService: SystemConfigAdminService;

  constructor() {
    this.systemConfigAdminService = new SystemConfigAdminService();
  }

  /**
   * 获取系统配置列表
   */
  async getSystemConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { category, search } = req.query;

      const result = await this.systemConfigAdminService.getSystemConfigs({
        category: category as string,
        search: search as string
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取系统配置列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取系统配置列表失败'
      });
    }
  }

  /**
   * 获取单个系统配置
   */
  async getSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const config = await this.systemConfigAdminService.getSystemConfigById(id);

      if (!config) {
        res.status(404).json({
          success: false,
          message: '系统配置不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: { config }
      });
    } catch (error) {
      console.error('获取系统配置错误:', error);
      res.status(500).json({
        success: false,
        message: '获取系统配置失败'
      });
    }
  }

  /**
   * 创建系统配置
   */
  async createSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const validation = CreateSystemConfigSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: validation.error.errors
        });
        return;
      }

      const config = await this.systemConfigAdminService.createSystemConfig(
        validation.data,
        req.admin?.id
      );

      res.status(201).json({
        success: true,
        data: { config },
        message: '系统配置创建成功'
      });
    } catch (error) {
      console.error('创建系统配置错误:', error);
      if (error instanceof Error && error.message.includes('已存在')) {
        res.status(409).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '创建系统配置失败'
        });
      }
    }
  }

  /**
   * 更新系统配置
   */
  async updateSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = UpdateSystemConfigSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: validation.error.errors
        });
        return;
      }

      const config = await this.systemConfigAdminService.updateSystemConfig(
        id,
        validation.data,
        req.admin?.id
      );

      res.json({
        success: true,
        data: { config },
        message: '系统配置更新成功'
      });
    } catch (error) {
      console.error('更新系统配置错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '更新系统配置失败'
        });
      }
    }
  }

  /**
   * 删除系统配置
   */
  async deleteSystemConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.systemConfigAdminService.deleteSystemConfig(id);

      res.json({
        success: true,
        message: '系统配置删除成功'
      });
    } catch (error) {
      console.error('删除系统配置错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '删除系统配置失败'
        });
      }
    }
  }

  /**
   * 批量更新系统配置
   */
  async batchUpdateSystemConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { configs } = req.body;

      if (!Array.isArray(configs) || configs.length === 0) {
        res.status(400).json({
          success: false,
          message: '配置列表不能为空'
        });
        return;
      }

      const result = await this.systemConfigAdminService.batchUpdateSystemConfigs(
        configs,
        req.admin?.id
      );

      res.json({
        success: true,
        data: result,
        message: '批量更新系统配置成功'
      });
    } catch (error) {
      console.error('批量更新系统配置错误:', error);
      res.status(500).json({
        success: false,
        message: '批量更新系统配置失败'
      });
    }
  }

  /**
   * 获取LLM相关配置
   */
  async getLLMConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = await this.systemConfigAdminService.getLLMConfigs();

      res.json({
        success: true,
        data: { configs }
      });
    } catch (error) {
      console.error('获取LLM配置错误:', error);
      res.status(500).json({
        success: false,
        message: '获取LLM配置失败'
      });
    }
  }

  /**
   * 更新LLM配置
   */
  async updateLLMConfigs(req: Request, res: Response): Promise<void> {
    try {
      const { enabled, provider, model, apiKey, baseUrl, temperature, maxTokens } = req.body;

      await this.systemConfigAdminService.updateLLMConfigs({
        enabled,
        provider,
        model,
        apiKey,
        baseUrl,
        temperature,
        maxTokens
      }, req.admin?.id);

      res.json({
        success: true,
        message: 'LLM配置更新成功'
      });
    } catch (error) {
      console.error('更新LLM配置错误:', error);
      res.status(500).json({
        success: false,
        message: '更新LLM配置失败'
      });
    }
  }

  /**
   * 测试LLM连接
   */
  async testLLMConnection(req: Request, res: Response): Promise<void> {
    try {
      const { provider, model, apiKey, baseUrl } = req.body;

      const result = await this.systemConfigAdminService.testLLMConnection({
        provider,
        model,
        apiKey,
        baseUrl
      });

      res.json({
        success: true,
        data: result,
        message: 'LLM连接测试完成'
      });
    } catch (error) {
      console.error('测试LLM连接错误:', error);
      res.status(500).json({
        success: false,
        message: '测试LLM连接失败'
      });
    }
  }
} 