#!/usr/bin/env node

/**
 * 性能监控初始化脚本
 * 用于初始化性能监控相关的系统配置
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initPerformanceMonitoringConfig() {
  console.log('🚀 开始初始化性能监控配置...');

  try {
    // 性能监控相关的默认配置
    const configs = [
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

    // 使用 upsert 来插入或更新配置
    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          description: config.description,
          category: config.category,
          updatedAt: new Date(),
        },
        create: {
          key: config.key,
          value: config.value,
          description: config.description,
          category: config.category,
        },
      });
      console.log(`✅ 配置 ${config.key} 已设置为: ${config.value}`);
    }

    console.log('🎉 性能监控配置初始化完成！');
  } catch (error) {
    console.error('❌ 性能监控配置初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initPerformanceMonitoringConfig()
    .then(() => {
      console.log('脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initPerformanceMonitoringConfig };
