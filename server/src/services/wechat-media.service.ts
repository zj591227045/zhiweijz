import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config';

export interface MediaDownloadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

/**
 * 微信媒体文件下载服务
 * 处理语音、图片等媒体文件的下载
 */
export class WechatMediaService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly tempDir: string;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!(config.wechat?.appId && config.wechat?.appSecret);
    
    if (!this.isEnabled) {
      console.warn('⚠️ 微信配置未设置，媒体文件下载功能将被禁用');
      this.appId = '';
      this.appSecret = '';
    } else {
      this.appId = config.wechat!.appId;
      this.appSecret = config.wechat!.appSecret;
    }

    // 设置临时文件目录
    this.tempDir = path.join(process.cwd(), 'temp', 'wechat-media');
    this.ensureTempDir();
  }

  /**
   * 确保临时目录存在
   */
  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取微信访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('微信服务未启用');
    }

    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: this.appId,
          secret: this.appSecret,
        },
        timeout: 10000,
      });

      if (response.data.errcode) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }

      return response.data.access_token;
    } catch (error) {
      console.error('获取微信access_token失败:', error);
      throw error;
    }
  }

  /**
   * 下载微信媒体文件
   * @param mediaId 媒体文件ID
   * @param mediaType 媒体类型 (voice, image, video, thumb)
   */
  async downloadMedia(mediaId: string, mediaType: 'voice' | 'image' | 'video' | 'thumb'): Promise<MediaDownloadResult> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: '微信服务未启用',
      };
    }

    try {
      console.log(`🔄 开始下载微信媒体文件: ${mediaId}, 类型: ${mediaType}`);

      // 获取访问令牌
      const accessToken = await this.getAccessToken();

      // 请求媒体文件
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/media/get', {
        params: {
          access_token: accessToken,
          media_id: mediaId,
        },
        responseType: 'stream',
        timeout: 30000,
      });

      // 检查响应类型
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // 说明返回的是错误信息，不是文件
        const errorData = await this.streamToString(response.data);
        const errorInfo = JSON.parse(errorData);
        return {
          success: false,
          error: `下载媒体文件失败: ${errorInfo.errmsg || '未知错误'}`,
        };
      }

      // 生成文件名
      const fileExt = this.getFileExtension(mediaType, contentType);
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = path.join(this.tempDir, fileName);

      // 保存文件
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => {
          console.log(`✅ 媒体文件下载完成: ${fileName}`);
          resolve({
            success: true,
            filePath,
            fileName,
          });
        });

        writer.on('error', (error) => {
          console.error(`❌ 保存媒体文件失败:`, error);
          resolve({
            success: false,
            error: `保存文件失败: ${error.message}`,
          });
        });
      });
    } catch (error) {
      console.error('下载微信媒体文件失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '下载失败',
      };
    }
  }

  /**
   * 根据媒体类型和内容类型确定文件扩展名
   */
  private getFileExtension(mediaType: string, contentType?: string): string {
    // 根据Content-Type确定扩展名
    if (contentType) {
      const typeMap: Record<string, string> = {
        'audio/amr': 'amr',
        'audio/mp3': 'mp3',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
      };

      for (const [type, ext] of Object.entries(typeMap)) {
        if (contentType.includes(type)) {
          return ext;
        }
      }
    }

    // 根据媒体类型设置默认扩展名
    const defaultExtMap: Record<string, string> = {
      voice: 'amr',
      image: 'jpg',
      video: 'mp4',
      thumb: 'jpg',
    };

    return defaultExtMap[mediaType] || 'bin';
  }

  /**
   * 将流转换为字符串
   */
  private streamToString(stream: any): Promise<string> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ 清理临时文件: ${path.basename(filePath)}`);
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }

  /**
   * 清理过期的临时文件（超过1小时）
   */
  async cleanupExpiredFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ 清理过期文件: ${file}`);
        }
      }
    } catch (error) {
      console.error('清理过期文件失败:', error);
    }
  }

  /**
   * 检查服务是否可用
   */
  isServiceEnabled(): boolean {
    return this.isEnabled;
  }
}