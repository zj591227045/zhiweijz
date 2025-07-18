require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createVersion() {
  try {
    console.log('创建版本记录: 0.5.1 (501)');
    
    const platforms = ['WEB', 'IOS', 'ANDROID'];
    
    for (const platform of platforms) {
      await prisma.appVersion.upsert({
        where: {
          platform_version: {
            platform,
            version: '0.5.1'
          }
        },
        update: {
          buildNumber: 501,
          versionCode: 501,
          isEnabled: true,
          publishedAt: new Date()
        },
        create: {
          platform,
          version: '0.5.1',
          buildNumber: 501,
          versionCode: 501,
          releaseNotes: '版本 0.5.1',
          isEnabled: true,
          publishedAt: new Date()
        }
      });
      
      console.log(`✅ ${platform} 版本记录已创建/更新`);
    }
    
    console.log('🎉 数据库版本记录创建完成！');
  } catch (error) {
    console.error('❌ 创建版本记录失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVersion();