import { logger } from '../utils/logger';
import { Router } from 'express';
import { WechatController } from '../controllers/wechat.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  parseWechatXML,
  verifyWechatSignature,
  wechatErrorHandler,
  wechatLogger,
} from '../middlewares/wechat.middleware';
import { sourceDetectionMiddleware } from '../middlewares/source-detection.middleware';

const router = Router();

// 创建微信控制器（现在支持未配置的情况）
const wechatController = new WechatController();

// === 完全公开的路由（不需要任何微信验证） ===

// 健康检查
router.get('/health', wechatController.health.bind(wechatController));

// 绑定页面（用户直接访问，不需要任何中间件）
router.get(
  '/binding-page',
  (req, res, next) => {
    logger.info('🔍 绑定页面路由被访问:', {
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      query: req.query,
    });
    next();
  },
  wechatController.getBindingPage.bind(wechatController),
);

// 登录和绑定API（网页调用，不需要微信签名验证）
router.post('/login-and-get-books', wechatController.loginAndGetBooks.bind(wechatController));
router.post('/bind-account', wechatController.bindAccount.bind(wechatController));
router.post('/unbind-account', wechatController.unbindAccount.bind(wechatController));

// === 需要微信签名验证的路由 ===

/**
 * @route GET/POST /api/wechat/callback
 * @desc 微信服务器回调接口
 * @access Public
 */
router.all(
  '/callback',
  wechatLogger,
  verifyWechatSignature,
  parseWechatXML,
  sourceDetectionMiddleware,
  wechatController.callback.bind(wechatController),
);

/**
 * @route GET /api/wechat/verify
 * @desc 微信服务器验证接口
 * @access Public
 */
router.get(
  '/verify',
  wechatLogger,
  verifyWechatSignature,
  wechatController.verify.bind(wechatController),
);

/**
 * @route POST /api/wechat/message
 * @desc 处理微信消息接口
 * @access Public
 */
router.post(
  '/message',
  wechatLogger,
  verifyWechatSignature,
  parseWechatXML,
  sourceDetectionMiddleware,
  wechatController.handleMessage.bind(wechatController),
);

// === 需要身份验证的管理路由 ===

/**
 * @route GET /api/wechat/access-token
 * @desc 获取微信访问令牌
 * @access Private
 */
router.get('/access-token', authenticate, wechatController.getAccessToken.bind(wechatController));

/**
 * @route POST /api/wechat/menu
 * @desc 设置微信自定义菜单
 * @access Private
 */
router.post('/menu', authenticate, wechatController.setMenu.bind(wechatController));

/**
 * @route GET /api/wechat/status
 * @desc 获取微信服务状态
 * @access Private
 */
router.get('/status', authenticate, wechatController.getStatus.bind(wechatController));

/**
 * @route GET /api/wechat/error-stats
 * @desc 获取错误统计
 * @access Private
 */
router.get('/error-stats', authenticate, wechatController.getErrorStats.bind(wechatController));

/**
 * @route POST /api/wechat/cleanup-logs
 * @desc 清理过期日志
 * @access Private
 */
router.post('/cleanup-logs', authenticate, wechatController.cleanupLogs.bind(wechatController));

// === 错误处理 ===

// 应用错误处理中间件
router.use(wechatErrorHandler);

export default router;
