import { Request, Response } from 'express';
import { MultimodalAIAdminService } from '../services/multimodal-ai.admin.service';

/**
 * 管理员多模态AI配置控制器
 */
export class MultimodalAIAdminController {
  private multimodalAIAdminService: MultimodalAIAdminService;

  constructor() {
    this.multimodalAIAdminService = new MultimodalAIAdminService();
  }

  /**
   * 获取多模态AI配置
   * GET /api/admin/multimodal-ai/config
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      console.log('📝 [管理端] 获取多模态AI配置请求');
      const config = await this.multimodalAIAdminService.getFullConfig();
      
      console.log('📝 [管理端] 返回的配置概览:', {
        speechEnabled: config.speech.enabled,
        visionEnabled: config.vision.enabled,
        smartAccountingConfigLength: {
          relevanceCheck: config.smartAccounting.relevanceCheckPrompt.length,
          smartAccounting: config.smartAccounting.smartAccountingPrompt.length,
          imageAnalysis: config.smartAccounting.imageAnalysisPrompt.length,
          multimodal: config.smartAccounting.multimodalPrompt.length
        }
      });
      
      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error('获取多模态AI配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取配置失败',
      });
    }
  }

  /**
   * 更新语音识别配置
   * PUT /api/admin/multimodal-ai/speech
   */
  async updateSpeechConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      await this.multimodalAIAdminService.updateSpeechConfig(config);
      
      res.json({
        success: true,
        message: '语音识别配置更新成功',
      });
    } catch (error) {
      console.error('更新语音识别配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新配置失败',
      });
    }
  }

  /**
   * 更新视觉识别配置
   * PUT /api/admin/multimodal-ai/vision
   */
  async updateVisionConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      await this.multimodalAIAdminService.updateVisionConfig(config);
      
      res.json({
        success: true,
        message: '视觉识别配置更新成功',
      });
    } catch (error) {
      console.error('更新视觉识别配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '更新配置失败',
      });
    }
  }

  /**
   * 测试语音识别配置
   * POST /api/admin/multimodal-ai/speech/test
   */
  async testSpeechConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      const result = await this.multimodalAIAdminService.testSpeechConfig(config);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('测试语音识别配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '测试配置失败',
      });
    }
  }

  /**
   * 测试视觉识别配置
   * POST /api/admin/multimodal-ai/vision/test
   */
  async testVisionConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      const result = await this.multimodalAIAdminService.testVisionConfig(config);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('测试视觉识别配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '测试配置失败',
      });
    }
  }

  /**
   * 获取支持的提供商列表
   * GET /api/admin/multimodal-ai/models
   */
  async getModels(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.multimodalAIAdminService.getSupportedProviders();

      res.json({
        success: true,
        data: {
          providers,
        },
      });
    } catch (error) {
      console.error('获取提供商列表失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取提供商列表失败',
      });
    }
  }

  /**
   * 获取配置状态
   * GET /api/admin/multimodal-ai/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.multimodalAIAdminService.getConfigStatus();
      
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('获取配置状态失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '获取配置状态失败',
      });
    }
  }

  /**
   * 批量更新配置
   * PUT /api/admin/multimodal-ai/config
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;
      
      await this.multimodalAIAdminService.updateFullConfig(config);
      
      res.json({
        success: true,
        message: '多模态AI配置更新成功',
      });
    } catch (error) {
      console.error('批量更新配置失败:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '批量更新配置失败',
      });
    }
  }
}
