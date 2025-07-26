import app from './app';
import config from './config/config';
import { startAggregationService } from './admin/scripts/start-aggregation';
import { connectDatabase, disconnectDatabase } from './config/database';
import { UserDeletionService } from './services/user-deletion.service';
import TaskScheduler from './services/task-scheduler.service';
import WechatMediaCleanupTask from './tasks/wechat-media-cleanup.task';
import { FileStorageService } from './services/file-storage.service';
import { AICallLogAdminService } from './admin/services/ai-call-log.admin.service';
import { performanceMonitoringService } from './services/performance-monitoring.service';

// 连接数据库
connectDatabase();

// 初始化文件存储服务
const initializeFileStorageService = async () => {
  try {
    console.log('初始化文件存储服务...');
    const fileStorageService = new FileStorageService();
    
    // 等待初始化完成
    let retryCount = 0;
    while (!fileStorageService.isStorageAvailable() && retryCount < 20) {
      await new Promise(resolve => setTimeout(resolve, 500));
      retryCount++;
    }
    
    if (fileStorageService.isStorageAvailable()) {
      console.log('✅ 文件存储服务初始化成功');
    } else {
      console.warn('⚠️ 文件存储服务初始化超时，但服务器继续启动');
    }
  } catch (error) {
    console.error('❌ 文件存储服务初始化失败:', error);
  }
};

// 启动服务器
const server = app.listen(config.port, '0.0.0.0', async () => {
  console.log(`服务器已启动，监听地址: 0.0.0.0:${config.port}`);
  console.log(`环境: ${config.env}`);

  // 初始化文件存储服务
  await initializeFileStorageService();

  // 初始化AI调用日志服务
  try {
    const aiCallLogService = new AICallLogAdminService();
    await aiCallLogService.initialize();
    console.log('✅ AI调用日志服务初始化成功');
  } catch (error) {
    console.error('❌ AI调用日志服务初始化失败:', error);
  }

  // 启动数据聚合服务
  startAggregationService().catch(console.error);

  // 启动用户注销定时任务
  const userDeletionService = new UserDeletionService();
  userDeletionService.startScheduledDeletion();

  // 启动任务调度器
  TaskScheduler.start();

  // 启动微信媒体文件清理任务
  if (config.wechat) {
    const wechatCleanupTask = new WechatMediaCleanupTask();
    wechatCleanupTask.start();
  }

  // 启动性能监控服务
  try {
    await performanceMonitoringService.startMonitoring();
    console.log('✅ 性能监控服务启动成功');
  } catch (error) {
    console.error('❌ 性能监控服务启动失败:', error);
  }
});

// 处理进程终止信号
const gracefulShutdown = async () => {
  console.log('正在关闭服务器...');

  // 停止性能监控服务
  try {
    performanceMonitoringService.stopMonitoring();
    console.log('✅ 性能监控服务已停止');
  } catch (error) {
    console.error('❌ 停止性能监控服务失败:', error);
  }

  server.close(async () => {
    console.log('服务器已关闭');
    await disconnectDatabase();
    process.exit(0);
  });
};

// 监听终止信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default server;
