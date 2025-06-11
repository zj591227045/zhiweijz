#!/usr/bin/env node

/**
 * 快速构建检查脚本
 * 验证Docker构建前的关键依赖和配置
 */

const fs = require('fs');
const path = require('path');

function checkQuick() {
    console.log('🚀 快速构建检查...\n');
    
    let allGood = true;
    
    // 检查关键文件
    const criticalFiles = [
        'server/Dockerfile',
        'apps/web/Dockerfile', 
        'apps/web/next.config.docker.js',
        'apps/web/src/components/ui/separator.tsx',
        'packages/core/src/index.ts',
        'packages/web/src/index.ts'
    ];
    
    console.log('📋 检查关键文件:');
    criticalFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - 缺失`);
            allGood = false;
        }
    });
    
    // 检查前端依赖
    console.log('\n📋 检查前端依赖:');
    try {
        const webPkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
        if (webPkg.dependencies['lucide-react']) {
            console.log('✅ lucide-react 依赖已添加');
        } else {
            console.log('❌ lucide-react 依赖缺失');
            allGood = false;
        }
    } catch (error) {
        console.log('❌ 无法读取前端package.json');
        allGood = false;
    }
    
    // 检查内部包配置
    console.log('\n📋 检查内部包:');
    try {
        const corePkg = JSON.parse(fs.readFileSync('packages/core/package.json', 'utf8'));
        const webPkg = JSON.parse(fs.readFileSync('packages/web/package.json', 'utf8'));
        
        if (corePkg.name === '@zhiweijz/core') {
            console.log('✅ core包配置正确');
        } else {
            console.log('❌ core包配置错误');
            allGood = false;
        }
        
        if (webPkg.name === '@zhiweijz/web') {
            console.log('✅ web包配置正确');
        } else {
            console.log('❌ web包配置错误');
            allGood = false;
        }
    } catch (error) {
        console.log('❌ 无法读取内部包配置');
        allGood = false;
    }
    
    console.log('\n📋 构建命令:');
    console.log('后端: docker buildx build --platform linux/amd64 --file server/Dockerfile --tag zj591227045/zhiweijz-backend:0.1.6 --load .');
    console.log('前端: docker buildx build --platform linux/amd64 --file apps/web/Dockerfile --tag zj591227045/zhiweijz-frontend:0.1.4 --load .');
    
    console.log('\n' + (allGood ? '🎉 检查通过！可以尝试Docker构建。' : '❌ 发现问题，请修复后再构建。'));
    
    return allGood;
}

if (require.main === module) {
    const success = checkQuick();
    process.exit(success ? 0 : 1);
}

module.exports = { checkQuick }; 