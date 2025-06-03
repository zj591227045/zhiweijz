#!/usr/bin/env node

/**
 * 测试脚本演示
 * 展示测试脚本的基本功能，无需启动服务
 */

const fs = require('fs');
const path = require('path');

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

class TestDemo {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`运行测试: ${testName}`, 'blue');
      await testFunction();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'passed' });
      this.log(`✅ ${testName} 通过`, 'green');
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ 
        name: testName, 
        status: 'failed', 
        error: error.message 
      });
      this.log(`❌ ${testName} 失败: ${error.message}`, 'red');
    }
  }

  async testProjectStructure() {
    await this.runTest('项目结构检查', async () => {
      const requiredDirs = [
        'server',
        'apps/web',
        'scripts',
        'docs'
      ];
      
      for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
          throw new Error(`缺少目录: ${dir}`);
        }
      }
      
      const requiredFiles = [
        'package.json',
        'server/package.json',
        'apps/web/package.json',
        'server/prisma/schema.prisma'
      ];
      
      for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
          throw new Error(`缺少文件: ${file}`);
        }
      }
    });
  }

  async testPackageJsonScripts() {
    await this.runTest('package.json脚本检查', async () => {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      const requiredScripts = [
        'test:full',
        'test:backend-api',
        'test:frontend',
        'test:e2e',
        'test:regression',
        'test:health'
      ];
      
      for (const script of requiredScripts) {
        if (!packageJson.scripts || !packageJson.scripts[script]) {
          throw new Error(`缺少脚本: ${script}`);
        }
      }
    });
  }

  async testConfigFiles() {
    await this.runTest('配置文件检查', async () => {
      const configFiles = [
        'scripts/test-config.json',
        'scripts/regression-config.json'
      ];
      
      for (const configFile of configFiles) {
        if (!fs.existsSync(configFile)) {
          throw new Error(`缺少配置文件: ${configFile}`);
        }
        
        try {
          JSON.parse(fs.readFileSync(configFile, 'utf8'));
        } catch (error) {
          throw new Error(`配置文件格式错误: ${configFile}`);
        }
      }
    });
  }

  async testScriptFiles() {
    await this.runTest('测试脚本文件检查', async () => {
      const scriptFiles = [
        'scripts/run-full-tests.js',
        'scripts/test-backend-api.js',
        'scripts/test-frontend.js',
        'scripts/test-e2e.js',
        'scripts/test-regression.js',
        'scripts/test-health-check.js'
      ];
      
      for (const scriptFile of scriptFiles) {
        if (!fs.existsSync(scriptFile)) {
          throw new Error(`缺少脚本文件: ${scriptFile}`);
        }
        
        // 检查文件是否可执行
        try {
          fs.accessSync(scriptFile, fs.constants.F_OK);
        } catch (error) {
          throw new Error(`脚本文件不可访问: ${scriptFile}`);
        }
      }
    });
  }

  async testReportDirectory() {
    await this.runTest('测试报告目录检查', async () => {
      const reportDir = 'test-reports';
      
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
        this.log(`创建测试报告目录: ${reportDir}`, 'yellow');
      }
      
      // 测试写入权限
      const testFile = path.join(reportDir, 'test-write.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    });
  }

  async testDependencies() {
    await this.runTest('依赖检查', async () => {
      // 检查根目录依赖
      if (!fs.existsSync('node_modules')) {
        throw new Error('根目录缺少node_modules，请运行: npm install');
      }
      
      // 检查后端依赖
      if (!fs.existsSync('server/node_modules')) {
        throw new Error('后端缺少node_modules，请运行: cd server && npm install');
      }
      
      // 检查前端依赖
      if (!fs.existsSync('apps/web/node_modules')) {
        throw new Error('前端缺少node_modules，请运行: cd apps/web && npm install');
      }
      
      // 检查关键依赖
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const serverPackageJson = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
      const webPackageJson = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf8'));
      
      // 检查测试相关依赖
      const requiredDeps = ['axios'];
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          throw new Error(`缺少依赖: ${dep}`);
        }
      }
    });
  }

  async testEnvironmentSetup() {
    await this.runTest('环境设置检查', async () => {
      // 检查Node.js版本
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      
      if (majorVersion < 16) {
        throw new Error(`Node.js版本过低: ${nodeVersion}，需要 >= 16`);
      }
      
      this.log(`Node.js版本: ${nodeVersion}`, 'blue');
      
      // 检查npm版本
      try {
        const { execSync } = require('child_process');
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        this.log(`npm版本: ${npmVersion}`, 'blue');
      } catch (error) {
        throw new Error('npm不可用');
      }
    });
  }

  generateReport() {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('测试脚本演示报告', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    const totalTests = this.results.passed + this.results.failed;
    const passRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    
    this.log(`总测试数: ${totalTests}`, 'blue');
    this.log(`通过: ${this.results.passed}`, 'green');
    this.log(`失败: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    this.log(`通过率: ${passRate}%`, passRate >= 90 ? 'green' : 'yellow');
    
    if (this.results.failed > 0) {
      this.log('\n失败的测试:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          this.log(`  ❌ ${test.name}: ${test.error}`, 'red');
        });
    }
    
    this.log('\n测试脚本功能说明:', 'cyan');
    this.log('✅ 完整测试套件 - npm run test:full', 'green');
    this.log('✅ 后端API测试 - npm run test:backend-api', 'green');
    this.log('✅ 前端功能测试 - npm run test:frontend', 'green');
    this.log('✅ 端到端测试 - npm run test:e2e', 'green');
    this.log('✅ 回归测试 - npm run test:regression', 'green');
    this.log('✅ 健康检查 - npm run test:health', 'green');
    
    this.log('\n使用建议:', 'yellow');
    this.log('1. 开发时运行: npm run test:health', 'yellow');
    this.log('2. 提交前运行: npm run test:backend-api && npm run test:frontend', 'yellow');
    this.log('3. 发布前运行: npm run test:regression', 'yellow');
    
    this.log('='.repeat(60), 'cyan');
    
    return this.results.failed === 0;
  }

  async run() {
    this.log('开始测试脚本演示...', 'bright');
    
    await this.testEnvironmentSetup();
    await this.testProjectStructure();
    await this.testPackageJsonScripts();
    await this.testConfigFiles();
    await this.testScriptFiles();
    await this.testReportDirectory();
    await this.testDependencies();
    
    const success = this.generateReport();
    
    if (success) {
      this.log('\n🎉 测试脚本环境准备完成！', 'green');
      this.log('现在可以运行各种测试脚本了', 'green');
      process.exit(0);
    } else {
      this.log('\n❌ 发现问题，请先解决后再运行测试', 'red');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const demo = new TestDemo();
  await demo.run();
}

if (require.main === module) {
  main();
}

module.exports = TestDemo;
