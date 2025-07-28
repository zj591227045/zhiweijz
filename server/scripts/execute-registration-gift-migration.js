#!/usr/bin/env node

/**
 * 直接执行注册赠送记账点配置迁移脚本
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function executeRegistrationGiftMigration() {
  try {
    console.log('🚀 开始执行注册赠送记账点配置迁移...\n');

    // 检查配置是否已存在
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key: 'registration_gift_points' }
    });

    if (existingConfig) {
      console.log('📋 配置已存在:');
      console.log(`  - 当前值: ${existingConfig.value}`);
      console.log(`  - 描述: ${existingConfig.description}`);
      console.log(`  - 更新时间: ${existingConfig.updatedAt}\n`);
      
      // 更新配置值为30
      await prisma.systemConfig.update({
        where: { key: 'registration_gift_points' },
        data: {
          value: '30',
          description: '新用户注册时赠送的记账点数量',
          category: 'accounting_points',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ 配置已更新为30点');
    } else {
      console.log('📋 配置不存在，正在创建...');
      
      // 创建新配置
      await prisma.systemConfig.create({
        data: {
          key: 'registration_gift_points',
          value: '30',
          description: '新用户注册时赠送的记账点数量',
          category: 'accounting_points'
        }
      });
      
      console.log('✅ 配置已创建，设置为30点');
    }

    // 验证配置
    const finalConfig = await prisma.systemConfig.findUnique({
      where: { key: 'registration_gift_points' }
    });

    console.log('\n🔍 最终配置验证:');
    console.log(`  - 键: ${finalConfig.key}`);
    console.log(`  - 值: ${finalConfig.value}`);
    console.log(`  - 描述: ${finalConfig.description}`);
    console.log(`  - 分类: ${finalConfig.category}`);
    console.log(`  - 创建时间: ${finalConfig.createdAt}`);
    console.log(`  - 更新时间: ${finalConfig.updatedAt}`);

    console.log('\n🎉 注册赠送记账点配置迁移完成！');
    console.log('新用户注册时将获得30个记账点。');

  } catch (error) {
    console.error('❌ 迁移执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移
if (require.main === module) {
  executeRegistrationGiftMigration()
    .then(() => {
      console.log('\n✅ 迁移成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { executeRegistrationGiftMigration };
