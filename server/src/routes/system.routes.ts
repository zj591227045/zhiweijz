import { Router, Request, Response } from 'express';
import { SystemConfigAdminService } from '../admin/services/system-config.admin.service';

const router = Router();
const systemConfigService = new SystemConfigAdminService();

/**
 * @route GET /api/system/registration-status
 * @desc 获取用户注册状态（公共API）
 * @access Public
 */
router.get('/registration-status', async (req: Request, res: Response) => {
  try {
    const enabled = await systemConfigService.getRegistrationStatus();

    res.json({
      success: true,
      data: {
        enabled,
        message: enabled ? '用户注册已开放' : '用户注册已关闭，请联系管理员',
      },
    });
  } catch (error) {
    console.error('获取注册状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取注册状态失败',
    });
  }
});

/**
 * @route GET /api/system/info
 * @desc 获取系统基本信息（公共API）
 * @access Public
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const registrationEnabled = await systemConfigService.getRegistrationStatus();

    res.json({
      success: true,
      data: {
        name: '只为记账',
        version: '1.0.0',
        registrationEnabled,
        isSelfHosted: true, // 标识这是自托管服务器
      },
    });
  } catch (error) {
    console.error('获取系统信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取系统信息失败',
    });
  }
});

export default router;
