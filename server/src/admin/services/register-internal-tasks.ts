/**
 * 注册所有内部定时任务
 * 将现有的独立定时任务统一注册到内部任务注册表
 */

import { logger } from '../../utils/logger';
import { internalTaskRegistry } from './internal-task-registry';
import { UserDeletionService } from '../../services/user-deletion.service';
import MembershipExpiryCheckTask from '../../tasks/membership-expiry-check.task';
import { WechatMediaService } from '../../services/wechat-media.service';
import { dataAggregationService } from './data-aggregation.service';
import { FileStorageService } from '../../services/file-storage.service';
import { BudgetSchedulerService } from '../../services/budget-scheduler.service';
import { databaseBackupService } from '../../services/database-backup.service';
import { s3BackupService } from '../../services/s3-backup.service';
import { MultiProviderLLMService } from '../../ai/llm/multi-provider-service';

/**
 * 注册所有内部任务
 */
export function registerAllInternalTasks(): void {
  logger.info('[内部任务注册] 开始注册所有内部任务...');

  // 1. 用户注销请求处理任务
  internalTaskRegistry.register({
    key: 'user-deletion-check',
    name: '用户注销请求处理',
    description: '检查并处理过期的用户注销请求，自动删除到期用户数据',
    suggestedCron: '0 0 * * *', // 每天凌晨0点执行
    execute: async () => {
      const userDeletionService = new UserDeletionService();
      await userDeletionService.processExpiredDeletions();
    }
  });

  // 2. 会员到期检查任务
  internalTaskRegistry.register({
    key: 'membership-expiry-check',
    name: '会员到期检查',
    description: '检查并处理到期会员，自动降级会员等级',
    suggestedCron: '30 * * * *', // 每小时第30分钟执行
    execute: async () => {
      const membershipExpiryTask = new MembershipExpiryCheckTask();
      await membershipExpiryTask.checkAllMemberships();
    }
  });

  // 3. 微信媒体文件清理任务
  internalTaskRegistry.register({
    key: 'wechat-media-cleanup',
    name: '微信媒体文件清理',
    description: '清理超过1小时的微信临时媒体文件',
    suggestedCron: '0 * * * *', // 每小时执行一次
    execute: async () => {
      const wechatMediaService = new WechatMediaService();
      
      if (!wechatMediaService.isServiceEnabled()) {
        logger.info('🔒 微信服务未启用，跳过媒体文件清理');
        return;
      }

      logger.info('🗑️ 开始清理微信媒体临时文件...');
      await wechatMediaService.cleanupExpiredFiles();
      logger.info('✅ 微信媒体临时文件清理完成');
    }
  });

  // 4. 数据聚合任务（手动执行，包含每小时和每日）
  internalTaskRegistry.register({
    key: 'data-aggregation-manual',
    name: '数据聚合（手动执行）',
    description: '手动执行数据聚合，包含每小时和每日聚合任务',
    suggestedCron: '0 * * * *', // 每小时执行一次
    execute: async () => {
      await dataAggregationService.runManualAggregation();
    }
  });

  // 6. 对象存储临时文件清理任务
  internalTaskRegistry.register({
    key: 'storage-temp-files-cleanup',
    name: '对象存储临时文件清理',
    description: '清理对象存储中的过期临时文件',
    suggestedCron: '0 2 * * *', // 每天凌晨2点执行
    execute: async () => {
      const fileStorageService = FileStorageService.getInstance();
      
      if (!fileStorageService.isStorageAvailable()) {
        logger.info('🔒 对象存储服务不可用，跳过临时文件清理');
        return;
      }

      logger.info('🗑️ 开始清理对象存储临时文件...');
      const deletedCount = await fileStorageService.cleanupExpiredFiles();
      logger.info(`✅ 对象存储临时文件清理完成，已清理 ${deletedCount} 个文件`);
    }
  });

  // 7. 预算结转和创建任务
  internalTaskRegistry.register({
    key: 'budget-rollover-and-creation',
    name: '预算结转和创建',
    description: '处理过期预算结转，创建新月份预算，清理过期历史记录',
    suggestedCron: '0 2 1 * *', // 每月1号凌晨2点执行
    execute: async () => {
      logger.info('💰 开始执行预算结转和创建任务...');
      const budgetScheduler = new BudgetSchedulerService();
      await budgetScheduler.runAllScheduledTasks();
      logger.info('✅ 预算结转和创建任务完成');
    }
  });

  // 8. 数据库备份任务
  internalTaskRegistry.register({
    key: 'database-backup',
    name: '数据库备份',
    description: '备份PostgreSQL数据库到WebDAV服务器',
    suggestedCron: '0 3 * * *', // 每天凌晨3点执行
    execute: async (config?: any) => {
      logger.info('💾 开始执行数据库备份任务...');

      // 从任务配置中获取WebDAV配置
      const webdavConfig = config?.webdav;
      if (!webdavConfig || !webdavConfig.enabled) {
        throw new Error('WebDAV配置未设置或未启用');
      }

      const result = await databaseBackupService.backup({
        uploadToWebDAV: true,
        keepLocalCopy: false,
        webdavConfig: webdavConfig,
      });

      if (result.success) {
        logger.info(`✅ 数据库备份成功: ${result.fileName} (${result.fileSize} bytes)`);
      } else {
        logger.error(`❌ 数据库备份失败: ${result.error}`);
        throw new Error(result.error);
      }
    }
  });

  // 9. S3对象存储备份任务
  internalTaskRegistry.register({
    key: 's3-backup',
    name: 'S3对象存储备份',
    description: '备份S3对象存储文件到WebDAV服务器（支持增量备份，每周自动全备）',
    suggestedCron: '0 4 * * *', // 每天凌晨4点执行
    execute: async (config?: any) => {
      logger.info('📦 开始执行S3对象存储备份任务...');

      // 从任务配置中获取WebDAV配置
      const webdavConfig = config?.webdav;
      if (!webdavConfig || !webdavConfig.enabled) {
        throw new Error('WebDAV配置未设置或未启用');
      }

      const result = await s3BackupService.backup({
        skipLargeFiles: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB
        webdavConfig: webdavConfig,
        // incremental会根据配置自动判断（每周全备日执行全备，其他时间增备）
      });

      if (result.success) {
        logger.info(`✅ S3备份成功: 处理 ${result.progress.processedFiles}/${result.progress.totalFiles} 个文件`);
      } else {
        logger.error(`❌ S3备份失败: ${result.error}`);
        throw new Error(result.error);
      }
    }
  });

  // 10. LLM提供商健康检查任务
  internalTaskRegistry.register({
    key: 'llm-provider-health-check',
    name: 'LLM提供商健康检查',
    description: '检查所有LLM提供商的健康状态，更新可用性信息',
    suggestedCron: '*/5 * * * *', // 每5分钟执行一次
    execute: async () => {
      logger.info('🔍 开始执行LLM提供商健康检查...');
      const multiProviderService = MultiProviderLLMService.getInstance();
      await multiProviderService.triggerHealthCheck();
      logger.info('✅ LLM提供商健康检查完成');
    }
  });

  // 11. 性能历史记录清理任务
  internalTaskRegistry.register({
    key: 'performance-history-cleanup',
    name: '性能历史记录清理',
    description: '清理30天之前的性能历史数据，释放数据库空间',
    suggestedCron: '0 1 * * *', // 每天凌晨1点执行
    execute: async () => {
      logger.info('🗑️ 开始清理性能历史记录...');
      const { performanceMonitoringService } = await import('../../services/performance-monitoring.service');
      const deletedCount = await performanceMonitoringService.cleanupOldData();
      logger.info(`✅ 性能历史记录清理完成，已删除 ${deletedCount} 条记录`);
    }
  });

  const registeredCount = internalTaskRegistry.size;
  logger.info(`[内部任务注册] 成功注册 ${registeredCount} 个内部任务`);
}

/**
 * 获取所有已注册的内部任务信息
 */
export function getRegisteredTasksInfo(): Array<{
  key: string;
  name: string;
  description: string;
  suggestedCron?: string;
}> {
  return internalTaskRegistry.getAllTasks().map(task => ({
    key: task.key,
    name: task.name,
    description: task.description,
    suggestedCron: task.suggestedCron
  }));
}

