#!/usr/bin/env node

/**
 * Android开发环境测试脚本
 * 验证Android开发所需的依赖和配置是否正确
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 开始检查Android开发环境...\n');

// 检查项目结构
function checkProjectStructure() {
  console.log('📁 检查项目结构...');

  const requiredPaths = [
    'packages/mobile/src',
    'packages/mobile/src/adapters',
    'packages/mobile/src/api',
    'packages/mobile/src/store',
    'packages/mobile/src/navigation',
    'packages/mobile/src/screens/auth',
    'packages/mobile/src/screens/dashboard',
    'apps/android/src',
  ];

  let allExists = true;

  requiredPaths.forEach(p => {
    const fullPath = path.join(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${p}`);
    } else {
      console.log(`  ❌ ${p} - 不存在`);
      allExists = false;
    }
  });

  return allExists;
}

// 检查核心文件
function checkCoreFiles() {
  console.log('\n📄 检查核心文件...');

  const requiredFiles = [
    'packages/mobile/src/index.ts',
    'packages/mobile/src/adapters/storage-adapter.ts',
    'packages/mobile/src/api/api-client.ts',
    'packages/mobile/src/store/auth-store.ts',
    'packages/mobile/src/navigation/app-navigator.tsx',
    'packages/mobile/src/screens/auth/login-screen.tsx',
    'packages/mobile/src/screens/auth/register-screen.tsx',
    'packages/mobile/src/screens/auth/forgot-password-screen.tsx',
    'packages/mobile/src/screens/dashboard/dashboard-screen.tsx',
    'packages/mobile/src/screens/transactions/transaction-list-screen.tsx',
    'packages/mobile/src/screens/transactions/transaction-add-screen.tsx',
    'packages/mobile/src/screens/transactions/transaction-edit-screen.tsx',
    'packages/mobile/src/screens/transactions/transaction-detail-screen.tsx',
    'packages/core/src/store/create-transaction-store.ts',
    'packages/core/src/store/create-category-store.ts',
    'packages/core/src/store/create-budget-store.ts',
    'apps/android/src/App.tsx',
    'apps/android/src/theme.ts',
    'apps/android/index.js',
  ];

  let allExists = true;

  requiredFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${file}`);
    } else {
      console.log(`  ❌ ${file} - 不存在`);
      allExists = false;
    }
  });

  return allExists;
}

// 检查package.json依赖
function checkDependencies() {
  console.log('\n📦 检查依赖配置...');

  try {
    // 检查移动端包依赖
    const mobilePackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'packages/mobile/package.json'), 'utf8')
    );

    const requiredMobileDeps = [
      '@zhiweijz/core',
      'react',
      'react-native',
      'react-native-paper',
      'react-native-vector-icons',
      'react-native-safe-area-context',
      '@react-navigation/native',
      '@react-navigation/stack',
      '@react-navigation/bottom-tabs',
      '@react-native-async-storage/async-storage',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'zustand',
      '@tanstack/react-query',
      'dayjs'
    ];

    console.log('  移动端包依赖:');
    let mobileDepsOk = true;
    requiredMobileDeps.forEach(dep => {
      if (mobilePackageJson.dependencies && mobilePackageJson.dependencies[dep]) {
        console.log(`    ✅ ${dep}`);
      } else {
        console.log(`    ❌ ${dep} - 缺失`);
        mobileDepsOk = false;
      }
    });

    // 检查Android应用依赖
    const androidPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'apps/android/package.json'), 'utf8')
    );

    console.log('  Android应用依赖:');
    let androidDepsOk = true;
    requiredMobileDeps.forEach(dep => {
      if (androidPackageJson.dependencies && androidPackageJson.dependencies[dep]) {
        console.log(`    ✅ ${dep}`);
      } else {
        console.log(`    ❌ ${dep} - 缺失`);
        androidDepsOk = false;
      }
    });

    return mobileDepsOk && androidDepsOk;
  } catch (error) {
    console.log(`  ❌ 读取package.json失败: ${error.message}`);
    return false;
  }
}

// 检查TypeScript配置
function checkTypeScriptConfig() {
  console.log('\n🔧 检查TypeScript配置...');

  const tsConfigPaths = [
    'packages/mobile/tsconfig.json',
    'apps/android/tsconfig.json'
  ];

  let allExists = true;

  tsConfigPaths.forEach(configPath => {
    const fullPath = path.join(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      console.log(`  ✅ ${configPath}`);
    } else {
      console.log(`  ❌ ${configPath} - 不存在`);
      allExists = false;
    }
  });

  return allExists;
}

// 检查核心包构建
function checkCoreBuild() {
  console.log('\n🏗️  检查核心包构建...');

  try {
    const coreDistPath = path.join(process.cwd(), 'packages/core/dist');
    if (fs.existsSync(coreDistPath)) {
      console.log('  ✅ 核心包已构建');
      return true;
    } else {
      console.log('  ⚠️  核心包未构建，尝试构建...');
      execSync('cd packages/core && yarn build', { stdio: 'inherit' });
      console.log('  ✅ 核心包构建完成');
      return true;
    }
  } catch (error) {
    console.log(`  ❌ 核心包构建失败: ${error.message}`);
    return false;
  }
}

// 检查Node.js和包管理器版本
function checkEnvironment() {
  console.log('\n🌍 检查开发环境...');

  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log(`  ✅ Node.js: ${nodeVersion}`);

    // 检查yarn或npm
    try {
      const yarnVersion = execSync('yarn --version', { encoding: 'utf8' }).trim();
      console.log(`  ✅ Yarn: ${yarnVersion}`);
    } catch (yarnError) {
      try {
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        console.log(`  ✅ npm: ${npmVersion}`);
        console.log(`  ⚠️  建议安装Yarn以获得更好的性能`);
      } catch (npmError) {
        console.log(`  ❌ 未找到包管理器 (yarn或npm)`);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.log(`  ❌ 环境检查失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  const checks = [
    { name: '开发环境', fn: checkEnvironment },
    { name: '项目结构', fn: checkProjectStructure },
    { name: '核心文件', fn: checkCoreFiles },
    { name: '依赖配置', fn: checkDependencies },
    { name: 'TypeScript配置', fn: checkTypeScriptConfig },
    { name: '核心包构建', fn: checkCoreBuild },
  ];

  let allPassed = true;
  const results = [];

  for (const check of checks) {
    const passed = check.fn();
    results.push({ name: check.name, passed });
    if (!passed) {
      allPassed = false;
    }
  }

  // 输出总结
  console.log('\n📊 检查结果总结:');
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`  ${status} ${result.name}`);
  });

  if (allPassed) {
    console.log('\n🎉 所有检查通过！Android开发环境已准备就绪。');
    console.log('\n下一步:');
    console.log('1. 启动后端服务: cd server && yarn dev');
    console.log('2. 初始化React Native项目: 参考 docs/App/11_Android快速启动指南.md');
    console.log('3. 启动Android应用: yarn android');
  } else {
    console.log('\n⚠️  部分检查未通过，请根据上述提示修复问题。');
    process.exit(1);
  }
}

// 运行检查
main().catch(error => {
  console.error('检查过程中发生错误:', error);
  process.exit(1);
});
