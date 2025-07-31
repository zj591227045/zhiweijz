#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 版本管理脚本
 * 用法: node scripts/update-version.js [版本号]
 * 例如: node scripts/update-version.js 1.2.0
 */

function updateVersion(newVersion) {
    console.log(`🔄 开始更新版本号到: ${newVersion}`);
    
    // 验证版本号格式 (语义化版本)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(newVersion)) {
        console.error('❌ 版本号格式错误！请使用语义化版本格式，如: 1.2.0');
        process.exit(1);
    }
    
    const [major, minor, patch] = newVersion.split('.').map(Number);
    const versionCode = major * 10000 + minor * 100 + patch; // 计算Android versionCode
    
    try {
        // 1. 更新根目录 package.json
        updatePackageJson('./package.json', newVersion);
        
        // 2. 更新 Web 应用 package.json
        updatePackageJson('./apps/web/package.json', newVersion);
        
        // 3. 更新 Android build.gradle
        updateAndroidBuildGradle('./apps/android/app/build.gradle', newVersion, versionCode);
        
        // 4. 更新前端页面中的硬编码版本号
        updateFrontendVersions(newVersion);

        console.log('✅ 版本号更新完成！');
        console.log(`📱 Android versionCode: ${versionCode}`);
        console.log(`📱 Android versionName: ${newVersion}`);
        console.log(`📦 Package version: ${newVersion}`);
        console.log('');
        console.log('📋 后续步骤:');
        console.log('1. 运行数据库同步脚本: cd server && node scripts/sync-version-to-database.js');
        console.log('2. 或者运行迁移管理器: cd server && node migrations/migration-manager.js upgrade');
        console.log('3. 重启开发服务器测试版本更新');
        
    } catch (error) {
        console.error('❌ 更新版本号时出错:', error.message);
        process.exit(1);
    }
}

function updatePackageJson(filePath, version) {
    console.log(`📝 更新 ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  文件不存在: ${filePath}`);
        return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    packageJson.version = version;
    
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ ${filePath} 更新完成`);
}

function updateAndroidBuildGradle(filePath, versionName, versionCode) {
    console.log(`📝 更新 ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  文件不存在: ${filePath}`);
        return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 更新 versionCode
    content = content.replace(
        /versionCode\s+\d+/,
        `versionCode ${versionCode}`
    );
    
    // 更新 versionName
    content = content.replace(
        /versionName\s+"[^"]*"/,
        `versionName "${versionName}"`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath} 更新完成`);
}

function updateEnvFile(filePath, version) {
    console.log(`📝 更新环境变量文件 ${filePath}`);

    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  文件不存在: ${filePath}`);
        return;
    }

    const [major, minor, patch] = version.split('.').map(Number);
    const buildNumber = major * 100 + minor * 10 + patch; // 简化的构建号计算

    let content = fs.readFileSync(filePath, 'utf8');

    // 更新版本号
    content = content.replace(
        /NEXT_PUBLIC_APP_VERSION=[\d.]+/,
        `NEXT_PUBLIC_APP_VERSION=${version}`
    );

    // 更新构建号
    content = content.replace(
        /NEXT_PUBLIC_BUILD_NUMBER=\d+/,
        `NEXT_PUBLIC_BUILD_NUMBER=${buildNumber}`
    );

    fs.writeFileSync(filePath, content);
    console.log(`✅ ${filePath} 更新完成`);
}

function updateFrontendVersions(version) {
    console.log('📝 更新前端页面版本号');

    // 首先更新环境变量文件
    updateEnvFile('./apps/web/.env.local', version);

    const filesToUpdate = [
        {
            path: './apps/web/src/app/settings/page.tsx',
            patterns: [
                {
                    search: /只为记账 v[\d.]+/g,
                    replace: `只为记账 v${version}`
                }
            ]
        },
        {
            path: './apps/web/src/app/settings/about/page.tsx',
            patterns: [
                {
                    search: /版本 [\d.]+/g,
                    replace: `版本 ${version}`
                },
                {
                    search: /<span className="info-value">[\d.]+<\/span>/g,
                    replace: `<span className="info-value">${version}</span>`
                }
            ]
        },
        {
            path: './apps/web/src/components/admin/AdminSidebar.tsx',
            patterns: [
                {
                    search: /<p className="mt-1">v[\d.]+<\/p>/g,
                    replace: `<p className="mt-1">v${version}</p>`
                }
            ]
        }
    ];
    
    filesToUpdate.forEach(fileInfo => {
        if (!fs.existsSync(fileInfo.path)) {
            console.warn(`⚠️  文件不存在: ${fileInfo.path}`);
            return;
        }
        
        let content = fs.readFileSync(fileInfo.path, 'utf8');
        let updated = false;
        
        fileInfo.patterns.forEach(pattern => {
            if (pattern.search.test(content)) {
                content = content.replace(pattern.search, pattern.replace);
                updated = true;
            }
        });
        
        if (updated) {
            fs.writeFileSync(fileInfo.path, content);
            console.log(`✅ ${fileInfo.path} 更新完成`);
        } else {
            console.log(`ℹ️  ${fileInfo.path} 无需更新`);
        }
    });
}

function getCurrentVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        return packageJson.version;
    } catch (error) {
        return '未知';
    }
}

function showCurrentVersions() {
    console.log('📋 当前版本信息:');
    
    // 显示 package.json 版本
    try {
        const rootPackage = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        console.log(`📦 根项目版本: ${rootPackage.version}`);
    } catch (error) {
        console.log('📦 根项目版本: 读取失败');
    }
    
    // 显示 Web 应用版本
    try {
        const webPackage = JSON.parse(fs.readFileSync('./apps/web/package.json', 'utf8'));
        console.log(`🌐 Web应用版本: ${webPackage.version}`);
    } catch (error) {
        console.log('🌐 Web应用版本: 读取失败');
    }
    
    // 显示 Android 版本
    try {
        const buildGradle = fs.readFileSync('./apps/android/app/build.gradle', 'utf8');
        const versionCodeMatch = buildGradle.match(/versionCode\s+(\d+)/);
        const versionNameMatch = buildGradle.match(/versionName\s+"([^"]*)"/);
        
        console.log(`📱 Android versionCode: ${versionCodeMatch ? versionCodeMatch[1] : '未找到'}`);
        console.log(`📱 Android versionName: ${versionNameMatch ? versionNameMatch[1] : '未找到'}`);
    } catch (error) {
        console.log('📱 Android版本: 读取失败');
    }
}

// 主程序
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('📋 只为记账版本管理工具\n');
    showCurrentVersions();
    console.log('\n💡 使用方法:');
    console.log('  node scripts/update-version.js [版本号]');
    console.log('  例如: node scripts/update-version.js 1.2.0');
} else {
    const newVersion = args[0];
    updateVersion(newVersion);
} 