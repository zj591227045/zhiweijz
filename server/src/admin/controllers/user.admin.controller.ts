import { Request, Response } from 'express';
import { UserAdminService } from '../services/user.admin.service';
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from '../validators/user.validator';

export class UserAdminController {
  private userAdminService: UserAdminService;

  constructor() {
    this.userAdminService = new UserAdminService();
  }

  /**
   * 获取用户列表
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        status,
        sort = 'createdAt',
        order = 'desc'
      } = req.query;

      const result = await this.userAdminService.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        status: status as 'active' | 'inactive',
        sort: sort as string,
        order: order as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户列表失败'
      });
    }
  }

  /**
   * 获取单个用户详情
   */
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userAdminService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error) {
      console.error('获取用户详情错误:', error);
      res.status(500).json({
        success: false,
        message: '获取用户详情失败'
      });
    }
  }

  /**
   * 创建用户
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validation = CreateUserSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: validation.error.errors
        });
        return;
      }

      const user = await this.userAdminService.createUser(validation.data);

      res.status(201).json({
        success: true,
        data: { user },
        message: '用户创建成功'
      });
    } catch (error) {
      console.error('创建用户错误:', error);
      if (error instanceof Error && error.message.includes('已存在')) {
        res.status(409).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '创建用户失败'
        });
      }
    }
  }

  /**
   * 更新用户
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = UpdateUserSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: validation.error.errors
        });
        return;
      }

      const user = await this.userAdminService.updateUser(id, validation.data);

      res.json({
        success: true,
        data: { user },
        message: '用户更新成功'
      });
    } catch (error) {
      console.error('更新用户错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '更新用户失败'
        });
      }
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.userAdminService.deleteUser(id);

      res.json({
        success: true,
        message: '用户删除成功'
      });
    } catch (error) {
      console.error('删除用户错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '删除用户失败'
        });
      }
    }
  }

  /**
   * 重置用户密码
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = ResetPasswordSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: validation.error.errors
        });
        return;
      }

      await this.userAdminService.resetPassword(id, validation.data.newPassword);

      res.json({
        success: true,
        message: '密码重置成功'
      });
    } catch (error) {
      console.error('重置密码错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '重置密码失败'
        });
      }
    }
  }

  /**
   * 切换用户状态
   */
  async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userAdminService.toggleUserStatus(id);

      res.json({
        success: true,
        data: { user },
        message: `用户${user.isActive ? '启用' : '禁用'}成功`
      });
    } catch (error) {
      console.error('切换用户状态错误:', error);
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: '切换用户状态失败'
        });
      }
    }
  }

  /**
   * 批量操作用户
   */
  async batchOperation(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, operation } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          message: '用户ID列表不能为空'
        });
        return;
      }

      if (!['activate', 'deactivate', 'delete'].includes(operation)) {
        res.status(400).json({
          success: false,
          message: '不支持的操作类型'
        });
        return;
      }

      const result = await this.userAdminService.batchOperation(userIds, operation);

      res.json({
        success: true,
        data: result,
        message: `批量${operation === 'activate' ? '启用' : operation === 'deactivate' ? '禁用' : '删除'}成功`
      });
    } catch (error) {
      console.error('批量操作错误:', error);
      res.status(500).json({
        success: false,
        message: '批量操作失败'
      });
    }
  }

  /**
   * 获取注册开关状态
   */
  async getRegistrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const isEnabled = await this.userAdminService.getRegistrationStatus();

      res.json({
        success: true,
        data: { isEnabled }
      });
    } catch (error) {
      console.error('获取注册开关状态错误:', error);
      res.status(500).json({
        success: false,
        message: '获取注册开关状态失败'
      });
    }
  }

  /**
   * 切换注册开关
   */
  async toggleRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          message: '参数类型错误'
        });
        return;
      }

      await this.userAdminService.toggleRegistration(enabled);

      res.json({
        success: true,
        message: `用户注册已${enabled ? '开启' : '关闭'}`
      });
    } catch (error) {
      console.error('切换注册开关错误:', error);
      res.status(500).json({
        success: false,
        message: '切换注册开关失败'
      });
    }
  }
} 