import { Router } from 'express';
import { WechatController } from '../controllers/wechat.controller';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import userSettingRoutes from './user-setting.routes';
import categoryRoutes from './category.routes';
import userCategoryConfigRoutes from './user-category-config.routes';
import transactionRoutes from './transaction.routes';
import tagRoutes from './tag.routes';
import budgetRoutes from './budget.routes';
import categoryBudgetRoutes from './category-budget.routes';
import accountBookRoutes from './account-book.routes';
import familyRoutes from './family.routes';
import statisticsRoutes from './statistics.routes';
import securityRoutes from './security.routes';
import aiRoutes from './ai-routes';
import feedbackRoutes from './feedback.routes';
import systemRoutes from './system.routes';
import systemConfigRoutes from './system-config.routes';
import userAnnouncementRoutes from './user/announcement.routes';
import adminRoutes from '../admin/routes';
import wechatRoutes from './wechat.routes';
import fileStorageRoutes from './file-storage.routes';
import imageRecognitionRoutes from './image-recognition.routes';
import imageProxyRoutes from './image-proxy.routes';

const router = Router();

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-settings', userSettingRoutes);
router.use('/categories', categoryRoutes);
router.use('/user-category-configs', userCategoryConfigRoutes);
router.use('/transactions', transactionRoutes);
router.use('/tags', tagRoutes);
router.use('/budgets', budgetRoutes);
router.use('/category-budgets', categoryBudgetRoutes);
router.use('/account-books', accountBookRoutes);
router.use('/families', familyRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/security', securityRoutes);
router.use('/ai', aiRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/system', systemRoutes);
router.use('/system-config', systemConfigRoutes);
router.use('/user/announcements', userAnnouncementRoutes);
router.use('/file-storage', fileStorageRoutes);
router.use('/image-recognition', imageRecognitionRoutes);
router.use('/image-proxy', imageProxyRoutes);
router.use('/admin', adminRoutes);

// 创建一个独立的微信绑定页面路由，不经过任何微信中间件
router.get('/wechat-binding', (req, res) => {
  console.log('🔍 独立绑定页面被访问:', {
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    query: req.query,
  });

  // 检查是否在微信环境中
  const userAgent = req.headers['user-agent'] || '';
  const isWechatBrowser = /MicroMessenger/i.test(userAgent);

  if (!isWechatBrowser) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>访问限制</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">🚫</div>
              <h1>访问受限</h1>
              <p>此页面仅限在微信中访问</p>
              <p>请在微信中打开此链接</p>
          </div>
      </body>
      </html>
    `);
  }

  // 读取并返回绑定页面
  const fs = require('fs');
  const path = require('path');

  const htmlPath = path.join(process.cwd(), 'public', 'wechat-binding.html');

  if (!fs.existsSync(htmlPath)) {
    return res.status(404).send('绑定页面不存在');
  }

  let htmlContent = fs.readFileSync(htmlPath, 'utf8');

  // 生成测试用的openid
  const testOpenId = 'wx_' + Date.now();
  htmlContent = htmlContent.replace(
    "return 'test_openid_' + Date.now();",
    `return '${testOpenId}';`,
  );

  // 修复API路径问题
  htmlContent = htmlContent.replace(
    "'/api/wechat/login-and-get-books'",
    "'/api/wechat/login-and-get-books'",
  );
  htmlContent = htmlContent.replace("'/api/wechat/bind-account'", "'/api/wechat/bind-account'");

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.send(htmlContent);
});

// 旧的微信绑定路由已移除，现在使用 /api/wechat/login-and-get-books

router.use('/wechat', wechatRoutes);

export default router;
