#!/usr/bin/env node

/**
 * Docker构建验证脚本
 * 用于在本地快速验证Docker构建所需的所有文件和配置
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
    const exists = fs.existsSync(filePath);
    if (exists) {
        log('green', `✅ ${description}: ${filePath}`);
        return true;
    } else {
        log('red', `❌ ${description}: ${filePath} (不存在)`);
        return false;
    }
}

function checkDirectory(dirPath, description) {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    if (exists) {
        log('green', `✅ ${description}: ${dirPath}`);
        return true;
    } else {
        log('red', `❌ ${description}: ${dirPath} (不存在)`);
        return false;
    }
}

function validateJSON(filePath, description) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        log('green', `✅ ${description}: JSON格式正确`);
        return true;
    } catch (error) {
        log('red', `❌ ${description}: JSON格式错误 - ${error.message}`);
        return false;
    }
}

function main() {
    log('blue', '🧪 开始Docker构建验证...\n');
    
    let allPassed = true;
    
    // 检查项目根目录文件
    log('yellow', '📋 检查项目根目录文件:');
    allPassed &= checkFile('package.json', '根目录package.json');
    allPassed &= checkFile('.dockerignore', 'Docker忽略文件');
    allPassed &= validateJSON('package.json', '根目录package.json');
    
    console.log('');
    
    // 检查后端文件
    log('yellow', '📋 检查后端文件结构:');
    allPassed &= checkDirectory('server', '后端目录');
    allPassed &= checkFile('server/package.json', '后端package.json');
    allPassed &= checkFile('server/Dockerfile', '后端Dockerfile');
    allPassed &= checkDirectory('server/src', '后端源码目录');
    allPassed &= checkDirectory('server/prisma', 'Prisma目录');
    allPassed &= checkDirectory('server/scripts', '后端脚本目录');
    allPassed &= checkFile('server/scripts/deployment/start.sh', '启动脚本');
    allPassed &= checkFile('server/tsconfig.json', 'TypeScript配置');
    
    if (fs.existsSync('server/package.json')) {
        allPassed &= validateJSON('server/package.json', '后端package.json');
    }
    
    console.log('');
    
    // 检查前端文件
    log('yellow', '📋 检查前端文件结构:');
    allPassed &= checkDirectory('apps/web', '前端目录');
    allPassed &= checkFile('apps/web/package.json', '前端package.json');
    allPassed &= checkFile('apps/web/Dockerfile', '前端Dockerfile');
    allPassed &= checkFile('apps/web/next.config.docker.js', 'Docker专用Next.js配置');
    allPassed &= checkDirectory('apps/web/src', '前端源码目录');
    allPassed &= checkDirectory('apps/web/public', '前端静态文件目录');
    
    if (fs.existsSync('apps/web/package.json')) {
        allPassed &= validateJSON('apps/web/package.json', '前端package.json');
    }
    
    console.log('');
    
    // 检查Prisma配置
    log('yellow', '📋 检查Prisma配置:');
    if (fs.existsSync('server/prisma/schema.prisma')) {
        const schema = fs.readFileSync('server/prisma/schema.prisma', 'utf8');
        if (schema.includes('generator client')) {
            log('green', '✅ Prisma客户端生成器配置正确');
        } else {
            log('red', '❌ Prisma客户端生成器配置缺失');
            allPassed = false;
        }
        
        if (schema.includes('datasource db')) {
            log('green', '✅ Prisma数据源配置正确');
        } else {
            log('red', '❌ Prisma数据源配置缺失');
            allPassed = false;
        }
    }
    
    console.log('');
    
    // 检查Docker配置
    log('yellow', '📋 检查Docker配置:');
    if (fs.existsSync('.dockerignore')) {
        const dockerignore = fs.readFileSync('.dockerignore', 'utf8');
        if (dockerignore.includes('!server/scripts/')) {
            log('green', '✅ .dockerignore包含后端脚本例外');
        } else {
            log('red', '❌ .dockerignore缺少后端脚本例外');
            allPassed = false;
        }
        
        if (dockerignore.includes('!apps/web/scripts/')) {
            log('green', '✅ .dockerignore包含前端脚本例外');
        } else {
            log('red', '❌ .dockerignore缺少前端脚本例外');
            allPassed = false;
        }
    }
    
    console.log('');
    
    // 生成构建命令
    log('blue', '📋 推荐的Docker构建命令:');
    console.log('');
    log('yellow', '后端构建:');
    console.log('docker buildx build --platform linux/amd64 --file server/Dockerfile --tag zj591227045/zhiweijz-backend:0.1.6 --load .');
    console.log('');
    log('yellow', '前端构建:');
    console.log('docker buildx build --platform linux/amd64 --file apps/web/Dockerfile --tag zj591227045/zhiweijz-frontend:0.1.6 --load .');
    
    console.log('');
    
    // 总结
    if (allPassed) {
        log('green', '🎉 所有验证通过！Docker构建应该能够成功。');
    } else {
        log('red', '❌ 发现问题，请修复后再尝试Docker构建。');
        process.exit(1);
    }
    
    console.log('');
    log('blue', '💡 提示:');
    console.log('- 运行此脚本: node scripts/validate-build.js');
    console.log('- 或者运行: chmod +x scripts/test-docker-build.sh && ./scripts/test-docker-build.sh');
    console.log('- 在每次提交前运行验证，避免构建失败');
}

if (require.main === module) {
    main();
}

module.exports = { checkFile, checkDirectory, validateJSON }; 