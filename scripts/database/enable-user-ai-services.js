/**
 * 为所有用户开启AI服务设置并设置为官方服务
 * 
 * 此脚本用于在生产环境中更新所有用户的AI服务设置：
 * 1. 设置 ai_service_enabled = 'true' (开启AI服务)
 * 2. 设置 ai_service_type = 'official' (使用官方服务)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 为所有用户启用AI服务并设置为官方服务
 */
async function enableUserAIServices() {
  try {
    console.log('🚀 开始为所有用户启用AI服务设置...');

    // 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    });

    console.log(`📊 找到 ${users.length} 个用户`);

    if (users.length === 0) {
      console.log('❌ 没有找到任何用户，脚本结束');
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    // 为每个用户设置AI服务配置
    for (const user of users) {
      try {
        console.log(`\n🔧 处理用户: ${user.name} (${user.email}) - ID: ${user.id}`);

        // 检查用户是否已有AI服务设置
        const existingAIEnabled = await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key: 'ai_service_enabled'
            }
          }
        });

        const existingAIType = await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key: 'ai_service_type'
            }
          }
        });

        // 设置AI服务启用状态
        await prisma.userSetting.upsert({
          where: {
            userId_key: {
              userId: user.id,
              key: 'ai_service_enabled'
            }
          },
          update: {
            value: 'true',
            updatedAt: new Date()
          },
          create: {
            userId: user.id,
            key: 'ai_service_enabled',
            value: 'true'
          }
        });

        // 设置AI服务类型为官方服务
        await prisma.userSetting.upsert({
          where: {
            userId_key: {
              userId: user.id,
              key: 'ai_service_type'
            }
          },
          update: {
            value: 'official',
            updatedAt: new Date()
          },
          create: {
            userId: user.id,
            key: 'ai_service_type',
            value: 'official'
          }
        });

        const aiEnabledAction = existingAIEnabled ? '更新' : '创建';
        const aiTypeAction = existingAIType ? '更新' : '创建';
        
        console.log(`   ✅ ${aiEnabledAction}了AI服务启用设置: ai_service_enabled = true`);
        console.log(`   ✅ ${aiTypeAction}了AI服务类型设置: ai_service_type = official`);
        
        successCount++;

      } catch (userError) {
        const errorMsg = `用户 ${user.email} (ID: ${user.id}) 设置失败: ${userError.message}`;
        console.error(`   ❌ ${errorMsg}`);
        errors.push({
          userId: user.id,
          email: user.email,
          error: userError.message
        });
      }
    }

    // 输出总结报告
    console.log('\n' + '='.repeat(60));
    console.log('📈 执行结果总结:');
    console.log(`✅ 成功处理用户数: ${successCount}`);
    console.log(`⏭️  跳过用户数: ${skipCount}`);
    console.log(`❌ 失败用户数: ${errors.length}`);
    console.log(`📊 总用户数: ${users.length}`);

    if (errors.length > 0) {
      console.log('\n❌ 失败详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.email} (${error.userId}): ${error.error}`);
      });
    }

    console.log('\n🎉 AI服务设置更新完成！');
    
    // 验证设置结果
    console.log('\n🔍 验证设置结果...');
    await verifySettings();

  } catch (error) {
    console.error('❌ 执行脚本时发生错误:', error);
    throw error;
  }
}

/**
 * 验证设置结果
 */
async function verifySettings() {
  try {
    // 统计用户AI设置状况
    const totalUsers = await prisma.user.count();
    
    const enabledCount = await prisma.userSetting.count({
      where: {
        key: 'ai_service_enabled',
        value: 'true'
      }
    });

    const officialTypeCount = await prisma.userSetting.count({
      where: {
        key: 'ai_service_type',
        value: 'official'
      }
    });

    console.log(`📊 验证结果:`);
    console.log(`   总用户数: ${totalUsers}`);
    console.log(`   已启用AI服务的用户: ${enabledCount}`);
    console.log(`   设置为官方服务的用户: ${officialTypeCount}`);
    
    if (enabledCount === totalUsers && officialTypeCount === totalUsers) {
      console.log('✅ 所有用户的AI服务设置已正确配置');
    } else {
      console.log('⚠️  部分用户的AI服务设置可能不完整，请检查');
    }

  } catch (error) {
    console.error('❌ 验证设置时发生错误:', error);
  }
}

/**
 * 查询当前AI设置状态（可选的查询功能）
 */
async function queryCurrentSettings() {
  try {
    console.log('🔍 查询当前AI设置状态...\n');

    // 查询AI服务启用状态统计
    const enabledSettings = await prisma.userSetting.groupBy({
      by: ['value'],
      where: {
        key: 'ai_service_enabled'
      },
      _count: {
        value: true
      }
    });

    // 查询AI服务类型统计
    const typeSettings = await prisma.userSetting.groupBy({
      by: ['value'],
      where: {
        key: 'ai_service_type'
      },
      _count: {
        value: true
      }
    });

    const totalUsers = await prisma.user.count();

    console.log('📈 AI服务启用状态分布:');
    enabledSettings.forEach(setting => {
      console.log(`   ${setting.value}: ${setting._count.value} 用户`);
    });

    console.log('\n📈 AI服务类型分布:');
    typeSettings.forEach(setting => {
      console.log(`   ${setting.value}: ${setting._count.value} 用户`);
    });

    const noSettingsCount = totalUsers - (enabledSettings.reduce((sum, s) => sum + s._count.value, 0));
    if (noSettingsCount > 0) {
      console.log(`\n⚠️  ${noSettingsCount} 个用户没有AI服务设置`);
    }

  } catch (error) {
    console.error('❌ 查询当前设置时发生错误:', error);
  }
}

// 主函数
async function main() {
  try {
    console.log('🎯 用户AI服务设置脚本启动');
    console.log('=' .repeat(60));
    
    // 首先查询当前状态
    await queryCurrentSettings();
    
    console.log('\n' + '='.repeat(60));
    
    // 执行设置更新
    await enableUserAIServices();
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  enableUserAIServices,
  queryCurrentSettings,
  verifySettings
}; 