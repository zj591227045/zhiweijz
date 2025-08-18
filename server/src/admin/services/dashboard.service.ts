import { PrismaClient } from '@prisma/client';
import os from 'os';
import * as fs from 'fs';
import { promisify } from 'util';
import { performanceMonitoringService } from '../../services/performance-monitoring.service';

const prisma = new PrismaClient();

export class DashboardService {
  /**
   * 获取北京时间的今日开始时间（UTC时间）
   */
  private getBeijingTodayStart(): Date {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // 设置为北京时间的0点0分0秒
    beijingTime.setUTCHours(0, 0, 0, 0);
    // 转换回UTC时间（减去8小时）
    return new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);
  }

  /**
   * 获取指定天数前的北京时间日期开始时间（UTC时间）
   */
  private getBeijingDateStart(daysAgo: number): Date {
    const now = new Date();
    // 转换为北京时间
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    // 减去指定天数
    beijingTime.setUTCDate(beijingTime.getUTCDate() - daysAgo);
    // 设置为北京时间的0点0分0秒
    beijingTime.setUTCHours(0, 0, 0, 0);
    // 转换回UTC时间（减去8小时）
    return new Date(beijingTime.getTime() - 8 * 60 * 60 * 1000);
  }

  /**
   * 获取概览统计数据
   */
  async getOverviewStats() {
    try {
      const todayStart = this.getBeijingTodayStart();

      // 并行查询各种统计数据
      const [
        totalUsers,
        totalTransactions,
        todayUsers,
        todayTransactions,
        totalAccountBooks,
        activeFamilies,
      ] = await Promise.all([
        // 总用户数
        prisma.user.count(),

        // 总记账记录数
        prisma.transaction.count(),

        // 今日新注册用户数（按北京时间计算）
        prisma.user.count({
          where: {
            createdAt: {
              gte: todayStart,
            },
          },
        }),

        // 今日记账记录数（按北京时间计算）
        prisma.transaction.count({
          where: {
            createdAt: {
              gte: todayStart,
            },
          },
        }),

        // 总账本数
        prisma.accountBook.count(),

        // 活跃家庭数（有成员的家庭）
        prisma.family.count({
          where: {
            members: {
              some: {},
            },
          },
        }),
      ]);

      return {
        totalUsers,
        totalTransactions,
        todayUsers,
        todayTransactions,
        totalAccountBooks,
        activeFamilies,
      };
    } catch (error) {
      console.error('获取概览统计数据错误:', error);
      throw new Error('获取概览统计数据失败');
    }
  }

  /**
   * 获取用户统计数据
   * @param period 时间周期：7d, 30d, 90d
   */
  async getUserStats(period: string) {
    try {
      let days: number;
      switch (period) {
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '7d':
        default:
          days = 7;
      }

      const startDate = this.getBeijingDateStart(days);

      // 获取时间段内每日新注册用户数（按北京时间分组）
      const dailyRegistrations = (await prisma.$queryRaw`
        SELECT 
          DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai') as date,
          COUNT(*) as count
        FROM users 
        WHERE created_at >= ${startDate}
        GROUP BY DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')
        ORDER BY date ASC
      `) as Array<{ date: Date; count: bigint }>;

      // 获取活跃用户数（有记账记录的用户）
      const activeUsers = await prisma.user.count({
        where: {
          transactions: {
            some: {
              createdAt: {
                gte: startDate,
              },
            },
          },
        },
      });

      return {
        period,
        days,
        dailyRegistrations: dailyRegistrations.map((item) => ({
          date: item.date,
          count: Number(item.count),
        })),
        activeUsers,
      };
    } catch (error) {
      console.error('获取用户统计数据错误:', error);
      throw new Error('获取用户统计数据失败');
    }
  }

  /**
   * 获取记账统计数据
   * @param period 时间周期：7d, 30d, 90d
   */
  async getTransactionStats(period: string) {
    try {
      let days: number;
      switch (period) {
        case '30d':
          days = 30;
          break;
        case '90d':
          days = 90;
          break;
        case '7d':
        default:
          days = 7;
      }

      const startDate = this.getBeijingDateStart(days);

      // 获取时间段内每日记账数量（按北京时间分组）
      const dailyTransactions = (await prisma.$queryRaw`
        SELECT 
          DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai') as date,
          COUNT(*) as count,
          SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expense_amount,
          SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) as income_amount
        FROM transactions 
        WHERE created_at >= ${startDate}
        GROUP BY DATE((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai')
        ORDER BY date ASC
      `) as Array<{
        date: Date;
        count: bigint;
        expense_amount: any;
        income_amount: any;
      }>;

      // 获取分类统计（按记账数量排序的前10个分类）
      const categoryStats = (await prisma.$queryRaw`
        SELECT 
          c.name,
          COUNT(t.id) as transaction_count,
          SUM(t.amount) as total_amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.created_at >= ${startDate}
        GROUP BY c.id, c.name
        ORDER BY transaction_count DESC
        LIMIT 10
      `) as Array<{
        name: string;
        transaction_count: bigint;
        total_amount: any;
      }>;

      return {
        period,
        days,
        dailyTransactions: dailyTransactions.map((item) => ({
          date: item.date,
          count: Number(item.count),
          expenseAmount: parseFloat(item.expense_amount || '0'),
          incomeAmount: parseFloat(item.income_amount || '0'),
        })),
        categoryStats: categoryStats.map((item) => ({
          name: item.name,
          transactionCount: Number(item.transaction_count),
          totalAmount: parseFloat(item.total_amount || '0'),
        })),
      };
    } catch (error) {
      console.error('获取记账统计数据错误:', error);
      throw new Error('获取记账统计数据失败');
    }
  }

  /**
   * 获取系统资源使用情况
   */
  async getSystemResources() {
    try {
      // 获取内存使用情况
      const memoryUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;

      // 获取CPU信息
      const cpus = os.cpus();
      const loadAverage = os.loadavg();

      // 获取系统运行时间
      const uptime = os.uptime();
      const processUptime = process.uptime();

      // 获取磁盘空间信息
      const diskInfo = await this.getDiskSpaceInfo();

      return {
        memory: {
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
        },
        cpu: {
          count: cpus.length,
          model: cpus[0]?.model || 'Unknown',
          loadAverage: {
            '1min': loadAverage[0],
            '5min': loadAverage[1],
            '15min': loadAverage[2],
          },
        },
        disk: diskInfo,
        uptime: {
          system: uptime,
          process: processUptime,
        },
        platform: os.platform(),
        nodeVersion: process.version,
      };
    } catch (error) {
      console.error('获取系统资源数据错误:', error);
      throw new Error('获取系统资源数据失败');
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
        // Windows 系统
        diskInfo.drives = await this.getWindowsDiskInfo();
      } else {
        // Unix-like 系统 (Linux, macOS)
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
   * 获取 Windows 系统磁盘信息
   */
  private async getWindowsDiskInfo() {
    const drives = [];

    try {
      // 使用 child_process 执行 wmic 命令获取磁盘信息
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

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
      } catch (wmicError) {
        console.warn('无法使用 wmic 获取磁盘信息:', wmicError);

        // 备用方法：检查常见驱动器
        const driveLetters = ['C:', 'D:', 'E:', 'F:'];
        for (const driveLetter of driveLetters) {
          try {
            await promisify(fs.access)(driveLetter + '\\');
            drives.push({
              drive: driveLetter,
              total: 0,
              used: 0,
              free: 0,
              usagePercent: 0,
              filesystem: 'NTFS',
              note: '无法获取详细空间信息',
            });
          } catch (error) {
            // 驱动器不存在，跳过
            continue;
          }
        }
      }
    } catch (error) {
      console.error('获取 Windows 磁盘信息错误:', error);
    }

    // 如果没有获取到任何驱动器信息，返回当前工作目录的信息
    if (drives.length === 0) {
      const currentDrive = process.cwd().substring(0, 2);
      drives.push({
        drive: currentDrive,
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        filesystem: 'Unknown',
        note: '无法获取磁盘信息',
      });
    }

    return drives;
  }

  /**
   * 获取 Unix-like 系统磁盘信息
   */
  private async getUnixDiskInfo() {
    const drives = [];
    const seenFilesystems = new Map(); // 用于去重相同的物理磁盘

    try {
      // 使用 df 命令获取磁盘信息
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

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
                // 对于相同的物理磁盘进行去重
                // 使用总大小+已用空间+可用空间作为唯一标识（更精确的去重）
                const diskKey = `${total}-${used}-${free}`;

                if (!seenFilesystems.has(diskKey)) {
                  // 优先选择根目录，对于Docker容器中的绑定挂载，统一使用根目录
                  let preferredMountPoint = mountPoint;

                  // Docker容器中的特殊处理
                  if (mountPoint === '/' ||
                      mountPoint.startsWith('/etc/') ||
                      mountPoint.startsWith('/System/Volumes/Data')) {
                    preferredMountPoint = '/';
                  }

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
      } catch (dfError) {
        console.warn('无法使用 df 命令获取磁盘信息:', dfError);

        // 备用方法：返回基本的根目录信息
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
    } catch (error) {
      console.error('获取 Unix 磁盘信息错误:', error);
      drives.push({
        drive: '/',
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0,
        filesystem: 'Unknown',
        error: '无法获取磁盘信息',
      });
    }

    return drives;
  }

  /**
   * 解析磁盘大小字符串 (如 "10G", "500M", "1.5T", "460Gi", "10Ki")
   */
  private parseSize(sizeStr: string): number {
    if (!sizeStr || sizeStr === '-' || sizeStr === '0') return 0;

    // 如果是纯数字字符串，直接返回0（可能是inode数量等）
    if (/^\d+$/.test(sizeStr)) return 0;

    const units: { [key: string]: number } = {
      B: 1,
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
      T: 1024 * 1024 * 1024 * 1024,
      P: 1024 * 1024 * 1024 * 1024 * 1024,
    };

    // 支持更多格式：10G, 10Gi, 10GB, 1.5T, 500M, 460Gi, 10Ki 等
    const match = sizeStr.match(/^([\d.]+)([BKMGTPE]?i?B?)$/i);
    if (match) {
      const value = parseFloat(match[1]);
      let unit = match[2].toUpperCase();

      // 处理不同的单位格式
      if (unit.endsWith('IB')) {
        unit = unit.charAt(0); // 移除 'iB' 后缀，如 "GiB" -> "G"
      } else if (unit.endsWith('I')) {
        unit = unit.charAt(0); // 移除 'i' 后缀，如 "Gi" -> "G"
      } else if (unit.endsWith('B')) {
        unit = unit.charAt(0); // 移除 'B' 后缀，如 "GB" -> "G"
      }

      const multiplier = units[unit] || 1;
      const result = Math.round(value * multiplier);

      return result;
    }

    return 0;
  }

  /**
   * 获取系统性能历史数据
   */
  async getPerformanceHistory(
    metricType: 'disk' | 'cpu' | 'memory',
    timeRange: 'hour' | 'day' | 'week' | '30days',
  ) {
    try {
      const data = (await performanceMonitoringService.getPerformanceHistory(
        metricType,
        timeRange,
        1000,
      )) as Array<{
        time_period: string;
        avg_value: number;
        min_value: number;
        max_value: number;
        sample_count: number;
      }>;

      return {
        metricType,
        timeRange,
        data: data.map((item) => ({
          time: item.time_period,
          avgValue: parseFloat(item.avg_value?.toString() || '0'),
          minValue: parseFloat(item.min_value?.toString() || '0'),
          maxValue: parseFloat(item.max_value?.toString() || '0'),
          sampleCount: Number(item.sample_count || 0),
        })),
      };
    } catch (error) {
      console.error('获取性能历史数据错误:', error);
      throw new Error('获取性能历史数据失败');
    }
  }

  /**
   * 获取性能统计信息
   */
  async getPerformanceStats(metricType: 'disk' | 'cpu' | 'memory', hours: number = 24) {
    try {
      const stats = await performanceMonitoringService.getPerformanceStats(metricType, hours);

      return {
        metricType,
        hours,
        avgValue: parseFloat(stats.avg_value?.toString() || '0'),
        minValue: parseFloat(stats.min_value?.toString() || '0'),
        maxValue: parseFloat(stats.max_value?.toString() || '0'),
        sampleCount: Number(stats.sample_count || 0),
      };
    } catch (error) {
      console.error('获取性能统计信息错误:', error);
      throw new Error('获取性能统计信息失败');
    }
  }

  /**
   * 获取所有性能历史数据（用于仪表盘）
   */
  async getAllPerformanceHistory(timeRange: 'hour' | 'day' | 'week' | '30days') {
    try {
      const [diskHistory, cpuHistory, memoryHistory] = await Promise.all([
        this.getPerformanceHistory('disk', timeRange),
        this.getPerformanceHistory('cpu', timeRange),
        this.getPerformanceHistory('memory', timeRange),
      ]);

      return {
        timeRange,
        disk: diskHistory,
        cpu: cpuHistory,
        memory: memoryHistory,
      };
    } catch (error) {
      console.error('获取所有性能历史数据错误:', error);
      throw new Error('获取所有性能历史数据失败');
    }
  }
}
