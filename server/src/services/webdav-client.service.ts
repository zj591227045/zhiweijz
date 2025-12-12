/**
 * WebDAV客户端服务
 * 用于连接WebDAV服务器，上传、下载、列出文件等操作
 */

import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

// 动态导入 webdav (ES Module)
// 使用 Function 构造函数绕过 TypeScript 的 import() 转换
let webdavModule: any = null;

async function loadWebDAV() {
  if (!webdavModule) {
    // 使用 Function 构造函数来避免 TypeScript 将 import() 转换为 require()
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    webdavModule = await dynamicImport('webdav');
  }
  return webdavModule;
}

// 类型定义
export interface WebDAVClient {
  exists(path: string): Promise<boolean>;
  putFileContents(path: string, data: Buffer | Readable, options?: any): Promise<boolean>;
  createReadStream(path: string): Promise<Readable>;
  getDirectoryContents(path: string, options?: any): Promise<any[]>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  stat(path: string): Promise<any>;
}

export interface FileStat {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  etag?: string;
  mime?: string;
}

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  basePath?: string; // WebDAV服务器上的基础路径
}

export interface UploadOptions {
  remotePath: string;
  localPath?: string;
  data?: Buffer | Readable;
  overwrite?: boolean;
}

export interface DownloadOptions {
  remotePath: string;
  localPath: string;
}

export interface ListOptions {
  remotePath: string;
  deep?: boolean;
}

export class WebDAVClientService {
  private client: WebDAVClient | null = null;
  private config: WebDAVConfig | null = null;
  private initialized: boolean = false;

  /**
   * 初始化WebDAV客户端
   */
  async initialize(config: WebDAVConfig): Promise<void> {
    this.config = config;

    const webdav = await loadWebDAV();

    // 创建 WebDAV 客户端
    this.client = webdav.createClient(config.url, {
      username: config.username,
      password: config.password,
    });

    this.initialized = true;
    logger.info(`[WebDAV] 客户端已初始化`);
    logger.info(`[WebDAV] - URL: ${config.url}`);
    logger.info(`[WebDAV] - 用户名: ${config.username}`);
    logger.info(`[WebDAV] - 基础路径: ${config.basePath}`);

    // 测试连接
    try {
      const testPath = config.basePath || '/';
      logger.info(`[WebDAV] 测试路径访问: ${testPath}`);
      // 不使用 exists() 方法，使用 getDirectoryContents() 来测试
      await this.client!.getDirectoryContents(testPath, { deep: false });
      logger.info(`[WebDAV] 路径访问测试成功`);
    } catch (error: any) {
      logger.error(`[WebDAV] 初始化后测试失败:`, error.message);
      if (error.response) {
        logger.error(`[WebDAV] - HTTP状态: ${error.status}`);
        logger.error(`[WebDAV] - 重定向URL: ${error.response[Symbol.for('Response internals')]?.url || '未知'}`);
      }
      throw new Error(`WebDAV连接失败: ${error.message}`);
    }
  }

  /**
   * 确保客户端已初始化
   */
  private ensureInitialized(): void {
    if (!this.client || !this.initialized) {
      throw new Error('WebDAV客户端未初始化，请先调用 initialize()');
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    this.ensureInitialized();

    try {
      const basePath = this.config?.basePath || '/';
      logger.info(`[WebDAV] 测试连接到: ${basePath}`);
      // 不使用 exists() 方法，使用 getDirectoryContents() 来测试
      await this.client!.getDirectoryContents(basePath, { deep: false });
      logger.info(`[WebDAV] 连接测试成功`);
      return true;
    } catch (error: any) {
      logger.error('[WebDAV] 连接测试失败:', error);
      if (error.response) {
        logger.error('[WebDAV] 响应状态:', error.status);
        logger.error('[WebDAV] 响应URL:', error.response[Symbol.for('Response internals')]?.url);
      }
      return false;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(options: UploadOptions): Promise<void> {
    this.ensureInitialized();

    // 先获取相对路径的父目录，然后再调用 ensureDirectory
    const remoteDir = path.posix.dirname(options.remotePath);
    const remotePath = this.getFullPath(options.remotePath);

    try {
      // 确保远程目录存在（传入相对路径）
      await this.ensureDirectory(remoteDir);

      // 检查文件是否存在
      // 不使用 exists() 方法，因为某些 WebDAV 服务器对此方法支持不好
      // 如果不允许覆盖，直接尝试上传，让服务器返回错误
      // 或者使用 stat() 方法检查
      if (!options.overwrite) {
        try {
          await this.client!.stat(remotePath);
          // 文件存在
          throw new Error(`文件已存在: ${remotePath}`);
        } catch (error: any) {
          // 文件不存在（404错误），可以继续上传
          if (error.status !== 404) {
            throw error;
          }
        }
      }

      // 上传文件
      if (options.localPath) {
        // 从本地文件上传
        const fileStream = fs.createReadStream(options.localPath);
        await this.client!.putFileContents(remotePath, fileStream, {
          overwrite: options.overwrite,
        });
        logger.info(`[WebDAV] 文件上传成功: ${options.localPath} -> ${remotePath}`);
      } else if (options.data) {
        // 从Buffer或Stream上传
        await this.client!.putFileContents(remotePath, options.data, {
          overwrite: options.overwrite,
        });
        logger.info(`[WebDAV] 数据上传成功: ${remotePath}`);
      } else {
        throw new Error('必须提供localPath或data');
      }
    } catch (error) {
      logger.error('[WebDAV] 上传失败:', error);
      throw error;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(options: DownloadOptions): Promise<void> {
    this.ensureInitialized();

    const remotePath = this.getFullPath(options.remotePath);

    try {
      // 检查远程文件是否存在
      // 不使用 exists() 方法，使用 stat() 方法检查
      try {
        await this.client!.stat(remotePath);
      } catch (error: any) {
        if (error.status === 404) {
          throw new Error(`远程文件不存在: ${remotePath}`);
        }
        throw error;
      }

      // 确保本地目录存在
      const localDir = path.dirname(options.localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      // 下载文件
      const fileStream = await this.client!.createReadStream(remotePath);
      const writeStream = fs.createWriteStream(options.localPath);

      await new Promise<void>((resolve, reject) => {
        fileStream.pipe(writeStream);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
        fileStream.on('error', reject);
      });

      logger.info(`[WebDAV] 文件下载成功: ${remotePath} -> ${options.localPath}`);
    } catch (error) {
      logger.error('[WebDAV] 下载失败:', error);
      throw error;
    }
  }

  /**
   * 列出文件
   */
  async listFiles(options: ListOptions): Promise<FileStat[]> {
    this.ensureInitialized();

    const remotePath = this.getFullPath(options.remotePath);

    try {
      const contents = await this.client!.getDirectoryContents(remotePath, {
        deep: options.deep || false,
      });

      return contents as FileStat[];
    } catch (error) {
      logger.error('[WebDAV] 列出文件失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(remotePath: string): Promise<void> {
    this.ensureInitialized();

    const fullPath = this.getFullPath(remotePath);

    try {
      await this.client!.deleteFile(fullPath);
      logger.info(`[WebDAV] 文件删除成功: ${fullPath}`);
    } catch (error) {
      logger.error('[WebDAV] 删除失败:', error);
      throw error;
    }
  }

  /**
   * 创建目录
   */
  async createDirectory(remotePath: string): Promise<void> {
    this.ensureInitialized();

    const fullPath = this.getFullPath(remotePath);

    try {
      await this.client!.createDirectory(fullPath);
      logger.info(`[WebDAV] 目录创建成功: ${fullPath}`);
    } catch (error) {
      logger.error('[WebDAV] 创建目录失败:', error);
      throw error;
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(remotePath: string): Promise<void> {
    this.ensureInitialized();

    const fullPath = this.getFullPath(remotePath);

    try {
      // 不使用 exists() 方法，因为某些 WebDAV 服务器对此方法支持不好
      // 直接尝试列出目录内容来检查是否存在
      try {
        await this.client!.getDirectoryContents(fullPath, { deep: false });
        // 目录存在，无需创建
        return;
      } catch (error: any) {
        // 目录不存在，继续创建
        if (error.status !== 404) {
          // 如果不是404错误，说明是其他问题，抛出错误
          throw error;
        }
      }

      // 递归创建父目录
      const parentPath = path.posix.dirname(fullPath);
      if (parentPath !== fullPath && parentPath !== '/') {
        // 递归调用时使用内部方法，避免重复添加basePath
        await this.ensureDirectoryInternal(parentPath);
      }

      // 创建目录
      await this.client!.createDirectory(fullPath);
      logger.info(`[WebDAV] 目录已创建: ${fullPath}`);
    } catch (error) {
      logger.error('[WebDAV] 确保目录存在失败:', error);
      throw error;
    }
  }

  /**
   * 内部方法：确保目录存在（使用完整路径，不再添加basePath）
   */
  private async ensureDirectoryInternal(fullPath: string): Promise<void> {
    this.ensureInitialized();

    try {
      // 不使用 exists() 方法，因为某些 WebDAV 服务器对此方法支持不好
      // 直接尝试列出目录内容来检查是否存在
      try {
        await this.client!.getDirectoryContents(fullPath, { deep: false });
        // 目录存在，无需创建
        return;
      } catch (error: any) {
        // 目录不存在，继续创建
        if (error.status !== 404) {
          // 如果不是404错误，说明是其他问题，抛出错误
          throw error;
        }
      }

      // 递归创建父目录
      const parentPath = path.posix.dirname(fullPath);
      if (parentPath !== fullPath && parentPath !== '/') {
        await this.ensureDirectoryInternal(parentPath);
      }

      // 创建目录
      await this.client!.createDirectory(fullPath);
      logger.info(`[WebDAV] 目录已创建: ${fullPath}`);
    } catch (error) {
      logger.error('[WebDAV] 确保目录存在失败:', error);
      throw error;
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(remotePath: string): Promise<boolean> {
    this.ensureInitialized();

    const fullPath = this.getFullPath(remotePath);

    try {
      // 不使用 client.exists() 方法，因为某些 WebDAV 服务器对此方法支持不好
      // 使用 stat() 方法检查
      await this.client!.stat(fullPath);
      return true;
    } catch (error: any) {
      if (error.status === 404) {
        return false;
      }
      logger.error('[WebDAV] 检查文件存在失败:', error);
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(remotePath: string): Promise<FileStat> {
    this.ensureInitialized();

    const fullPath = this.getFullPath(remotePath);

    try {
      const stat = await this.client!.stat(fullPath);
      return stat as FileStat;
    } catch (error) {
      logger.error('[WebDAV] 获取文件信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取完整路径
   */
  private getFullPath(remotePath: string): string {
    const basePath = this.config?.basePath || '/';
    
    // 规范化路径
    let fullPath = path.posix.join(basePath, remotePath);
    
    // 确保路径以/开头
    if (!fullPath.startsWith('/')) {
      fullPath = '/' + fullPath;
    }

    return fullPath;
  }

  /**
   * 获取客户端实例（用于高级操作）
   */
  getClient(): WebDAVClient {
    this.ensureInitialized();
    return this.client!;
  }
}

// 导出单例
export const webdavClientService = new WebDAVClientService();

