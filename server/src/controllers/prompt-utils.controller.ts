import { Request, Response } from 'express';
import { getPlaceholderDescriptions } from '../utils/prompt-utils';

/**
 * 提示词工具控制器
 * 提供提示词相关的工具和说明
 */
export class PromptUtilsController {
  /**
   * 获取占位符说明
   * GET /api/admin/prompt-utils/placeholders
   */
  async getPlaceholderDescriptions(req: Request, res: Response): Promise<void> {
    try {
      const descriptions = getPlaceholderDescriptions();
      
      res.json({
        success: true,
        data: descriptions,
      });
    } catch (error) {
      console.error('获取占位符说明错误:', error);
      res.status(500).json({
        success: false,
        error: '获取占位符说明失败',
      });
    }
  }

  /**
   * 验证提示词模板
   * POST /api/admin/prompt-utils/validate
   */
  async validatePromptTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { template, type } = req.body;

      if (!template || !type) {
        res.status(400).json({
          success: false,
          error: '缺少必要参数',
        });
        return;
      }

      // 检查占位符格式
      const placeholderRegex = /\{\{[^}]+\}\}/g;
      const foundPlaceholders = template.match(placeholderRegex) || [];
      
      // 获取支持的占位符
      const descriptions = getPlaceholderDescriptions();
      const supportedPlaceholders = descriptions[type as keyof typeof descriptions]?.placeholders || {};
      
      // 检查无效占位符
      const invalidPlaceholders = foundPlaceholders.filter(
        placeholder => !Object.keys(supportedPlaceholders).includes(placeholder)
      );

      // 检查模板长度
      const isValidLength = template.length > 10 && template.length < 10000;

      res.json({
        success: true,
        data: {
          isValid: invalidPlaceholders.length === 0 && isValidLength,
          foundPlaceholders,
          invalidPlaceholders,
          supportedPlaceholders: Object.keys(supportedPlaceholders),
          errors: [
            ...(!isValidLength ? ['模板长度应在10-10000字符之间'] : []),
            ...(invalidPlaceholders.length > 0 ? [`发现不支持的占位符: ${invalidPlaceholders.join(', ')}`] : [])
          ]
        },
      });
    } catch (error) {
      console.error('验证提示词模板错误:', error);
      res.status(500).json({
        success: false,
        error: '验证提示词模板失败',
      });
    }
  }
}