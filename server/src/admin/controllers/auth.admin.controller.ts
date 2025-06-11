import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { generateAdminToken } from '../utils/jwt.admin';
import { AdminService } from '../services/admin.service';

export class AdminAuthController {
  private adminService: AdminService;

  constructor() {
    this.adminService = new AdminService();
  }

  /**
   * 管理员登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
        return;
      }

      // 查找管理员
      const admin = await this.adminService.findByUsername(username);
      if (!admin) {
        res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
        return;
      }

      // 验证密码
      const passwordValid = await bcrypt.compare(password, admin.passwordHash);
      if (!passwordValid) {
        res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
        return;
      }

      // 更新最后登录时间
      await this.adminService.updateLastLogin(admin.id);

      // 生成JWT令牌
      const token = generateAdminToken({
        id: admin.id,
        username: admin.username,
        role: admin.role
      });

      res.json({
        success: true,
        message: '登录成功',
        data: {
          token,
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            lastLoginAt: admin.lastLoginAt
          }
        }
      });
    } catch (error) {
      console.error('管理员登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 检查管理员认证状态
   */
  async checkAuth(req: Request, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      
      if (!adminId) {
        res.status(401).json({
          success: false,
          message: '未认证'
        });
        return;
      }

      const admin = await this.adminService.findById(adminId);
      if (!admin) {
        res.status(401).json({
          success: false,
          message: '管理员不存在'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          admin: {
            id: admin.id,
            username: admin.username,
            email: admin.email,
            role: admin.role,
            lastLoginAt: admin.lastLoginAt
          }
        }
      });
    } catch (error) {
      console.error('检查管理员认证状态错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  /**
   * 管理员登出
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // 由于JWT是无状态的，登出只需要客户端删除token即可
      res.json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      console.error('管理员登出错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
} 