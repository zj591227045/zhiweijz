import { z } from 'zod';

// 创建用户验证模式
export const CreateUserSchema = z.object({
  name: z.string()
    .min(1, '姓名不能为空')
    .max(50, '姓名长度不能超过50个字符'),
  
  email: z.string()
    .email('邮箱格式不正确')
    .max(100, '邮箱长度不能超过100个字符'),
  
  password: z.string()
    .min(6, '密码长度至少6个字符')
    .max(50, '密码长度不能超过50个字符'),
  
  bio: z.string()
    .max(200, '个人简介长度不能超过200个字符')
    .optional()
});

// 更新用户验证模式
export const UpdateUserSchema = z.object({
  name: z.string()
    .min(1, '姓名不能为空')
    .max(50, '姓名长度不能超过50个字符')
    .optional(),
  
  email: z.string()
    .email('邮箱格式不正确')
    .max(100, '邮箱长度不能超过100个字符')
    .optional(),
  
  bio: z.string()
    .max(200, '个人简介长度不能超过200个字符')
    .optional()
});

// 重置密码验证模式
export const ResetPasswordSchema = z.object({
  newPassword: z.string()
    .min(6, '密码长度至少6个字符')
    .max(50, '密码长度不能超过50个字符')
});

// 用户查询参数验证模式
export const UserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['createdAt', 'name', 'email']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

// 批量操作验证模式
export const BatchOperationSchema = z.object({
  userIds: z.array(z.string().uuid('用户ID格式不正确')),
  operation: z.enum(['activate', 'deactivate', 'delete'])
});

// 注册开关验证模式
export const RegistrationToggleSchema = z.object({
  enabled: z.boolean()
}); 