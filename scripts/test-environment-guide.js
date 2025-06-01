#!/usr/bin/env node

/**
 * 测试环境检测和启动指南
 * 帮助用户了解如何为不同测试准备环境
 */

const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

// 设置颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

class EnvironmentGuide {
  constructor() {
    this.services = {
      database: { status: 'unknown', port: 5432 },
      backend: { status: 'unknown', port: 3000, url: 'http://localhost:3000' },
      frontend: { status: 'unknown', port: 3003, url: 'http://localhost:3003' },
      docker: { status: 'unknown', port: 8080, url: 'http://localhost:8080' }
    };
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkService(name, url, timeout = 3000) {
    try {
      const response = await axios.get(url, { 
        timeout,
        validateStatus: () => true // 接受所有状态码
      });
      return { available: true, status: response.status };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return { available: false, reason: 'connection_refused' };
      }
      return { available: false, reason: error.message };
    }
  }

  async checkDatabase() {
    try {
      // 通过Prisma检查数据库
      execSync('cd server && npx prisma db pull --print', {
        stdio: 'pipe',
        timeout: 10000
      });
      this.services.database.status = 'available';
      return true;
    } catch (error) {
      this.services.database.status = 'unavailable';
      return false;
    }
  }

  async detectEnvironment() {
    this.log('检测当前环境状态...', 'cyan');
    
    // 检查数据库
    const dbAvailable = await this.checkDatabase();
    this.log(`数据库: ${dbAvailable ? '✅ 可用' : '❌ 不可用'}`, dbAvailable ? 'green' : 'red');
    
    // 检查后端服务
    const backendResult = await this.checkService('backend', `${this.services.backend.url}/api/auth/check`);
    this.services.backend.status = backendResult.available ? 'available' : 'unavailable';
    this.log(`后端服务 (${this.services.backend.url}): ${backendResult.available ? '✅ 可用' : '❌ 不可用'}`, 
      backendResult.available ? 'green' : 'red');
    
    // 检查前端服务
    const frontendResult = await this.checkService('frontend', this.services.frontend.url);
    this.services.frontend.status = frontendResult.available ? 'available' : 'unavailable';
    this.log(`前端服务 (${this.services.frontend.url}): ${frontendResult.available ? '✅ 可用' : '❌ 不可用'}`, 
      frontendResult.available ? 'green' : 'red');
    
    // 检查Docker服务
    const dockerResult = await this.checkService('docker', this.services.docker.url);
    this.services.docker.status = dockerResult.available ? 'available' : 'unavailable';
    this.log(`Docker服务 (${this.services.docker.url}): ${dockerResult.available ? '✅ 可用' : '❌ 不可用'}`, 
      dockerResult.available ? 'green' : 'red');
  }

  showTestRequirements() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('各测试类型的环境要求', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    const tests = [
      {
        name: 'npm run test:health',
        description: '系统健康检查',
        requirements: ['数据库'],
        optional: [],
        time: '1-2分钟'
      },
      {
        name: 'npm run test:backend-api',
        description: '后端API测试',
        requirements: ['数据库', '后端服务'],
        optional: [],
        time: '3-5分钟'
      },
      {
        name: 'npm run test:frontend',
        description: '前端功能测试',
        requirements: [],
        optional: [],
        time: '5-10分钟',
        note: '自动启动前端服务'
      },
      {
        name: 'npm run test:e2e',
        description: '端到端测试',
        requirements: ['数据库'],
        optional: [],
        time: '10-15分钟',
        note: '自动启动前后端服务'
      },
      {
        name: 'npm run test:regression',
        description: '回归测试',
        requirements: ['数据库'],
        optional: [],
        time: '20-40分钟',
        note: '自动启动前后端服务'
      },
      {
        name: 'npm run test:full',
        description: '完整测试套件',
        requirements: ['数据库'],
        optional: [],
        time: '15-30分钟',
        note: '自动启动前后端服务'
      }
    ];
    
    tests.forEach(test => {
      this.log(`\n📋 ${test.name}`, 'blue');
      this.log(`   描述: ${test.description}`, 'reset');
      this.log(`   耗时: ${test.time}`, 'reset');
      this.log(`   必需: ${test.requirements.length > 0 ? test.requirements.join(', ') : '无'}`, 'yellow');
      if (test.note) {
        this.log(`   说明: ${test.note}`, 'green');
      }
    });
  }

  showStartupGuide() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('服务启动指南', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    // 数据库启动
    if (this.services.database.status === 'unavailable') {
      this.log('\n🗄️ 启动数据库:', 'red');
      this.log('选项1 - Docker方式:', 'yellow');
      this.log('  docker-compose up -d postgres', 'reset');
      this.log('选项2 - 本地PostgreSQL:', 'yellow');
      this.log('  确保PostgreSQL服务运行在端口5432', 'reset');
    }
    
    // 后端启动
    if (this.services.backend.status === 'unavailable') {
      this.log('\n🔙 启动后端服务:', 'red');
      this.log('选项1 - 开发环境:', 'yellow');
      this.log('  cd server && npm run dev', 'reset');
      this.log('  # 或使用脚本: ./scripts/start-backend.sh', 'reset');
      this.log('选项2 - Docker环境:', 'yellow');
      this.log('  cd docker && ./start.sh', 'reset');
    }
    
    // 前端启动
    if (this.services.frontend.status === 'unavailable') {
      this.log('\n🎨 启动前端服务:', 'yellow');
      this.log('选项1 - 开发环境:', 'yellow');
      this.log('  cd apps/web && npm run dev', 'reset');
      this.log('  # 或使用脚本: ./scripts/start-frontend.sh', 'reset');
      this.log('选项2 - 自动启动:', 'yellow');
      this.log('  某些测试会自动启动前端服务', 'reset');
    }
  }

  showRecommendedWorkflow() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('推荐的测试工作流', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    this.log('\n🚀 方案A: 最简单（推荐新手）', 'green');
    this.log('1. 启动数据库:', 'yellow');
    this.log('   docker-compose up -d postgres', 'reset');
    this.log('2. 运行自动化测试:', 'yellow');
    this.log('   npm run test:full', 'reset');
    this.log('   (测试脚本会自动启动前后端服务)', 'blue');
    
    this.log('\n⚡ 方案B: 开发环境（推荐开发者）', 'green');
    this.log('1. 启动后端:', 'yellow');
    this.log('   cd server && npm run dev', 'reset');
    this.log('2. 启动前端 (新终端):', 'yellow');
    this.log('   cd apps/web && npm run dev', 'reset');
    this.log('3. 运行特定测试 (新终端):', 'yellow');
    this.log('   npm run test:backend-api', 'reset');
    this.log('   npm run test:frontend', 'reset');
    
    this.log('\n🐳 方案C: Docker环境', 'green');
    this.log('1. 启动Docker服务:', 'yellow');
    this.log('   cd docker && ./start.sh', 'reset');
    this.log('2. 设置环境变量:', 'yellow');
    this.log('   export BACKEND_URL=http://localhost:8080', 'reset');
    this.log('3. 运行API测试:', 'yellow');
    this.log('   npm run test:backend-api', 'reset');
  }

  showCurrentRecommendation() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('基于当前环境的建议', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    const dbOk = this.services.database.status === 'available';
    const backendOk = this.services.backend.status === 'available';
    const frontendOk = this.services.frontend.status === 'available';
    
    if (dbOk && backendOk && frontendOk) {
      this.log('\n🎉 完美！所有服务都在运行', 'green');
      this.log('您可以运行任何测试:', 'green');
      this.log('  npm run test:health      # 快速检查', 'reset');
      this.log('  npm run test:backend-api # 后端测试', 'reset');
      this.log('  npm run test:frontend    # 前端测试', 'reset');
      this.log('  npm run test:full        # 完整测试', 'reset');
    } else if (dbOk && backendOk) {
      this.log('\n✅ 数据库和后端已就绪', 'green');
      this.log('推荐运行:', 'yellow');
      this.log('  npm run test:backend-api # 测试后端API', 'reset');
      this.log('  npm run test:e2e         # 端到端测试(自动启动前端)', 'reset');
    } else if (dbOk) {
      this.log('\n✅ 数据库已就绪', 'green');
      this.log('推荐运行:', 'yellow');
      this.log('  npm run test:health      # 健康检查', 'reset');
      this.log('  npm run test:full        # 完整测试(自动启动服务)', 'reset');
    } else {
      this.log('\n⚠️ 需要启动数据库', 'yellow');
      this.log('请先运行:', 'red');
      this.log('  docker-compose up -d postgres', 'reset');
      this.log('然后可以运行:', 'yellow');
      this.log('  npm run test:full        # 完整测试', 'reset');
    }
  }

  async run() {
    this.log('测试环境检测和启动指南', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    await this.detectEnvironment();
    this.showTestRequirements();
    this.showStartupGuide();
    this.showRecommendedWorkflow();
    this.showCurrentRecommendation();
    
    this.log('\n💡 提示: 运行 npm run test:health 可以快速检查系统状态', 'blue');
    this.log('📚 详细文档: 查看 TESTING_GUIDE.md', 'blue');
  }
}

// 主函数
async function main() {
  const guide = new EnvironmentGuide();
  await guide.run();
}

if (require.main === module) {
  main();
}

module.exports = EnvironmentGuide;
