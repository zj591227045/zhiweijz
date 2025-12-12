import { PrismaClient } from '@prisma/client';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface PerformanceMetric {
  metricType: 'disk' | 'cpu' | 'memory';
  metricValue: number;
  additionalData?: any;
  recordedAt?: Date;
}

export class PerformanceMonitoringService {
  private isEnabled: boolean = true;
  private diskMonitoringInterval: number = 60000; // 1分钟
  private cpuMemoryMonitoringInterval: number = 10000; // 10秒
  private dataRetentionDays: number = 30;

  private diskIntervalId?: NodeJS.Timeout;
  private cpuMemoryIntervalId?: NodeJS.Timeout;

  constructor() {
    this.loadConfiguration();
  }

  /**
   * 加载配置
   */
  private async loadConfiguration() {
    try {
      // 首先确保配置存在，如果不存在则创建默认配置
      await this.ensureDefaultConfigs();

      // 从数据库加载配置
      const configs = await prisma.$queryRaw<Array<{ key: string; value: string }>>`
        SELECT key, value FROM system_configs
        WHERE key IN ('performance_monitoring_enabled', 'performance_data_retention_days',
                     'disk_monitoring_interval_minutes', 'cpu_memory_monitoring_interval_seconds')
      `;

      configs.forEach((config) => {
        switch (config.key) {
          case 'performance_monitoring_enabled':
            this.isEnabled = config.value === 'true';
            break;
          case 'performance_data_retention_days':
            this.dataRetentionDays = parseInt(config.value) || 30;
            break;
          case 'disk_monitoring_interval_minutes':
            this.diskMonitoringInterval = (parseInt(config.value) || 1) * 60000;
            break;
          case 'cpu_memory_monitoring_interval_seconds':
            this.cpuMemoryMonitoringInterval = (parseInt(config.value) || 10) * 1000;
            break;
        }
      });

      console.log(`性能监控配置加载完成 - 启用: ${this.isEnabled}, 数据保留: ${this.dataRetentionDays}天`);
    } catch (error) {
      console.warn('加载性能监控配置失败，使用默认配置:', error);
    }
  }

  /**
   * 确保默认配置存在
   */
  private async ensureDefaultConfigs() {
    const defaultConfigs = [
      {
        key: 'performance_monitoring_enabled',
        value: 'true',
        description: '性能监控开关',
        category: 'performance',
      },
      {
        key: 'performance_data_retention_days',
        value: '30',
        description: '性能数据保留天数',
        category: 'performance',
      },
      {
        key: 'disk_monitoring_interval_minutes',
        value: '1',
        description: '磁盘监控间隔（分钟）',
        category: 'performance',
      },
      {
        key: 'cpu_memory_monitoring_interval_seconds',
        value: '10',
        description: 'CPU和内存监控间隔（秒）',
        category: 'performance',
      },
    ];

    for (const config of defaultConfigs) {
      try {
        await prisma.systemConfig.upsert({
          where: { key: config.key },
          update: {},
          create: {
            key: config.key,
            value: config.value,
            description: config.description,
            category: config.category,
          },
        });
      } catch (error) {
        console.warn(`创建默认配置 ${config.key} 失败:`, error);
      }
    }
  }

  /**
   * 启动性能监控
   */
  async startMonitoring() {
    if (!this.isEnabled) {
      console.log('性能监控已禁用');
      return;
    }

    console.log('启动系统性能监控...');

    // 启动磁盘监控（每分钟）
    this.diskIntervalId = setInterval(async () => {
      try {
        await this.collectDiskMetrics();
      } catch (error) {
        console.error('收集磁盘性能数据失败:', error);
      }
    }, this.diskMonitoringInterval);

    // 启动CPU和内存监控（每10秒）
    this.cpuMemoryIntervalId = setInterval(async () => {
      try {
        await this.collectCpuMetrics();
        await this.collectMemoryMetrics();
      } catch (error) {
        console.error('收集CPU/内存性能数据失败:', error);
      }
    }, this.cpuMemoryMonitoringInterval);

    // 立即收集一次数据
    await this.collectAllMetrics();

    console.log(
      `性能监控已启动 - 磁盘监控间隔: ${this.diskMonitoringInterval / 1000}秒, CPU/内存监控间隔: ${
        this.cpuMemoryMonitoringInterval / 1000
      }秒`,
    );
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (this.diskIntervalId) {
      clearInterval(this.diskIntervalId);
      this.diskIntervalId = undefined;
    }

    if (this.cpuMemoryIntervalId) {
      clearInterval(this.cpuMemoryIntervalId);
      this.cpuMemoryIntervalId = undefined;
    }

    console.log('性能监控已停止');
  }

  /**
   * 收集所有性能指标
   */
  async collectAllMetrics() {
    await Promise.all([
      this.collectDiskMetrics(),
      this.collectCpuMetrics(),
      this.collectMemoryMetrics(),
    ]);
  }

  /**
   * 收集磁盘性能数据
   */
  async collectDiskMetrics() {
    try {
      const diskInfo = await this.getDiskSpaceInfo();

      if (diskInfo && diskInfo.total > 0) {
        const metric: PerformanceMetric = {
          metricType: 'disk',
          metricValue: diskInfo.usagePercent,
          additionalData: {
            total: diskInfo.total,
            used: diskInfo.used,
            free: diskInfo.free,
            drives: diskInfo.drives,
          },
        };

        await this.saveMetric(metric);
      }
    } catch (error) {
      console.error('收集磁盘性能数据失败:', error);
    }
  }

  /**
   * 收集CPU性能数据
   */
  async collectCpuMetrics() {
    try {
      const cpuUsage = await this.getCpuUsage();

      const metric: PerformanceMetric = {
        metricType: 'cpu',
        metricValue: cpuUsage.usage,
        additionalData: {
          loadAverage: cpuUsage.loadAverage,
          coreCount: cpuUsage.coreCount,
        },
      };

      await this.saveMetric(metric);
    } catch (error) {
      console.error('收集CPU性能数据失败:', error);
    }
  }

  /**
   * 收集内存性能数据
   */
  async collectMemoryMetrics() {
    try {
      const memoryInfo = this.getMemoryInfo();

      const metric: PerformanceMetric = {
        metricType: 'memory',
        metricValue: memoryInfo.usagePercent,
        additionalData: {
          total: memoryInfo.total,
          used: memoryInfo.used,
          free: memoryInfo.free,
          process: memoryInfo.process,
        },
      };

      await this.saveMetric(metric);
    } catch (error) {
      console.error('收集内存性能数据失败:', error);
    }
  }

  /**
   * 获取磁盘空间信息
   */
  private async getDiskSpaceInfo() {
    try {
      const platform = os.platform();

      const diskInfo: any = {
        drives: [],
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
      };

      if (platform === 'win32') {
        diskInfo.drives = await this.getWindowsDiskInfo();
      } else {
        diskInfo.drives = await this.getUnixDiskInfo();
      }

      // 计算总计
      diskInfo.total = diskInfo.drives.reduce((sum: number, drive: any) => sum + drive.total, 0);
      diskInfo.used = diskInfo.drives.reduce((sum: number, drive: any) => sum + drive.used, 0);
      diskInfo.free = diskInfo.drives.reduce((sum: number, drive: any) => sum + drive.free, 0);
      diskInfo.usagePercent = diskInfo.total > 0 ? (diskInfo.used / diskInfo.total) * 100 : 0;

      return diskInfo;
    } catch (error) {
      console.error('获取磁盘空间信息错误:', error);
      return {
        drives: [],
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        error: '无法获取磁盘信息',
      };
    }
  }

  /**
   * 获取Windows磁盘信息
   */
  private async getWindowsDiskInfo() {
    const drives = [];

    try {
      const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
      const lines = stdout
        .split('\n')
        .filter((line: string) => line.trim() && !line.includes('Caption'));

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const caption = parts[0];
          const freeSpace = parseInt(parts[1]) || 0;
          const totalSpace = parseInt(parts[2]) || 0;
          const usedSpace = totalSpace - freeSpace;

          if (totalSpace > 0) {
            drives.push({
              drive: caption,
              total: totalSpace,
              used: usedSpace,
              free: freeSpace,
              usagePercent: (usedSpace / totalSpace) * 100,
              filesystem: 'NTFS',
            });
          }
        }
      }
    } catch (error) {
      console.warn('无法使用 wmic 获取磁盘信息:', error);
      // 返回默认驱动器信息
      drives.push({
        drive: 'C:',
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        filesystem: 'NTFS',
        note: '无法获取详细空间信息',
      });
    }

    return drives;
  }

  /**
   * 获取Unix磁盘信息
   */
  private async getUnixDiskInfo() {
    const drives = [];
    const seenFilesystems = new Map(); // 用于去重相同的物理磁盘

    try {
      const { stdout } = await execAsync('df -h');
      const lines = stdout.split('\n').slice(1); // 跳过标题行

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.trim().split(/\s+/);

          if (parts.length >= 6) {
            const filesystem = parts[0];
            const total = this.parseSize(parts[1]);
            const used = this.parseSize(parts[2]);
            const free = this.parseSize(parts[3]);
            const usagePercent = parseFloat(parts[4].replace('%', '')) || 0;
            const mountPoint = parts[5];

            // 过滤掉临时文件系统和虚拟文件系统
            if (
              total > 0 &&
              !filesystem.startsWith('tmpfs') &&
              !filesystem.startsWith('devtmpfs') &&
              !filesystem.startsWith('overlay') &&
              !filesystem.startsWith('shm') &&
              !filesystem.startsWith('map') &&
              !mountPoint.startsWith('/dev') &&
              !mountPoint.startsWith('/sys') &&
              !mountPoint.startsWith('/proc') &&
              mountPoint !== '/dev/shm'
            ) {
              // 对于Docker容器环境，只针对完全相同的文件系统设备进行去重
              // 使用文件系统设备+挂载点+大小作为唯一标识
              const diskKey = `${filesystem}-${mountPoint}-${total}-${used}`;

              if (!seenFilesystems.has(diskKey)) {
                // 优先选择根目录，对于Docker容器中的绑定挂载，使用根目录
                const preferredMountPoint = mountPoint === '/' ? '/' :
                  (mountPoint.startsWith('/etc/') && filesystem.startsWith('/dev/') ? '/' : mountPoint);

                drives.push({
                  drive: preferredMountPoint,
                  total,
                  used,
                  free,
                  usagePercent,
                  filesystem: filesystem.includes('/') ? filesystem.split('/').pop() : filesystem,
                });

                seenFilesystems.set(diskKey, true);
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('无法使用 df 获取磁盘信息:', error);

      // 备用方案：添加根目录
      drives.push({
        drive: '/',
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        filesystem: 'Unknown',
        note: '无法获取详细磁盘信息',
      });
    }

    return drives;
  }

  /**
   * 解析磁盘大小字符串（如 "10G", "500M", "1.5Ti"）
   */
  private parseSize(sizeStr: string): number {
    if (!sizeStr || sizeStr === '-' || sizeStr === '0') return 0;

    const units: { [key: string]: number } = {
      B: 1,
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
      T: 1024 * 1024 * 1024 * 1024,
      P: 1024 * 1024 * 1024 * 1024 * 1024,
    };

    // 支持更多格式：10G, 10Gi, 10GB, 1.5T, 500M 等
    const match = sizeStr.match(/^([\d.]+)([BKMGTPE]?i?B?)$/i);
    if (match) {
      const value = parseFloat(match[1]);
      let unit = match[2].toUpperCase();

      // 处理不同的单位格式
      if (unit.endsWith('IB') || unit.endsWith('I')) {
        unit = unit.charAt(0); // 移除 'iB' 或 'i' 后缀
      } else if (unit.endsWith('B')) {
        unit = unit.charAt(0); // 移除 'B' 后缀
      }

      const multiplier = units[unit] || 1;
      const result = Math.round(value * multiplier);
      return result;
    }

    return 0;
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<{
    usage: number;
    loadAverage: number[];
    coreCount: number;
  }> {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();

      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const cpuPercentage = 100 - ~~((100 * idleDifference) / totalDifference);

        resolve({
          usage: Math.max(0, Math.min(100, cpuPercentage)),
          loadAverage: os.loadavg(),
          coreCount: os.cpus().length,
        });
      }, 1000);
    });
  }

  /**
   * 计算CPU平均值
   */
  private cpuAverage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    return {
      idle: totalIdle / cpus.length,
      total: totalTick / cpus.length,
    };
  }

  /**
   * 获取内存信息
   */
  private getMemoryInfo() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = process.memoryUsage();

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      usagePercent: (usedMemory / totalMemory) * 100,
      process: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
    };
  }

  /**
   * 保存性能指标到数据库
   */
  private async saveMetric(metric: PerformanceMetric) {
    try {
      const additionalDataJson = metric.additionalData
        ? JSON.stringify(metric.additionalData)
        : null;

      await prisma.$executeRaw`
        INSERT INTO system_performance_history (
          metric_type,
          metric_value,
          additional_data,
          recorded_at
        ) VALUES (
          ${metric.metricType},
          ${metric.metricValue},
          ${additionalDataJson}::jsonb,
          ${metric.recordedAt || new Date()}
        )
      `;
    } catch (error) {
      console.error('保存性能指标失败:', error);
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupOldData() {
    try {
      // 删除过期数据
      const result = await prisma.$executeRaw`
        DELETE FROM system_performance_history
        WHERE recorded_at < NOW() - INTERVAL '${this.dataRetentionDays} days'
      `;

      console.log(`清理了 ${result} 条过期性能数据`);

      // 执行 VACUUM 回收空间
      try {
        await prisma.$executeRaw`VACUUM ANALYZE system_performance_history`;
        console.log('已执行 VACUUM，回收表空间');
      } catch (vacuumError) {
        console.warn('VACUUM 执行失败（可能在事务中）:', vacuumError);
      }

      return result;
    } catch (error) {
      console.error('清理过期性能数据失败:', error);
      return 0;
    }
  }

  /**
   * 获取性能历史数据
   */
  async getPerformanceHistory(
    metricType: 'disk' | 'cpu' | 'memory',
    timeRange: 'hour' | 'day' | 'week' | '30days',
    limit: number = 1000,
  ) {
    try {
      let timeCondition = '';
      let groupBy = '';

      switch (timeRange) {
        case 'hour':
          timeCondition = "recorded_at >= NOW() - INTERVAL '1 hour'";
          groupBy = "DATE_TRUNC('minute', recorded_at)";
          break;
        case 'day':
          timeCondition = "recorded_at >= NOW() - INTERVAL '1 day'";
          groupBy = "DATE_TRUNC('hour', recorded_at)";
          break;
        case 'week':
          timeCondition = "recorded_at >= NOW() - INTERVAL '7 days'";
          groupBy = "DATE_TRUNC('hour', recorded_at)";
          break;
        case '30days':
          timeCondition = "recorded_at >= NOW() - INTERVAL '30 days'";
          groupBy = "DATE_TRUNC('day', recorded_at)";
          break;
      }

      const query = `
        SELECT
          ${groupBy} as time_period,
          AVG(metric_value) as avg_value,
          MIN(metric_value) as min_value,
          MAX(metric_value) as max_value,
          COUNT(*) as sample_count
        FROM system_performance_history
        WHERE metric_type = $1 AND ${timeCondition}
        GROUP BY ${groupBy}
        ORDER BY time_period ASC
        LIMIT $2
      `;

      const result = await prisma.$queryRawUnsafe(query, metricType, limit);
      return result;
    } catch (error) {
      console.error('获取性能历史数据失败:', error);
      return [];
    }
  }

  /**
   * 获取性能统计信息
   */
  async getPerformanceStats(metricType: 'disk' | 'cpu' | 'memory', hours: number = 24) {
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT
          AVG(metric_value)::DECIMAL(5,2) as avg_value,
          MIN(metric_value)::DECIMAL(5,2) as min_value,
          MAX(metric_value)::DECIMAL(5,2) as max_value,
          COUNT(*)::BIGINT as sample_count
        FROM system_performance_history
        WHERE metric_type = $1
          AND recorded_at >= NOW() - INTERVAL '$2 hours'
      `, metricType, hours) as Array<{
        avg_value: number;
        min_value: number;
        max_value: number;
        sample_count: bigint;
      }>;

      return (
        result[0] || {
          avg_value: 0,
          min_value: 0,
          max_value: 0,
          sample_count: BigInt(0),
        }
      );
    } catch (error) {
      console.error('获取性能统计信息失败:', error);
      return {
        avg_value: 0,
        min_value: 0,
        max_value: 0,
        sample_count: BigInt(0),
      };
    }
  }
}

// 导出单例实例
export const performanceMonitoringService = new PerformanceMonitoringService();
