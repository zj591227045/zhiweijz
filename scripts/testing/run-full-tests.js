#!/usr/bin/env node

/**
 * 完整功能测试脚本
 * 运行前端和后端的所有功能测试，确保新版本功能正常
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 设置颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class TestRunner {
  constructor() {
    this.results = {
      backend: { passed: 0, failed: 0, tests: [] },
      frontend: { passed: 0, failed: 0, tests: [] },
      e2e: { passed: 0, failed: 0, tests: [] },
      overall: { passed: 0, failed: 0, startTime: new Date() }
    };
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'test-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // 默认配置
    return {
      backend: {
        enabled: true,
        timeout: 300000, // 5分钟
        retries: 2
      },
      frontend: {
        enabled: true,
        timeout: 180000, // 3分钟
        retries: 1
      },
      e2e: {
        enabled: true,
        timeout: 600000, // 10分钟
        retries: 1
      },
      notifications: {
        enabled: false,
        webhook: null
      }
    };
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 60000, cwd = process.cwd() } = options;
      
      this.log(`执行命令: ${command}`, 'blue');
      
      const child = spawn('sh', ['-c', command], {
        cwd,
        stdio: 'pipe',
        timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject({ stdout, stderr, code, command });
        }
      });

      child.on('error', (error) => {
        reject({ error, command });
      });
    });
  }

  async checkPrerequisites() {
    this.log('检查测试前置条件...', 'cyan');
    
    const checks = [
      {
        name: '检查Node.js版本',
        command: 'node --version',
        validate: (output) => {
          const version = output.stdout.trim();
          const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
          return majorVersion >= 16;
        }
      },
      {
        name: '检查npm依赖',
        command: 'npm list --depth=0',
        validate: () => true // 只要能执行就行
      },
      {
        name: '检查后端构建',
        command: 'cd server && npm run build',
        validate: () => true
      },
      {
        name: '检查前端构建',
        command: 'cd apps/web && npm run build',
        validate: () => true
      }
    ];

    for (const check of checks) {
      try {
        this.log(`  ${check.name}...`, 'yellow');
        const result = await this.runCommand(check.command, { timeout: 120000 });
        
        if (check.validate(result)) {
          this.log(`  ✅ ${check.name} 通过`, 'green');
        } else {
          this.log(`  ❌ ${check.name} 失败`, 'red');
          return false;
        }
      } catch (error) {
        this.log(`  ❌ ${check.name} 失败: ${error.stderr || error.error?.message}`, 'red');
        return false;
      }
    }

    return true;
  }

  async runBackendTests() {
    if (!this.config.backend.enabled) {
      this.log('后端测试已禁用', 'yellow');
      return true;
    }

    this.log('开始后端API测试...', 'cyan');
    
    try {
      // 运行后端单元测试
      await this.runCommand('cd server && npm test', {
        timeout: this.config.backend.timeout
      });
      
      // 运行API集成测试
      const apiTestResult = await this.runCommand('node scripts/test-backend-api.js', {
        timeout: this.config.backend.timeout
      });
      
      this.results.backend.passed++;
      this.log('✅ 后端测试通过', 'green');
      return true;
      
    } catch (error) {
      this.results.backend.failed++;
      this.results.backend.tests.push({
        name: '后端API测试',
        error: error.stderr || error.error?.message,
        command: error.command
      });
      this.log('❌ 后端测试失败', 'red');
      return false;
    }
  }

  async runFrontendTests() {
    if (!this.config.frontend.enabled) {
      this.log('前端测试已禁用', 'yellow');
      return true;
    }

    this.log('开始前端功能测试...', 'cyan');
    
    try {
      // 运行前端测试
      const frontendTestResult = await this.runCommand('node scripts/test-frontend.js', {
        timeout: this.config.frontend.timeout
      });
      
      this.results.frontend.passed++;
      this.log('✅ 前端测试通过', 'green');
      return true;
      
    } catch (error) {
      this.results.frontend.failed++;
      this.results.frontend.tests.push({
        name: '前端功能测试',
        error: error.stderr || error.error?.message,
        command: error.command
      });
      this.log('❌ 前端测试失败', 'red');
      return false;
    }
  }

  async runE2ETests() {
    if (!this.config.e2e.enabled) {
      this.log('E2E测试已禁用', 'yellow');
      return true;
    }

    this.log('开始端到端测试...', 'cyan');
    
    try {
      const e2eTestResult = await this.runCommand('node scripts/test-e2e.js', {
        timeout: this.config.e2e.timeout
      });
      
      this.results.e2e.passed++;
      this.log('✅ E2E测试通过', 'green');
      return true;
      
    } catch (error) {
      this.results.e2e.failed++;
      this.results.e2e.tests.push({
        name: '端到端测试',
        error: error.stderr || error.error?.message,
        command: error.command
      });
      this.log('❌ E2E测试失败', 'red');
      return false;
    }
  }

  generateReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.results.overall.startTime) / 1000);
    
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('测试报告', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    this.log(`测试开始时间: ${this.results.overall.startTime.toLocaleString()}`, 'blue');
    this.log(`测试结束时间: ${endTime.toLocaleString()}`, 'blue');
    this.log(`总耗时: ${duration}秒`, 'blue');
    
    this.log('\n测试结果汇总:', 'bright');
    this.log(`后端测试: ${this.results.backend.passed}通过, ${this.results.backend.failed}失败`, 
      this.results.backend.failed > 0 ? 'red' : 'green');
    this.log(`前端测试: ${this.results.frontend.passed}通过, ${this.results.frontend.failed}失败`, 
      this.results.frontend.failed > 0 ? 'red' : 'green');
    this.log(`E2E测试: ${this.results.e2e.passed}通过, ${this.results.e2e.failed}失败`, 
      this.results.e2e.failed > 0 ? 'red' : 'green');
    
    const totalPassed = this.results.backend.passed + this.results.frontend.passed + this.results.e2e.passed;
    const totalFailed = this.results.backend.failed + this.results.frontend.failed + this.results.e2e.failed;
    
    this.log(`\n总计: ${totalPassed}通过, ${totalFailed}失败`, 
      totalFailed > 0 ? 'red' : 'green');
    
    // 显示失败详情
    if (totalFailed > 0) {
      this.log('\n失败详情:', 'red');
      [...this.results.backend.tests, ...this.results.frontend.tests, ...this.results.e2e.tests]
        .forEach(test => {
          this.log(`  ❌ ${test.name}`, 'red');
          this.log(`     命令: ${test.command}`, 'yellow');
          this.log(`     错误: ${test.error}`, 'yellow');
        });
    }
    
    this.log('='.repeat(60), 'cyan');
    
    // 保存报告到文件
    const reportPath = path.join(__dirname, '../test-reports', `test-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      ...this.results,
      endTime,
      duration,
      totalPassed,
      totalFailed
    }, null, 2));
    
    this.log(`测试报告已保存到: ${reportPath}`, 'blue');
    
    return totalFailed === 0;
  }

  async run() {
    this.log('开始完整功能测试...', 'bright');
    
    // 检查前置条件
    const prerequisitesOk = await this.checkPrerequisites();
    if (!prerequisitesOk) {
      this.log('前置条件检查失败，测试终止', 'red');
      process.exit(1);
    }
    
    // 运行各项测试
    const backendOk = await this.runBackendTests();
    const frontendOk = await this.runFrontendTests();
    const e2eOk = await this.runE2ETests();
    
    // 生成报告
    const allTestsPassed = this.generateReport();
    
    if (allTestsPassed) {
      this.log('\n🎉 所有测试通过！新版本功能正常', 'green');
      process.exit(0);
    } else {
      this.log('\n❌ 部分测试失败，请检查问题后重新测试', 'red');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const runner = new TestRunner();
  await runner.run();
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = TestRunner;
