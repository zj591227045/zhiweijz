import { logger } from '../utils/logger';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const fsExists = promisify(fs.exists);
const fsUnlink = promisify(fs.unlink);

export interface AudioConversionResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  originalSize?: number;
  convertedSize?: number;
  duration?: number;
}

/**
 * 音频格式转换服务
 * 使用FFmpeg进行轻量级音频格式转换
 */
export class AudioConversionService {
  private static instance: AudioConversionService;
  private ffmpegPath: string;

  constructor() {
    // 检测FFmpeg路径
    this.ffmpegPath = this.detectFFmpegPath();
  }

  /**
   * 在Windows中查找FFmpeg的实际路径
   */
  private async findFFmpegOnWindows(): Promise<string | null> {
    return new Promise((resolve) => {
      // 使用Windows的where命令查找FFmpeg
      exec('where ffmpeg', (error, stdout, stderr) => {
        if (error) {
          logger.info(`🔍 [音频转换] where命令失败: ${error.message}`);
          resolve(null);
        } else {
          const ffmpegPath = stdout.trim().split('\n')[0]; // 取第一个结果
          logger.info(`🔍 [音频转换] 找到FFmpeg路径: ${ffmpegPath}`);
          resolve(ffmpegPath);
        }
      });
    });
  }

  public static getInstance(): AudioConversionService {
    if (!AudioConversionService.instance) {
      AudioConversionService.instance = new AudioConversionService();
    }
    return AudioConversionService.instance;
  }

  /**
   * 检测FFmpeg路径
   */
  private detectFFmpegPath(): string {
    // 优先使用环境变量
    if (process.env.FFMPEG_PATH) {
      logger.info(`🔍 [音频转换] 使用环境变量FFMPEG_PATH: ${process.env.FFMPEG_PATH}`);
      return process.env.FFMPEG_PATH;
    }

    // Windows常见的FFmpeg路径
    const possiblePaths = [
      'ffmpeg',           // 系统PATH中
      'ffmpeg.exe',       // Windows可执行文件
      'C:\\ffmpeg\\bin\\ffmpeg.exe', // 手动安装路径
      'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe', // Chocolatey路径
      'C:\\Users\\' + (process.env.USERNAME || 'user') + '\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-7.1.1-full_build\\bin\\ffmpeg.exe', // WinGet路径
      '/usr/bin/ffmpeg',  // Linux标准路径
      '/usr/local/bin/ffmpeg', // macOS Homebrew路径
    ];

    logger.info(`🔍 [音频转换] 检测FFmpeg路径，可能的路径:`, possiblePaths);
    logger.info(`🔍 [音频转换] 当前PATH环境变量:`, process.env.PATH);

    // 返回默认路径，让系统自动查找
    return 'ffmpeg';
  }

  /**
   * 检查FFmpeg是否可用
   */
  async checkFFmpegAvailable(): Promise<boolean> {
    // 首先尝试默认路径
    const defaultAvailable = await this.testFFmpegPath(this.ffmpegPath);
    if (defaultAvailable) {
      return true;
    }

    // 如果默认路径不可用，在Windows上尝试查找实际路径
    if (process.platform === 'win32') {
      logger.info(`🔍 [音频转换] 默认路径不可用，尝试查找FFmpeg实际路径...`);
      const actualPath = await this.findFFmpegOnWindows();
      if (actualPath) {
        this.ffmpegPath = actualPath;
        const actualAvailable = await this.testFFmpegPath(actualPath);
        if (actualAvailable) {
          logger.info(`✅ [音频转换] 使用找到的FFmpeg路径: ${actualPath}`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 测试指定路径的FFmpeg是否可用
   */
  private async testFFmpegPath(ffmpegPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      logger.info(`🔍 [音频转换] 测试FFmpeg路径: ${ffmpegPath}`);

      const ffmpeg = spawn(ffmpegPath, ['-version']);
      let output = '';
      let errorOutput = '';

      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on('error', (error) => {
        logger.error(`❌ [音频转换] FFmpeg启动失败 (${ffmpegPath}):`, error.message);
        resolve(false);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          logger.info(`✅ [音频转换] FFmpeg可用 (${ffmpegPath})，版本:`, output.split('\n')[0]);
          resolve(true);
        } else {
          logger.error(`❌ [音频转换] FFmpeg退出码: ${code} (${ffmpegPath})`);
          logger.error(`❌ [音频转换] 错误输出:`, errorOutput);
          resolve(false);
        }
      });

      // 设置超时
      setTimeout(() => {
        logger.error(`❌ [音频转换] FFmpeg检查超时 (${ffmpegPath})`);
        ffmpeg.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * 将AMR格式转换为WAV格式
   * @param inputPath 输入文件路径
   * @param outputPath 输出文件路径（可选，默认自动生成）
   * @returns 转换结果
   */
  async convertAmrToWav(inputPath: string, outputPath?: string): Promise<AudioConversionResult> {
    const startTime = Date.now();
    
    try {
      // 检查输入文件是否存在
      if (!await fsExists(inputPath)) {
        return {
          success: false,
          error: `输入文件不存在: ${inputPath}`,
        };
      }

      // 生成输出文件路径
      if (!outputPath) {
        const dir = path.dirname(inputPath);
        const basename = path.basename(inputPath, path.extname(inputPath));
        outputPath = path.join(dir, `${basename}.wav`);
      }

      // 获取原始文件大小
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      logger.info(`🔄 [音频转换] 开始转换: ${inputPath} → ${outputPath}`);

      // 检查FFmpeg是否可用
      const ffmpegAvailable = await this.checkFFmpegAvailable();
      if (!ffmpegAvailable) {
        return {
          success: false,
          error: 'FFmpeg不可用，请确保已安装FFmpeg并添加到系统PATH中',
        };
      }

      // 执行转换
      const conversionResult = await this.executeConversion(inputPath, outputPath);
      
      if (!conversionResult.success) {
        return conversionResult;
      }

      // 获取转换后文件大小
      const convertedStats = fs.statSync(outputPath);
      const convertedSize = convertedStats.size;
      const duration = Date.now() - startTime;

      logger.info(`✅ [音频转换] 转换完成: ${originalSize}字节 → ${convertedSize}字节 (${duration}ms)`);

      return {
        success: true,
        outputPath,
        originalSize,
        convertedSize,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ [音频转换] 转换失败:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : '音频转换失败',
        duration,
      };
    }
  }

  /**
   * 执行FFmpeg转换命令
   */
  private executeConversion(inputPath: string, outputPath: string): Promise<AudioConversionResult> {
    return new Promise((resolve) => {
      // FFmpeg命令参数：
      // -i: 输入文件
      // -ar 16000: 设置采样率为16kHz（语音识别常用）
      // -ac 1: 设置为单声道
      // -f wav: 输出格式为WAV
      // -y: 覆盖输出文件
      const args = [
        '-i', inputPath,
        '-ar', '16000',  // 采样率16kHz
        '-ac', '1',      // 单声道
        '-f', 'wav',     // WAV格式
        '-y',            // 覆盖输出文件
        outputPath
      ];

      logger.info(`🔄 [音频转换] 执行命令: ${this.ffmpegPath} ${args.join(' ')}`);

      const ffmpeg = spawn(this.ffmpegPath, args);
      let errorOutput = '';

      // 收集错误输出
      ffmpeg.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // 处理进程结束
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            outputPath,
          });
        } else {
          logger.error(`❌ [音频转换] FFmpeg退出码: ${code}`);
          logger.error(`❌ [音频转换] 错误输出:`, errorOutput);
          
          resolve({
            success: false,
            error: `FFmpeg转换失败 (退出码: ${code}): ${errorOutput}`,
          });
        }
      });

      // 处理进程错误
      ffmpeg.on('error', (error) => {
        logger.error(`❌ [音频转换] FFmpeg进程错误:`, error);
        resolve({
          success: false,
          error: `FFmpeg进程启动失败: ${error.message}`,
        });
      });

      // 设置超时（30秒）
      setTimeout(() => {
        ffmpeg.kill();
        resolve({
          success: false,
          error: '音频转换超时（30秒）',
        });
      }, 30000);
    });
  }

  /**
   * 清理临时文件
   */
  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (await fsExists(filePath)) {
        await fsUnlink(filePath);
        logger.info(`🗑️ [音频转换] 清理临时文件: ${filePath}`);
      }
    } catch (error) {
      logger.error(`⚠️ [音频转换] 清理文件失败: ${filePath}`, error);
    }
  }

  /**
   * 获取支持的输入格式
   */
  getSupportedInputFormats(): string[] {
    return ['amr', 'mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg'];
  }

  /**
   * 检查文件格式是否需要转换
   */
  needsConversion(filePath: string, targetFormat: string = 'wav'): boolean {
    const extension = path.extname(filePath).toLowerCase().substring(1);
    return extension !== targetFormat;
  }
}
