#!/usr/bin/env node

/**
 * 环境切换脚本
 * 用于在开发环境和生产环境之间切换API URL配置
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE_PATH = path.join(__dirname, '../apps/web/.env.local');

// 配置选项
const ENVIRONMENTS = {
  development: {
    name: '开发环境',
    apiBaseUrl: '',
    description: '使用相对路径，自动连接到 localhost:3000'
  },
  production: {
    name: '生产环境',
    apiBaseUrl: 'https://your-domain.com',
    description: '使用生产域名，需要修改为实际的域名'
  }
};

function getCurrentConfig() {
  if (!fs.existsSync(ENV_FILE_PATH)) {
    console.error('❌ .env.local 文件不存在');
    process.exit(1);
  }

  const content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  const match = content.match(/NEXT_PUBLIC_API_BASE_URL=(.*)$/m);
  
  if (!match) {
    return { apiBaseUrl: '', environment: 'unknown' };
  }

  const apiBaseUrl = match[1].trim();
  
  // 判断当前环境
  if (!apiBaseUrl) {
    return { apiBaseUrl, environment: 'development' };
  } else if (apiBaseUrl.includes('your-domain.com')) {
    return { apiBaseUrl, environment: 'production' };
  } else {
    return { apiBaseUrl, environment: 'custom' };
  }
}

function switchEnvironment(targetEnv) {
  if (!ENVIRONMENTS[targetEnv]) {
    console.error(`❌ 无效的环境: ${targetEnv}`);
    console.log('可用环境:', Object.keys(ENVIRONMENTS).join(', '));
    process.exit(1);
  }

  const config = ENVIRONMENTS[targetEnv];
  
  // 读取当前配置
  let content = fs.readFileSync(ENV_FILE_PATH, 'utf8');
  
  // 更新 API_BASE_URL
  if (content.includes('NEXT_PUBLIC_API_BASE_URL=')) {
    content = content.replace(
      /NEXT_PUBLIC_API_BASE_URL=.*$/m,
      `NEXT_PUBLIC_API_BASE_URL=${config.apiBaseUrl}`
    );
  } else {
    // 如果不存在，添加到文件末尾
    content += `\nNEXT_PUBLIC_API_BASE_URL=${config.apiBaseUrl}\n`;
  }
  
  // 写入文件
  fs.writeFileSync(ENV_FILE_PATH, content, 'utf8');
  
  console.log(`✅ 已切换到${config.name}`);
  console.log(`📋 API基础URL: ${config.apiBaseUrl || '(相对路径)'}`);
  console.log(`💡 说明: ${config.description}`);
  
  if (targetEnv === 'production' && config.apiBaseUrl.includes('your-domain.com')) {
    console.log('');
    console.log('⚠️  注意: 请将 "your-domain.com" 替换为实际的生产域名');
  }
}

function showStatus() {
  const current = getCurrentConfig();
  
  console.log('📋 当前环境配置:');
  console.log(`  环境: ${ENVIRONMENTS[current.environment]?.name || '自定义'}`);
  console.log(`  API基础URL: ${current.apiBaseUrl || '(相对路径)'}`);
  
  if (current.environment === 'production' && current.apiBaseUrl.includes('your-domain.com')) {
    console.log('  ⚠️  需要将域名替换为实际的生产域名');
  }
  
  console.log('');
  console.log('🔄 可用的环境:');
  Object.entries(ENVIRONMENTS).forEach(([key, config]) => {
    const isCurrent = key === current.environment;
    console.log(`  ${isCurrent ? '👉' : '  '} ${key}: ${config.name} - ${config.description}`);
  });
}

function showHelp() {
  console.log('🔧 环境切换脚本');
  console.log('');
  console.log('用法:');
  console.log('  node scripts/switch-env.js [命令]');
  console.log('');
  console.log('命令:');
  console.log('  status                显示当前环境状态');
  console.log('  development, dev      切换到开发环境');
  console.log('  production, prod      切换到生产环境');
  console.log('  help, -h, --help      显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/switch-env.js status');
  console.log('  node scripts/switch-env.js dev');
  console.log('  node scripts/switch-env.js prod');
}

// 主逻辑
const command = process.argv[2];

switch (command) {
  case 'status':
  case undefined:
    showStatus();
    break;
    
  case 'development':
  case 'dev':
    switchEnvironment('development');
    break;
    
  case 'production':
  case 'prod':
    switchEnvironment('production');
    break;
    
  case 'help':
  case '-h':
  case '--help':
    showHelp();
    break;
    
  default:
    console.error(`❌ 未知命令: ${command}`);
    console.log('');
    showHelp();
    process.exit(1);
}
