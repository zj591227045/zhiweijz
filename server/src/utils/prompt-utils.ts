/**
 * 提示词工具函数
 * 用于处理提示词中的占位符替换
 */

/**
 * 替换提示词中的占位符
 * @param template 提示词模板
 * @param variables 变量对象
 * @returns 替换后的提示词
 */
export function replacePromptPlaceholders(template: string, variables: Record<string, any>): string {
  let result = template;
  
  // 替换 {{variable}} 格式的占位符
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(regex, String(value || ''));
  });
  
  return result;
}

/**
 * 智能记账提示词变量接口
 */
export interface SmartAccountingPromptVariables {
  description: string;
  categories?: string;
  budgets?: string;
  currentDate?: string;
}

/**
 * 记账相关性判断提示词变量接口
 */
export interface RelevanceCheckPromptVariables {
  description: string;
}

/**
 * 图片分析提示词变量接口
 */
export interface ImageAnalysisPromptVariables {
  [key: string]: any; // 图片分析暂时不需要变量，但保留扩展性
}

/**
 * 智能记账提示词处理器
 */
export class SmartAccountingPromptProcessor {
  /**
   * 处理记账相关性判断提示词
   * @param template 提示词模板
   * @param variables 变量
   * @returns 处理后的提示词
   */
  static processRelevanceCheckPrompt(
    template: string,
    variables: RelevanceCheckPromptVariables
  ): string {
    return replacePromptPlaceholders(template, variables);
  }

  /**
   * 处理智能记账分析提示词
   * @param template 提示词模板
   * @param variables 变量
   * @returns 处理后的提示词
   */
  static processSmartAccountingPrompt(
    template: string,
    variables: SmartAccountingPromptVariables
  ): string {
    return replacePromptPlaceholders(template, variables);
  }

  /**
   * 处理图片分析提示词
   * @param template 提示词模板
   * @param variables 变量
   * @returns 处理后的提示词
   */
  static processImageAnalysisPrompt(
    template: string,
    variables: ImageAnalysisPromptVariables = {}
  ): string {
    return replacePromptPlaceholders(template, variables);
  }
}

/**
 * 获取所有支持的占位符说明
 * @returns 占位符说明对象
 */
export function getPlaceholderDescriptions() {
  return {
    relevanceCheck: {
      description: '记账相关性判断提示词支持的占位符',
      placeholders: {
        '{{description}}': '用户输入的描述内容'
      }
    },
    smartAccounting: {
      description: '智能记账分析提示词支持的占位符',
      placeholders: {
        '{{categories}}': '动态插入的分类列表',
        '{{budgets}}': '动态插入的预算列表',
        '{{description}}': '用户输入的记账描述',
        '{{currentDate}}': '当前日期 (YYYY-MM-DD 格式)'
      }
    },
    imageAnalysis: {
      description: '图片分析提示词支持的占位符',
      placeholders: {
        // 图片分析暂时不需要占位符，但保留扩展性
        '{{imageType}}': '图片类型（未来可能支持）',
        '{{analysisMode}}': '分析模式（未来可能支持）'
      }
    }
  };
}