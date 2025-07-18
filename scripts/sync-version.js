#!/usr/bin/env node

/**
 * 版本同步脚本
 * 用于同步 Web、iOS、Android 三个平台的版本配置
 */

const fs = require('fs');
const path = require('path');

// 配置
const VERSION = '0.5.1';
const BUILD_NUMBER = '501';

// 文件路径
const WEB_ENV_PATH = path.join(__dirname, '../apps/web/.env.local');
const IOS_PLIST_PATH = path.join(__dirname, '../ios/App/App/Info.plist');
const ANDROID_GRADLE_PATH = path.join(__dirname, '../android/app/build.gradle');

console.log('🔄 开始同步版本配置...');
console.log(`📋 目标版本: ${VERSION} (构建号: ${BUILD_NUMBER})`);

// 1. 更新 Web 配置
function updateWebConfig() {
  console.log('🌐 更新 Web 配置...');
  
  const envContent = `# 应用版本信息
NEXT_PUBLIC_APP_VERSION=${VERSION}
NEXT_PUBLIC_BUILD_NUMBER=${BUILD_NUMBER}

# API配置
# 开发环境: 留空使用相对路径 (http://localhost:3000)
# 生产环境: 设置完整域名 (https://your-domain.com)
NEXT_PUBLIC_API_BASE_URL=

# 生产环境API URL (当需要切换到生产环境时，将上面的值改为这个)
# NEXT_PUBLIC_API_BASE_URL=https://your-domain.com

# 版本管理功能开关
NEXT_PUBLIC_ENABLE_VERSION_CHECK=true

# 版本检查间隔 (毫秒)
NEXT_PUBLIC_VERSION_CHECK_INTERVAL=86400000

# 自动检查开关
NEXT_PUBLIC_AUTO_VERSION_CHECK=true`;

  fs.writeFileSync(WEB_ENV_PATH, envContent, 'utf8');
  console.log('✅ Web 配置已更新');
}

// 2. 更新 iOS 配置
function updateIOSConfig() {
  console.log('🍎 更新 iOS 配置...');
  
  if (!fs.existsSync(IOS_PLIST_PATH)) {
    console.log('⚠️  iOS Info.plist 文件不存在，跳过');
    return;
  }

  let plistContent = fs.readFileSync(IOS_PLIST_PATH, 'utf8');
  
  // 更新版本号
  plistContent = plistContent.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleShortVersionString</key>\n\t<string>${VERSION}</string>`
  );
  
  // 更新构建号
  plistContent = plistContent.replace(
    /<key>CFBundleVersion<\/key>\s*<string>.*?<\/string>/,
    `<key>CFBundleVersion</key>\n\t<string>${BUILD_NUMBER}</string>`
  );
  
  fs.writeFileSync(IOS_PLIST_PATH, plistContent, 'utf8');
  console.log('✅ iOS 配置已更新');
}

// 3. 更新 Android 配置
function updateAndroidConfig() {
  console.log('🤖 更新 Android 配置...');
  
  if (!fs.existsSync(ANDROID_GRADLE_PATH)) {
    console.log('⚠️  Android build.gradle 文件不存在，跳过');
    return;
  }

  let gradleContent = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf8');
  
  // 更新版本名称
  gradleContent = gradleContent.replace(
    /versionName\s+".*?"/,
    `versionName "${VERSION}"`
  );
  
  // 更新版本码
  gradleContent = gradleContent.replace(
    /versionCode\s+\d+/,
    `versionCode ${BUILD_NUMBER}`
  );
  
  fs.writeFileSync(ANDROID_GRADLE_PATH, gradleContent, 'utf8');
  console.log('✅ Android 配置已更新');
}

// 4. 验证配置
function verifyConfig() {
  console.log('🔍 验证配置...');
  
  // 验证 Web 配置
  if (fs.existsSync(WEB_ENV_PATH)) {
    const webContent = fs.readFileSync(WEB_ENV_PATH, 'utf8');
    const hasVersion = webContent.includes(`NEXT_PUBLIC_APP_VERSION=${VERSION}`);
    const hasBuild = webContent.includes(`NEXT_PUBLIC_BUILD_NUMBER=${BUILD_NUMBER}`);
    console.log(`  Web: ${hasVersion && hasBuild ? '✅' : '❌'} 版本配置`);
  }
  
  // 验证 iOS 配置
  if (fs.existsSync(IOS_PLIST_PATH)) {
    const iosContent = fs.readFileSync(IOS_PLIST_PATH, 'utf8');
    const hasVersion = iosContent.includes(`<string>${VERSION}</string>`);
    const hasBuild = iosContent.includes(`<string>${BUILD_NUMBER}</string>`);
    console.log(`  iOS: ${hasVersion && hasBuild ? '✅' : '❌'} 版本配置`);
  }
  
  // 验证 Android 配置
  if (fs.existsSync(ANDROID_GRADLE_PATH)) {
    const androidContent = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf8');
    const hasVersion = androidContent.includes(`versionName "${VERSION}"`);
    const hasBuild = androidContent.includes(`versionCode ${BUILD_NUMBER}`);
    console.log(`  Android: ${hasVersion && hasBuild ? '✅' : '❌'} 版本配置`);
  }
}

// 5. 生成数据库版本记录脚本
function generateDatabaseScript() {
  console.log('📝 生成数据库版本记录脚本...');
  
  const scriptContent = `require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createVersion() {
  try {
    console.log('创建版本记录: ${VERSION} (${BUILD_NUMBER})');
    
    const platforms = ['WEB', 'IOS', 'ANDROID'];
    
    for (const platform of platforms) {
      await prisma.appVersion.upsert({
        where: {
          platform_version: {
            platform,
            version: '${VERSION}'
          }
        },
        update: {
          buildNumber: ${BUILD_NUMBER},
          versionCode: ${BUILD_NUMBER},
          isEnabled: true,
          publishedAt: new Date()
        },
        create: {
          platform,
          version: '${VERSION}',
          buildNumber: ${BUILD_NUMBER},
          versionCode: ${BUILD_NUMBER},
          releaseNotes: '版本 ${VERSION}',
          isEnabled: true,
          publishedAt: new Date()
        }
      });
      
      console.log(\`✅ \${platform} 版本记录已创建/更新\`);
    }
    
    console.log('🎉 数据库版本记录创建完成！');
  } catch (error) {
    console.error('❌ 创建版本记录失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createVersion();`;

  const scriptPath = path.join(__dirname, '../server/scripts/create-current-version.js');
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  console.log('✅ 数据库脚本已生成:', scriptPath);
}

// 执行同步
try {
  updateWebConfig();
  updateIOSConfig();
  updateAndroidConfig();
  verifyConfig();
  generateDatabaseScript();
  
  console.log('');
  console.log('🎉 版本同步完成！');
  console.log('');
  console.log('📋 后续步骤:');
  console.log('1. 运行数据库脚本: cd server && node scripts/create-current-version.js');
  console.log('2. 重启开发服务器');
  console.log('3. 测试版本检查功能');
  console.log('4. 如果是移动端，运行: npx cap sync');
  
} catch (error) {
  console.error('❌ 版本同步失败:', error);
  process.exit(1);
}
