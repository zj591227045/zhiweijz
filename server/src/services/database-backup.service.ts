/**
 * 数据库备份服务
 * 使用pg_dump备份PostgreSQL数据库，并上传到WebDAV
 */

import { logger } from '../utils/logger';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { webdavClientService } from './webdav-client.service';
import { SystemConfigAdminService } from '../admin/services/system-config.admin.service';

export interface WebDAVBackupConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  basePath: string;
  maxBackups?: number; // 最大备份数量，超出后删除最早的备份
}

export interface DatabaseBackupOptions {
  uploadToWebDAV?: boolean;
  keepLocalCopy?: boolean;
  customFileName?: string;
  webdavConfig?: WebDAVBackupConfig; // WebDAV配置（如果提供则使用，否则从系统配置读取）
}

export interface BackupResult {
  success: boolean;
  fileName: string;
  localPath?: string;
  remotePath?: string;
  fileSize: number;
  duration: number;
  error?: string;
}

export class DatabaseBackupService {
  private backupDir: string;

  constructor() {
    // 备份文件存储目录
    this.backupDir = path.join(process.cwd(), 'backups', 'database');
    
    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * 执行数据库备份
   */
  async backup(options: DatabaseBackupOptions = {}): Promise<BackupResult> {
    const startTime = Date.now();
    
    logger.info('[数据库备份] 开始备份...');

    try {
      // 生成备份文件名
      const fileName = options.customFileName || this.generateBackupFileName();
      const localPath = path.join(this.backupDir, fileName);

      // 执行pg_dump
      await this.executePgDump(localPath);

      // 获取文件大小
      const stats = fs.statSync(localPath);
      const fileSize = stats.size;

      logger.info(`[数据库备份] 备份文件已创建: ${localPath} (${this.formatFileSize(fileSize)})`);

      let remotePath: string | undefined;

      // 上传到WebDAV
      if (options.uploadToWebDAV !== false) {
        try {
          remotePath = await this.uploadToWebDAV(localPath, fileName, options.webdavConfig);
          logger.info(`[数据库备份] 已上传到WebDAV: ${remotePath}`);
        } catch (error) {
          logger.error('[数据库备份] WebDAV上传失败:', error);
          // 上传失败不影响备份成功
        }
      }

      // 删除本地文件（如果不需要保留）
      if (!options.keepLocalCopy && remotePath) {
        fs.unlinkSync(localPath);
        logger.info(`[数据库备份] 本地备份文件已删除: ${localPath}`);
      }

      const duration = Date.now() - startTime;

      logger.info(`[数据库备份] 备份完成，耗时: ${duration}ms`);

      return {
        success: true,
        fileName,
        localPath: options.keepLocalCopy || !remotePath ? localPath : undefined,
        remotePath,
        fileSize,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('[数据库备份] 备份失败:', error);

      return {
        success: false,
        fileName: '',
        fileSize: 0,
        duration,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行pg_dump命令并压缩为gzip格式
   * 生成与 backup.sh 脚本兼容的 .sql.gz 格式
   */
  private async executePgDump(outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        reject(new Error('DATABASE_URL环境变量未设置'));
        return;
      }

      // 清理数据库URL，移除pg_dump不支持的查询参数
      const cleanedUrl = this.cleanDatabaseUrl(databaseUrl);

      // 使用pg_dump命令生成plain SQL格式
      // 注意：如果pg_dump版本低于PostgreSQL服务器版本，可能会失败
      // 建议升级pg_dump到与服务器相同或更高的版本
      const pgDump = spawn('pg_dump', [
        cleanedUrl,
        '--format=plain',  // 使用plain格式，生成SQL文本
        '--no-password',
        '--verbose',
        '--no-sync', // 跳过同步，加快备份速度
      ]);

      // 创建gzip压缩流
      const gzipStream = zlib.createGzip({ level: 9 });
      const writeStream = fs.createWriteStream(outputPath);

      let errorOutput = '';

      // 将pg_dump的输出通过gzip压缩后写入文件
      pgDump.stdout.pipe(gzipStream).pipe(writeStream);

      pgDump.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      writeStream.on('finish', () => {
        resolve();
      });

      writeStream.on('error', (error) => {
        reject(new Error(`写入备份文件失败: ${error.message}`));
      });

      pgDump.on('close', (code) => {
        if (code !== 0) {
          // 检查是否是版本不匹配错误
          if (errorOutput.includes('server version mismatch')) {
            reject(new Error(
              `pg_dump版本不匹配错误\n` +
              `${errorOutput}\n\n` +
              `解决方案：\n` +
              `1. 升级本地pg_dump到PostgreSQL 15或更高版本：\n` +
              `   brew upgrade postgresql@15\n` +
              `   brew link postgresql@15 --force\n` +
              `2. 或者使用Docker容器中的pg_dump（推荐用于生产环境）`
            ));
          } else {
            reject(new Error(`pg_dump失败，退出码: ${code}\n${errorOutput}`));
          }
        }
      });

      pgDump.on('error', (error) => {
        reject(new Error(`pg_dump执行失败: ${error.message}`));
      });
    });
  }

  /**
   * 清理数据库URL，移除pg_dump不支持的查询参数
   */
  private cleanDatabaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // pg_dump不支持某些查询参数，如schema
      // 移除所有查询参数，只保留基本的连接信息
      urlObj.search = '';

      return urlObj.toString();
    } catch (error) {
      // 如果URL解析失败，返回原始URL
      logger.warn('[数据库备份] URL解析失败，使用原始URL:', error);
      return url;
    }
  }

  /**
   * 上传到WebDAV
   */
  private async uploadToWebDAV(
    localPath: string,
    fileName: string,
    providedConfig?: WebDAVBackupConfig
  ): Promise<string> {
    // 获取WebDAV配置（优先使用提供的配置）
    const webdavConfig = providedConfig || await this.getWebDAVConfig();

    if (!webdavConfig.enabled) {
      throw new Error('WebDAV备份未启用');
    }

    // 初始化WebDAV客户端
    await webdavClientService.initialize({
      url: webdavConfig.url,
      username: webdavConfig.username,
      password: webdavConfig.password,
      basePath: webdavConfig.basePath,
    });

    // 生成远程路径（直接使用文件名，不创建子目录）
    const remotePath = fileName;

    // 上传文件
    await webdavClientService.uploadFile({
      remotePath,
      localPath,
      overwrite: true,
    });

    // 清理旧备份（如果配置了最大备份数量）
    if (webdavConfig.maxBackups && webdavConfig.maxBackups > 0) {
      await this.cleanupOldBackups(webdavConfig);
    }

    return remotePath;
  }

  /**
   * 清理旧备份文件
   */
  private async cleanupOldBackups(webdavConfig: WebDAVBackupConfig): Promise<void> {
    try {
      // 列出所有数据库备份文件（直接列出基础路径）
      const files = await webdavClientService.listFiles({
        remotePath: '/',
        deep: false,
      });

      // 过滤出备份文件并按时间排序（最新的在前）
      const backupFiles = files
        .filter(f => f.type === 'file' && f.basename.startsWith('zhiweijz_db_'))
        .sort((a, b) => new Date(b.lastmod).getTime() - new Date(a.lastmod).getTime());

      // 如果超出最大数量，删除最早的备份
      const maxBackups = webdavConfig.maxBackups || 7;
      if (backupFiles.length > maxBackups) {
        const filesToDelete = backupFiles.slice(maxBackups);
        logger.info(`[数据库备份] 需要删除 ${filesToDelete.length} 个旧备份`);

        for (const file of filesToDelete) {
          // 直接使用文件名删除
          await webdavClientService.deleteFile(file.basename);
          logger.info(`[数据库备份] 已删除旧备份: ${file.basename}`);
        }
      }
    } catch (error) {
      logger.error('[数据库备份] 清理旧备份失败:', error);
      // 清理失败不影响备份成功
    }
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
   * 生成备份文件名
   */
  private generateBackupFileName(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
    // 使用 .sql.gz 格式，与 backup.sh 脚本保持一致
    return `zhiweijz_db_${timestamp}.sql.gz`;
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

  /**
   * 列出本地备份文件
   */
  listLocalBackups(): Array<{ fileName: string; size: number; createdAt: Date }> {
    const files = fs.readdirSync(this.backupDir);
    
    return files
      .filter(file => file.endsWith('.dump'))
      .map(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          fileName: file,
          size: stats.size,
          createdAt: stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * 恢复数据库（从本地备份文件）
   */
  async restore(backupFilePath: string): Promise<void> {
    logger.info(`[数据库备份] 开始恢复数据库: ${backupFilePath}`);

    return new Promise((resolve, reject) => {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        reject(new Error('DATABASE_URL环境变量未设置'));
        return;
      }

      // 使用pg_restore命令
      const pgRestore = spawn('pg_restore', [
        '--dbname=' + databaseUrl,
        '--clean',
        '--if-exists',
        '--no-owner',
        '--no-acl',
        backupFilePath,
      ]);

      let errorOutput = '';

      pgRestore.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pgRestore.on('close', (code) => {
        if (code === 0) {
          logger.info('[数据库备份] 数据库恢复成功');
          resolve();
        } else {
          reject(new Error(`pg_restore失败，退出码: ${code}\n${errorOutput}`));
        }
      });

      pgRestore.on('error', (error) => {
        reject(new Error(`pg_restore执行失败: ${error.message}`));
      });
    });
  }
}

// 导出单例
export const databaseBackupService = new DatabaseBackupService();

