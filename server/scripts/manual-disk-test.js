#!/usr/bin/env node

/**
 * 手动测试磁盘信息获取
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

/**
 * 解析磁盘大小字符串（如 "10G", "500M", "1.5Ti"）
 */
function parseSize(sizeStr) {
  if (!sizeStr || sizeStr === '-' || sizeStr === '0') return 0;

  const units = {
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
    
    console.log(`解析大小: "${sizeStr}" -> ${value} * ${multiplier} = ${result}`);
    return result;
  }

  console.warn(`无法解析大小字符串: "${sizeStr}"`);
  return 0;
}

async function getUnixDiskInfo() {
  const drives = [];

  try {
    const { stdout } = await execAsync('df -h');
    console.log('df -h 输出:');
    console.log(stdout);
    console.log('---');
    
    const lines = stdout.split('\n').slice(1); // 跳过标题行

    for (const line of lines) {
      if (line.trim()) {
        const parts = line.trim().split(/\s+/);
        console.log(`处理行: "${line}"`);
        console.log(`分割结果:`, parts);
        
        if (parts.length >= 6) {
          const filesystem = parts[0];
          const total = parseSize(parts[1]);
          const used = parseSize(parts[2]);
          const free = parseSize(parts[3]);
          const usagePercent = parseFloat(parts[4].replace('%', '')) || 0;
          const mountPoint = parts[5];

          console.log(`解析结果: ${filesystem} -> ${mountPoint}`);
          console.log(`  总计: ${total} 字节`);
          console.log(`  已用: ${used} 字节`);
          console.log(`  可用: ${free} 字节`);
          console.log(`  使用率: ${usagePercent}%`);

          // 更宽松的过滤条件
          if (
            total > 0 &&
            !filesystem.startsWith('tmpfs') &&
            !filesystem.startsWith('devtmpfs') &&
            !filesystem.startsWith('overlay') &&
            !filesystem.startsWith('shm') &&
            !mountPoint.startsWith('/dev') &&
            !mountPoint.startsWith('/sys') &&
            !mountPoint.startsWith('/proc') &&
            mountPoint !== '/dev/shm'
          ) {
            drives.push({
              drive: mountPoint,
              total,
              used,
              free,
              usagePercent,
              filesystem: filesystem.includes('/') ? filesystem.split('/').pop() : filesystem,
            });
            console.log(`✅ 添加磁盘: ${mountPoint}`);
          } else {
            console.log(`❌ 跳过磁盘: ${mountPoint} (${filesystem})`);
          }
        }
        console.log('---');
      }
    }

    console.log(`\n最终获取到 ${drives.length} 个磁盘:`);
    drives.forEach((drive, index) => {
      console.log(`${index + 1}. ${drive.drive} (${drive.filesystem})`);
      console.log(`   总计: ${(drive.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   已用: ${(drive.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   可用: ${(drive.free / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`   使用率: ${drive.usagePercent.toFixed(2)}%`);
    });

  } catch (error) {
    console.warn('无法使用 df 获取磁盘信息:', error);
  }

  return drives;
}

async function main() {
  console.log('🔍 手动测试磁盘信息获取...');
  console.log(`操作系统: ${os.platform()}`);
  console.log(`架构: ${os.arch()}`);
  console.log(`当前工作目录: ${process.cwd()}\n`);

  if (os.platform() !== 'win32') {
    const drives = await getUnixDiskInfo();
    
    if (drives.length > 0) {
      // 计算总计
      const total = drives.reduce((sum, drive) => sum + drive.total, 0);
      const used = drives.reduce((sum, drive) => sum + drive.used, 0);
      const free = drives.reduce((sum, drive) => sum + drive.free, 0);
      const usagePercent = total > 0 ? (used / total) * 100 : 0;

      console.log('\n📊 汇总信息:');
      console.log(`总计: ${(total / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`已用: ${(used / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`可用: ${(free / 1024 / 1024 / 1024).toFixed(2)} GB`);
      console.log(`使用率: ${usagePercent.toFixed(2)}%`);
    } else {
      console.log('❌ 没有获取到任何磁盘信息');
    }
  } else {
    console.log('Windows 系统，请使用其他测试方法');
  }
}

// 运行测试
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ 测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 测试失败:', error);
      process.exit(1);
    });
}
