import { z } from 'zod';

export const CreateSystemConfigSchema = z.object({
  key: z
    .string()
    .min(1, '配置键不能为空')
    .max(100, '配置键长度不能超过100字符')
    .regex(/^[a-zA-Z0-9_]+$/, '配置键只能包含字母、数字和下划线'),
  value: z.string().min(0, '配置值不能为空'),
  description: z.string().max(500, '描述长度不能超过500字符').optional(),
  category: z.string().min(1, '分类不能为空').max(50, '分类长度不能超过50字符').default('general'),
});

export const UpdateSystemConfigSchema = z.object({
  value: z.string().min(0, '配置值不能为空').optional(),
  description: z.string().max(500, '描述长度不能超过500字符').optional(),
  category: z.string().min(1, '分类不能为空').max(50, '分类长度不能超过50字符').optional(),
});

export const BatchUpdateSystemConfigSchema = z.object({
  configs: z
    .array(
      z.object({
        key: z.string().min(1, '配置键不能为空'),
        value: z.string().min(0, '配置值不能为空'),
      }),
    )
    .min(1, '配置列表不能为空'),
});

export const LLMConfigSchema = z.object({
  enabled: z.boolean().optional(),
  provider: z.string().min(1, 'LLM提供商不能为空').optional(),
  model: z.string().min(1, 'LLM模型不能为空').optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url('Base URL格式不正确').optional().or(z.literal('')),
  temperature: z.number().min(0, '温度不能小于0').max(2, '温度不能大于2').optional(),
  maxTokens: z
    .number()
    .min(1, 'Max Tokens不能小于1')
    .max(100000, 'Max Tokens不能大于100000')
    .optional(),
});

export const LLMTestConnectionSchema = z.object({
  provider: z.string().min(1, 'LLM提供商不能为空'),
  model: z.string().min(1, 'LLM模型不能为空'),
  apiKey: z.string().min(1, 'API Key不能为空'),
  baseUrl: z.string().url('Base URL格式不正确').optional().or(z.literal('')),
});
