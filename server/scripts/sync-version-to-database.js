#!/usr/bin/env node

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * 从package.json获取当前版本号
 */
function getCurrentVersion() {
  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.error('❌ 无法读取package.json:', error.message);
    process.exit(1);
  }
}

/**
 * 计算版本码
 */
function calculateVersionCode(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return major * 10000 + minor * 100 + patch;
}

/**
 * 同步版本到数据库
 */
async function syncVersionToDatabase() {
  try {
    const version = getCurrentVersion();
    const versionCode = calculateVersionCode(version);
    const buildNumber = versionCode; // 使用相同的数值作为构建号
    
    console.log(`🔄 开始同步版本到数据库: ${version}`);
    console.log(`📱 版本码: ${versionCode}`);
    console.log(`🔨 构建号: ${buildNumber}`);
    
    const platforms = ['WEB', 'IOS', 'ANDROID'];
    const releaseNotes = `版本 ${version} - 功能优化和问题修复`;
    
    for (const platform of platforms) {
      console.log(`\n📱 处理 ${platform} 平台...`);
      
      // 检查是否已存在该版本
      const existingVersion = await prisma.appVersion.findFirst({
        where: {
          platform,
          version
        }
      });
      
      if (existingVersion) {
        console.log(`⚠️  ${platform} 平台的版本 ${version} 已存在，更新记录...`);
        
        await prisma.appVersion.update({
          where: { id: existingVersion.id },
          data: {
            buildNumber,
            versionCode,
            releaseNotes,
            isEnabled: true,
            publishedAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        console.log(`✅ ${platform} 版本记录已更新`);
      } else {
        console.log(`📝 ${platform} 平台创建新版本记录...`);
        
        await prisma.appVersion.create({
          data: {
            platform,
            version,
            buildNumber,
            versionCode,
            releaseNotes,
            isEnabled: true,
            publishedAt: new Date()
          }
        });
        
        console.log(`✅ ${platform} 版本记录已创建`);
      }
    }
    
    console.log('\n🎉 版本同步完成！');
    
    // 显示当前数据库中的版本信息
    console.log('\n📋 当前数据库中的版本信息:');
    const versions = await prisma.appVersion.findMany({
      where: {
        isEnabled: true,
        publishedAt: { not: null }
      },
      orderBy: [
        { platform: 'asc' },
        { versionCode: 'desc' }
      ]
    });
    
    versions.forEach(v => {
      console.log(`  - ${v.platform}: ${v.version} (版本码: ${v.versionCode}, 构建号: ${v.buildNumber})`);
    });
    
  } catch (error) {
    console.error('❌ 同步版本失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行同步
syncVersionToDatabase();
