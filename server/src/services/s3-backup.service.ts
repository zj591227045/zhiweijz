/**
 * S3备份服务
 * 备份S3对象存储中的文件到WebDAV，支持增量备份
 */

import { logger } from '../utils/logger';
import { FileStorageService } from './file-storage.service';
import { webdavClientService } from './webdav-client.service';
import { SystemConfigAdminService } from '../admin/services/system-config.admin.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface WebDAVBackupConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  basePath: string;
  fullBackupDay?: number; // 每周全备的日期（0-6，0=周日），默认0
  retentionDays?: number; // 保留天数，默认7天
}

export interface S3BackupOptions {
  buckets?: string[]; // 要备份的存储桶，不指定则备份所有
  incremental?: boolean; // 是否增量备份（会根据配置自动判断）
  skipLargeFiles?: boolean; // 是否跳过大文件
  maxFileSize?: number; // 最大文件大小（字节），默认100MB
  webdavConfig?: WebDAVBackupConfig; // WebDAV配置（如果提供则使用，否则从系统配置读取）
  forceFullBackup?: boolean; // 强制全量备份
}

export interface BackupProgress {
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  totalSize: number;
  processedSize: number;
}

export interface S3BackupResult {
  success: boolean;
  buckets: string[];
  progress: BackupProgress;
  duration: number;
  error?: string;
}

export class S3BackupService {
  private tempDir: string;

  constructor() {
    // 临时文件目录（使用系统临时目录，避免触发 nodemon）
    const osTempDir = require('os').tmpdir();
    this.tempDir = path.join(osTempDir, 'zhiweijz-s3-backup');

    // 确保目录存在
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 执行S3备份
   */
  async backup(options: S3BackupOptions = {}): Promise<S3BackupResult> {
    const startTime = Date.now();

    logger.info('[S3备份] 开始备份...');

    try {
      // 初始化WebDAV客户端（需要先初始化以获取配置）
      await this.initializeWebDAV(options.webdavConfig);

      // 获取WebDAV配置
      const webdavConfig = options.webdavConfig || await this.getWebDAVConfig();

      // 判断是否应该执行全量备份
      const shouldFullBackup = this.shouldPerformFullBackup(webdavConfig, options.forceFullBackup);
      const isIncremental = !shouldFullBackup && (options.incremental !== false);

      logger.info(`[S3备份] 备份类型: ${shouldFullBackup ? '全量备份' : '增量备份'}`);

      // 生成备份目录名（带时间戳）
      const backupDirName = this.generateBackupDirName(shouldFullBackup);
      logger.info(`[S3备份] 备份目录: ${backupDirName}`);

      // 获取要备份的存储桶列表
      const buckets = options.buckets || await this.getAllBuckets();

      logger.info(`[S3备份] 将备份以下存储桶: ${buckets.join(', ')}`);

      // 初始化进度
      const progress: BackupProgress = {
        totalFiles: 0,
        processedFiles: 0,
        skippedFiles: 0,
        failedFiles: 0,
        totalSize: 0,
        processedSize: 0,
      };

      // 加载上次备份清单（用于去重和增量备份）
      logger.info('[S3备份] 准备加载上次备份清单...');
      const lastManifest = await this.loadManifest();

      if (lastManifest) {
        logger.info('[S3备份] 成功加载上次备份清单');
      } else {
        logger.info('[S3备份] 没有上次备份清单，将执行完整备份');
      }

      // 当前快照（文件路径 -> hash 映射）
      const currentSnapshot: Record<string, any> = {};

      // 备份每个存储桶
      for (const bucket of buckets) {
        logger.info(`[S3备份] 正在备份存储桶: ${bucket}`);
        await this.backupBucket(bucket, backupDirName, options, progress, lastManifest, currentSnapshot);
      }

      // 保存备份快照
      await this.saveSnapshot(currentSnapshot, backupDirName, shouldFullBackup, progress);

      // 清理过期备份
      if (webdavConfig.retentionDays && webdavConfig.retentionDays > 0) {
        await this.cleanupOldBackups(webdavConfig);
      }

      const duration = Date.now() - startTime;

      logger.info(`[S3备份] 备份完成`);
      logger.info(`  - 备份目录: ${backupDirName}`);
      logger.info(`  - 总文件数: ${progress.totalFiles}`);
      logger.info(`  - 已处理: ${progress.processedFiles}`);
      logger.info(`  - 已跳过: ${progress.skippedFiles}`);
      logger.info(`  - 失败: ${progress.failedFiles}`);
      logger.info(`  - 总大小: ${this.formatFileSize(progress.totalSize)}`);
      logger.info(`  - 耗时: ${duration}ms`);

      return {
        success: true,
        buckets,
        progress,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[S3备份] 备份失败:', error);

      return {
        success: false,
        buckets: [],
        progress: {
          totalFiles: 0,
          processedFiles: 0,
          skippedFiles: 0,
          failedFiles: 0,
          totalSize: 0,
          processedSize: 0,
        },
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 备份单个存储桶（使用内容寻址存储）
   */
  private async backupBucket(
    bucket: string,
    backupDirName: string,
    options: S3BackupOptions,
    progress: BackupProgress,
    lastManifest: any,
    currentSnapshot: Record<string, any>
  ): Promise<void> {
    try {
      // 获取S3服务实例
      const fileStorageService = FileStorageService.getInstance();
      const s3Service = fileStorageService.getS3Service();

      if (!s3Service) {
        throw new Error('S3服务未初始化');
      }

      // 列出存储桶中的所有文件
      const listResult = await s3Service.listFiles(bucket);
      const files = listResult.files;

      progress.totalFiles += files.length;

      for (const file of files) {
        try {
          // 检查文件大小
          if (options.skipLargeFiles && file.Size) {
            const maxSize = options.maxFileSize || 100 * 1024 * 1024; // 默认100MB
            if (file.Size > maxSize) {
              logger.info(`[S3备份] 跳过大文件: ${file.Key} (${this.formatFileSize(file.Size)})`);
              progress.skippedFiles++;
              continue;
            }
          }

          const fileKey = `${bucket}/${file.Key}`;

          // 检查上次备份的文件信息
          let fileHash: string;
          let tempFilePath: string | null = null;

          if (lastManifest && lastManifest.files && lastManifest.files[fileKey]) {
            const lastBackup = lastManifest.files[fileKey];

            // 如果 ETag 未变化，可以复用上次的 hash（不需要重新下载和计算）
            if (lastBackup.etag === file.ETag && lastBackup.hash) {
              fileHash = lastBackup.hash;
              logger.info(`[S3备份] 文件未变化，复用hash: ${fileKey} -> ${fileHash.substring(0, 8)}...`);
            } else {
              // ETag 变化，需要重新下载和计算 hash
              tempFilePath = path.join(this.tempDir, bucket, file.Key!);
              await this.downloadFile(bucket, file.Key!, tempFilePath);
              fileHash = await this.calculateFileHash(tempFilePath);
            }
          } else {
            // 新文件，需要下载和计算 hash
            tempFilePath = path.join(this.tempDir, bucket, file.Key!);
            await this.downloadFile(bucket, file.Key!, tempFilePath);
            fileHash = await this.calculateFileHash(tempFilePath);
          }

          // 检查对象池中是否已存在该 hash 的文件
          const objectPath = `objects/${fileHash}`;
          const objectExists = await this.checkObjectExists(objectPath);

          if (!objectExists) {
            // 对象池中不存在，需要上传

            // 如果还没有下载文件（复用hash的情况），现在需要下载
            if (!tempFilePath) {
              tempFilePath = path.join(this.tempDir, bucket, file.Key!);
              await this.downloadFile(bucket, file.Key!, tempFilePath);
            }

            // 上传到文件池
            await webdavClientService.uploadFile({
              remotePath: objectPath,
              localPath: tempFilePath,
              overwrite: false,
            });

            logger.info(`[S3备份] 新文件已存储: ${fileKey} -> ${fileHash.substring(0, 8)}...`);
            progress.processedFiles++;
          } else {
            logger.info(`[S3备份] 文件已存在，去重: ${fileKey} -> ${fileHash.substring(0, 8)}...`);
            progress.skippedFiles++;
          }

          // 删除临时文件（如果存在）
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }

          // 记录到当前快照
          currentSnapshot[fileKey] = {
            hash: fileHash,
            size: file.Size,
            etag: file.ETag,
            lastModified: file.LastModified,
          };

          progress.processedSize += file.Size || 0;
          progress.totalSize += file.Size || 0;

          logger.info(`[S3备份] 已备份: ${bucket}/${file.Key}`);
        } catch (error) {
          logger.error(`[S3备份] 备份文件失败: ${bucket}/${file.Key}`, error);
          progress.failedFiles++;
        }
      }
    } catch (error) {
      logger.error(`[S3备份] 备份存储桶失败: ${bucket}`, error);
      throw error;
    }
  }

  /**
   * 下载S3文件到本地
   */
  private async downloadFile(bucket: string, key: string, localPath: string): Promise<void> {
    // 确保本地目录存在
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 获取S3服务实例
    const fileStorageService = FileStorageService.getInstance();
    const s3Service = fileStorageService.getS3Service();

    if (!s3Service) {
      throw new Error('S3服务未初始化');
    }

    // 下载文件流
    const fileStream = await s3Service.downloadFile(bucket, key);
    const writeStream = fs.createWriteStream(localPath);

    await new Promise<void>((resolve, reject) => {
      fileStream.pipe(writeStream);
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
      fileStream.on('error', reject);
    });
  }

  /**
   * 获取所有存储桶
   * 排除 temp-files 桶（临时文件不需要备份）
   */
  private async getAllBuckets(): Promise<string[]> {
    // 返回预定义的存储桶列表，排除 temp-files
    return ['avatars', 'transaction-attachments', 'system-files'];
  }

  /**
   * 初始化WebDAV客户端
   */
  private async initializeWebDAV(providedConfig?: WebDAVBackupConfig): Promise<void> {
    const webdavConfig = providedConfig || await this.getWebDAVConfig();

    if (!webdavConfig.enabled) {
      throw new Error('WebDAV备份未启用');
    }

    logger.info('[WebDAV] 客户端已初始化');
    logger.info(`[WebDAV] - URL: ${webdavConfig.url}`);
    logger.info(`[WebDAV] - 用户名: ${webdavConfig.username}`);
    logger.info(`[WebDAV] - 基础路径: ${webdavConfig.basePath}`);

    await webdavClientService.initialize({
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      basePath: webdavConfig.basePath,
    });
  }

  /**
   * 获取WebDAV配置
   */
  private async getWebDAVConfig(): Promise<any> {
    const systemConfigService = new SystemConfigAdminService();
    const config = await systemConfigService.getSystemConfigByKey('webdav_backup');

    if (!config || !config.value) {
      throw new Error('WebDAV备份配置不存在');
    }

    return JSON.parse(config.value);
  }

  /**
   * 判断是否应该执行全量备份
   */
  private shouldPerformFullBackup(webdavConfig: WebDAVBackupConfig, forceFullBackup?: boolean): boolean {
    if (forceFullBackup) {
      return true;
    }

    // 获取当前星期几（0=周日, 1=周一, ..., 6=周六）
    const today = new Date().getDay();
    const fullBackupDay = webdavConfig.fullBackupDay ?? 0; // 默认周日全备

    return today === fullBackupDay;
  }

  /**
   * 生成备份目录名
   */
  private generateBackupDirName(isFullBackup: boolean): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    const prefix = isFullBackup ? 'full' : 'incr';
    return `${prefix}_${timestamp}`;
  }

  /**
   * 计算文件的 SHA256 hash
   */
  private async calculateFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * 检查对象池中是否存在指定 hash 的文件
   */
  private async checkObjectExists(objectPath: string): Promise<boolean> {
    try {
      const exists = await webdavClientService.exists(objectPath);
      logger.info(`[S3备份] 检查对象: ${objectPath} -> ${exists ? '存在' : '不存在'}`);
      return exists;
    } catch (error) {
      logger.info(`[S3备份] 检查对象失败: ${objectPath}`, error);
      return false;
    }
  }

  /**
   * 清理过期备份
   * 保留策略：删除过期快照，然后清理孤立对象
   */
  private async cleanupOldBackups(webdavConfig: WebDAVBackupConfig): Promise<void> {
    try {
      const retentionDays = webdavConfig.retentionDays || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(`[S3备份] 清理 ${retentionDays} 天前的备份（${cutoffDate.toISOString()}之前）`);

      // 列出所有快照文件
      let snapshots;
      try {
        const items = await webdavClientService.listFiles({
          remotePath: 'snapshots',
          deep: false,
        });
        snapshots = items.filter(item =>
          item.type === 'file' &&
          (item.basename.startsWith('full_') || item.basename.startsWith('incr_')) &&
          item.basename.endsWith('.json')
        );
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          logger.info('[S3备份] 快照目录不存在或无权访问，跳过清理');
          return;
        }
        throw error;
      }

      if (snapshots.length === 0) {
        logger.info('[S3备份] 没有找到快照文件');
        return;
      }

      // 过滤出过期的快照
      const expiredSnapshots = snapshots.filter(snapshot => {
        const snapshotDate = new Date(snapshot.lastmod);
        return snapshotDate < cutoffDate;
      });

      if (expiredSnapshots.length === 0) {
        logger.info('[S3备份] 没有需要清理的过期快照');
        // 即使没有过期快照，也执行垃圾回收
        await this.garbageCollectObjects(snapshots);
        return;
      }

      logger.info(`[S3备份] 发现 ${expiredSnapshots.length} 个过期快照`);

      // 删除过期快照
      let deletedCount = 0;
      for (const snapshot of expiredSnapshots) {
        try {
          const snapshotPath = path.posix.join('snapshots', snapshot.basename);
          await webdavClientService.deleteFile(snapshotPath);
          logger.info(`[S3备份] 已删除过期快照: ${snapshot.basename}`);
          deletedCount++;
        } catch (error) {
          logger.error(`[S3备份] 删除快照失败: ${snapshot.basename}`, error);
        }
      }

      logger.info(`[S3备份] 清理完成，共删除 ${deletedCount} 个快照`);

      // 执行垃圾回收，清理孤立对象
      const remainingSnapshots = snapshots.filter(s =>
        !expiredSnapshots.some(es => es.basename === s.basename)
      );
      await this.garbageCollectObjects(remainingSnapshots);

    } catch (error) {
      logger.error('[S3备份] 清理过期备份失败:', error);
      // 清理失败不影响备份成功
    }
  }

  /**
   * 垃圾回收：清理不被任何快照引用的对象
   */
  private async garbageCollectObjects(snapshots: any[]): Promise<void> {
    try {
      logger.info('[S3备份] 开始垃圾回收...');

      // 收集所有快照引用的 hash
      const referencedHashes = new Set<string>();

      for (const snapshot of snapshots) {
        try {
          // 下载快照文件
          const snapshotPath = path.posix.join('snapshots', snapshot.basename);
          const tempSnapshotPath = path.join(this.tempDir, snapshot.basename);

          // 确保临时目录存在
          const tempDir = path.dirname(tempSnapshotPath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }

          await webdavClientService.downloadFile({
            remotePath: snapshotPath,
            localPath: tempSnapshotPath,
          });

          // 解析快照
          const snapshotData = JSON.parse(fs.readFileSync(tempSnapshotPath, 'utf-8'));

          // 收集所有文件的 hash
          if (snapshotData.files) {
            for (const fileInfo of Object.values(snapshotData.files) as any[]) {
              if (fileInfo.hash) {
                referencedHashes.add(fileInfo.hash);
              }
            }
          }

          // 删除临时文件
          fs.unlinkSync(tempSnapshotPath);
        } catch (error) {
          logger.error(`[S3备份] 读取快照失败: ${snapshot.basename}`, error);
        }
      }

      logger.info(`[S3备份] 发现 ${referencedHashes.size} 个被引用的对象`);

      // 列出对象池中的所有对象
      let objects;
      try {
        objects = await webdavClientService.listFiles({
          remotePath: 'objects',
          deep: false,
        });
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          logger.info('[S3备份] 对象池不存在或无权访问，跳过垃圾回收');
          logger.info('[S3备份] 提示：这可能是首次备份，对象池将在下次备份时创建');
          return;
        }
        logger.error('[S3备份] 列出对象池失败:', error);
        return; // 不抛出错误，避免崩溃
      }

      // 找出孤立对象（不被任何快照引用）
      const orphanedObjects = objects.filter(obj =>
        obj.type === 'file' && !referencedHashes.has(obj.basename)
      );

      if (orphanedObjects.length === 0) {
        logger.info('[S3备份] 没有孤立对象需要清理');
        return;
      }

      logger.info(`[S3备份] 发现 ${orphanedObjects.length} 个孤立对象`);

      // 删除孤立对象
      let deletedCount = 0;
      for (const obj of orphanedObjects) {
        try {
          const objectPath = path.posix.join('objects', obj.basename);
          await webdavClientService.deleteFile(objectPath);
          logger.info(`[S3备份] 已删除孤立对象: ${obj.basename.substring(0, 8)}...`);
          deletedCount++;
        } catch (error) {
          logger.error(`[S3备份] 删除对象失败: ${obj.basename}`, error);
        }
      }

      logger.info(`[S3备份] 垃圾回收完成，共删除 ${deletedCount} 个孤立对象`);
    } catch (error) {
      logger.error('[S3备份] 垃圾回收失败:', error);
    }
  }

  /**
   * 从 WebDAV 加载最新的备份快照
   */
  private async loadManifest(): Promise<any> {
    try {
      logger.info('[S3备份] 正在从 WebDAV 加载最新快照...');

      // 列出所有快照文件
      let snapshots;
      try {
        snapshots = await webdavClientService.listFiles({
          remotePath: 'snapshots',
          deep: false,
        });
      } catch (error: any) {
        if (error.status === 403 || error.status === 404) {
          logger.info('[S3备份] 快照目录不存在，这是首次备份');
          return null;
        }
        throw error;
      }

      // 过滤出快照文件并按时间排序
      const snapshotFiles = snapshots
        .filter(item =>
          item.type === 'file' &&
          (item.basename.startsWith('full_') || item.basename.startsWith('incr_')) &&
          item.basename.endsWith('.json')
        )
        .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

      if (snapshotFiles.length === 0) {
        logger.info('[S3备份] 没有找到快照文件，这是首次备份');
        return null;
      }

      // 下载最新的快照
      const latestSnapshot = snapshotFiles[0];
      const snapshotPath = path.posix.join('snapshots', latestSnapshot.basename);
      const localSnapshotPath = path.join(this.tempDir, latestSnapshot.basename);

      logger.info(`[S3备份] 下载最新快照: ${latestSnapshot.basename}`);

      await webdavClientService.downloadFile({
        remotePath: snapshotPath,
        localPath: localSnapshotPath,
      });

      // 解析快照
      const content = fs.readFileSync(localSnapshotPath, 'utf-8');
      const manifest = JSON.parse(content);

      logger.info(`[S3备份] 已加载快照: ${latestSnapshot.basename}`);
      logger.info(`[S3备份] - 备份类型: ${manifest.backupType}`);
      logger.info(`[S3备份] - 备份时间: ${manifest.backupTime}`);
      logger.info(`[S3备份] - 文件数量: ${Object.keys(manifest.files || {}).length}`);

      // 删除临时文件
      fs.unlinkSync(localSnapshotPath);

      return manifest;
    } catch (error) {
      logger.error('[S3备份] 加载备份清单失败:', error);
      return null;
    }
  }

  /**
   * 保存备份快照（索引文件）到 WebDAV
   */
  private async saveSnapshot(
    snapshot: Record<string, any>,
    backupDirName: string,
    isFullBackup: boolean,
    progress: BackupProgress
  ): Promise<void> {
    try {
      const snapshotData = {
        backupType: isFullBackup ? 'full' : 'incremental',
        backupTime: new Date().toISOString(),
        backupDirName,
        progress,
        files: snapshot,
      };

      // 保存到临时文件
      const snapshotFileName = `${backupDirName}.json`;
      const localSnapshotPath = path.join(this.tempDir, snapshotFileName);

      fs.writeFileSync(localSnapshotPath, JSON.stringify(snapshotData, null, 2));
      logger.info('[S3备份] 快照已生成');

      // 上传快照到 WebDAV
      const snapshotPath = path.posix.join('snapshots', snapshotFileName);

      await webdavClientService.uploadFile({
        remotePath: snapshotPath,
        localPath: localSnapshotPath,
        overwrite: true,
      });

      logger.info(`[S3备份] 快照已上传: ${snapshotPath}`);

      // 删除临时文件
      fs.unlinkSync(localSnapshotPath);
    } catch (error) {
      logger.error('[S3备份] 保存备份快照失败:', error);
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}

// 导出单例
export const s3BackupService = new S3BackupService();

