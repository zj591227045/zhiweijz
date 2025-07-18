require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableVersionCheck() {
  try {
    console.log('启用版本检查功能...');
    
    // 更新版本检查配置
    await prisma.versionConfig.upsert({
      where: { key: 'version_check_enabled' },
      update: {
        value: 'true',
        description: '启用版本检查功能',
        updatedAt: new Date()
      },
      create: {
        key: 'version_check_enabled',
        value: 'true',
        description: '启用版本检查功能'
      }
    });
    
    console.log('✅ 版本检查功能已启用');
    
    // 检查当前版本数据
    const versions = await prisma.appVersion.findMany({
      where: {
        isEnabled: true,
        publishedAt: { not: null }
      },
      orderBy: { versionCode: 'desc' }
    });
    
    console.log('📋 当前已发布的版本:');
    versions.forEach(v => {
      console.log(`  - ${v.platform}: ${v.version} (版本码: ${v.versionCode})`);
    });
    
    if (versions.length === 0) {
      console.log('⚠️  没有找到已发布的版本，请在管理端创建版本');
    }
    
  } catch (error) {
    console.error('❌ 启用版本检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableVersionCheck();
