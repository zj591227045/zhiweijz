#!/usr/bin/env node

/**
 * 回归测试脚本
 * 运行完整的回归测试套件，确保新版本没有破坏现有功能
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

class RegressionTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: [],
      startTime: new Date()
    };
    this.config = this.loadConfig();
    this.baselineData = this.loadBaseline();
  }

  loadConfig() {
    const configPath = path.join(__dirname, 'regression-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // 默认配置
    return {
      testSuites: {
        unit: { enabled: true, critical: true },
        integration: { enabled: true, critical: true },
        api: { enabled: true, critical: true },
        frontend: { enabled: true, critical: false },
        e2e: { enabled: true, critical: false },
        performance: { enabled: false, critical: false }
      },
      thresholds: {
        testCoverage: 80,
        performanceRegression: 20, // 性能回归阈值（百分比）
        errorRate: 5 // 错误率阈值（百分比）
      },
      notifications: {
        enabled: false,
        webhook: null,
        email: null
      }
    };
  }

  loadBaseline() {
    const baselinePath = path.join(__dirname, '../test-reports/baseline.json');
    if (fs.existsSync(baselinePath)) {
      return JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    }
    return null;
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction, critical = false) {
    try {
      this.log(`运行测试: ${testName}`, 'blue');
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.tests.push({ 
        name: testName, 
        status: 'passed', 
        duration,
        critical 
      });
      this.log(`✅ ${testName} 通过 (${duration}ms)`, 'green');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ 
        name: testName, 
        status: 'failed', 
        error: error.message,
        critical 
      });
      this.log(`❌ ${testName} 失败: ${error.message}`, 'red');
      
      // 如果是关键测试失败，立即停止
      if (critical) {
        throw new Error(`关键测试失败: ${testName}`);
      }
      
      return null;
    }
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const output = execSync(command, {
          encoding: 'utf8',
          timeout: options.timeout || 300000,
          cwd: options.cwd || process.cwd(),
          ...options
        });
        resolve(output);
      } catch (error) {
        reject(error);
      }
    });
  }

  async testUnitTests() {
    if (!this.config.testSuites.unit.enabled) {
      this.log('单元测试已禁用', 'yellow');
      return;
    }

    await this.runTest('后端单元测试', async () => {
      const output = await this.runCommand('cd server && npm test -- --coverage --passWithNoTests', {
        timeout: 300000
      });
      
      // 解析测试覆盖率
      const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        if (coverage < this.config.thresholds.testCoverage) {
          throw new Error(`测试覆盖率不足: ${coverage}% < ${this.config.thresholds.testCoverage}%`);
        }
        this.log(`测试覆盖率: ${coverage}%`, 'green');
      }
      
      return { coverage: coverageMatch ? parseFloat(coverageMatch[1]) : null };
    }, this.config.testSuites.unit.critical);
  }

  async testIntegrationTests() {
    if (!this.config.testSuites.integration.enabled) {
      this.log('集成测试已禁用', 'yellow');
      return;
    }

    await this.runTest('后端集成测试', async () => {
      const output = await this.runCommand('cd server && npm run test:integration', {
        timeout: 300000
      });
      
      // 检查测试结果
      if (output.includes('FAIL') || output.includes('failed')) {
        throw new Error('集成测试包含失败用例');
      }
      
      return { output };
    }, this.config.testSuites.integration.critical);
  }

  async testAPIEndpoints() {
    if (!this.config.testSuites.api.enabled) {
      this.log('API测试已禁用', 'yellow');
      return;
    }

    await this.runTest('API端点测试', async () => {
      const output = await this.runCommand('node scripts/test-backend-api.js', {
        timeout: 300000
      });
      
      if (output.includes('❌') || output.includes('失败')) {
        throw new Error('API测试包含失败用例');
      }
      
      return { output };
    }, this.config.testSuites.api.critical);
  }

  async testFrontendBuild() {
    if (!this.config.testSuites.frontend.enabled) {
      this.log('前端测试已禁用', 'yellow');
      return;
    }

    await this.runTest('前端构建测试', async () => {
      const output = await this.runCommand('node scripts/test-frontend.js', {
        timeout: 600000
      });
      
      if (output.includes('❌') || output.includes('失败')) {
        throw new Error('前端测试包含失败用例');
      }
      
      return { output };
    }, this.config.testSuites.frontend.critical);
  }

  async testE2EFlows() {
    if (!this.config.testSuites.e2e.enabled) {
      this.log('E2E测试已禁用', 'yellow');
      return;
    }

    await this.runTest('端到端流程测试', async () => {
      const output = await this.runCommand('node scripts/test-e2e.js', {
        timeout: 900000 // 15分钟
      });
      
      if (output.includes('❌') || output.includes('失败')) {
        throw new Error('E2E测试包含失败用例');
      }
      
      return { output };
    }, this.config.testSuites.e2e.critical);
  }

  async testPerformance() {
    if (!this.config.testSuites.performance.enabled) {
      this.log('性能测试已禁用', 'yellow');
      return;
    }

    await this.runTest('性能回归测试', async () => {
      // 简单的性能测试 - 测试关键API响应时间
      const endpoints = [
        '/api/auth/check',
        '/api/account-books',
        '/api/transactions',
        '/api/budgets',
        '/api/categories'
      ];
      
      const baseURL = 'http://localhost:3000';
      const results = {};
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
          await axios.get(`${baseURL}${endpoint}`, { timeout: 5000 });
          const responseTime = Date.now() - startTime;
          results[endpoint] = responseTime;
          
          // 与基线比较（如果有）
          if (this.baselineData && this.baselineData.performance && this.baselineData.performance[endpoint]) {
            const baseline = this.baselineData.performance[endpoint];
            const regression = ((responseTime - baseline) / baseline) * 100;
            
            if (regression > this.config.thresholds.performanceRegression) {
              this.log(`性能回归警告: ${endpoint} 响应时间增加 ${regression.toFixed(1)}%`, 'yellow');
            }
          }
          
        } catch (error) {
          this.log(`性能测试跳过: ${endpoint} (服务不可用)`, 'yellow');
        }
      }
      
      return { responseTime: results };
    }, this.config.testSuites.performance.critical);
  }

  async testDatabaseMigrations() {
    await this.runTest('数据库迁移测试', async () => {
      // 检查Prisma迁移状态
      const output = await this.runCommand('cd server && npx prisma migrate status', {
        timeout: 60000
      });
      
      if (output.includes('pending') || output.includes('failed')) {
        throw new Error('数据库迁移状态异常');
      }
      
      return { migrationStatus: 'up-to-date' };
    }, true);
  }

  async testEnvironmentConsistency() {
    await this.runTest('环境一致性检查', async () => {
      const checks = [];
      
      // 检查Node.js版本
      const nodeVersion = await this.runCommand('node --version');
      checks.push({ name: 'Node.js版本', value: nodeVersion.trim() });
      
      // 检查npm版本
      const npmVersion = await this.runCommand('npm --version');
      checks.push({ name: 'npm版本', value: npmVersion.trim() });
      
      // 检查关键依赖
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      checks.push({ name: '项目版本', value: packageJson.version });
      
      // 检查环境变量
      const requiredEnvVars = ['NODE_ENV'];
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          this.log(`警告: 环境变量 ${envVar} 未设置`, 'yellow');
        }
      }
      
      return { environmentChecks: checks };
    }, true);
  }

  async compareWithBaseline() {
    if (!this.baselineData) {
      this.log('未找到基线数据，跳过基线比较', 'yellow');
      return;
    }

    await this.runTest('基线比较', async () => {
      const currentResults = {
        passed: this.results.passed,
        failed: this.results.failed,
        totalTests: this.results.passed + this.results.failed
      };
      
      const baseline = this.baselineData;
      
      // 比较测试通过率
      const currentPassRate = (currentResults.passed / currentResults.totalTests) * 100;
      const baselinePassRate = (baseline.passed / baseline.totalTests) * 100;
      
      if (currentPassRate < baselinePassRate - 5) { // 5%容忍度
        throw new Error(`测试通过率下降: ${currentPassRate.toFixed(1)}% < ${baselinePassRate.toFixed(1)}%`);
      }
      
      this.log(`测试通过率: ${currentPassRate.toFixed(1)}% (基线: ${baselinePassRate.toFixed(1)}%)`, 'green');
      
      return { comparison: { current: currentResults, baseline } };
    }, false);
  }

  generateReport() {
    const endTime = new Date();
    const duration = Math.round((endTime - this.results.startTime) / 1000);
    
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('回归测试报告', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    this.log(`测试开始时间: ${this.results.startTime.toLocaleString()}`, 'blue');
    this.log(`测试结束时间: ${endTime.toLocaleString()}`, 'blue');
    this.log(`总耗时: ${duration}秒`, 'blue');
    
    this.log('\n测试结果汇总:', 'bright');
    this.log(`通过: ${this.results.passed}`, 'green');
    this.log(`失败: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    this.log(`跳过: ${this.results.skipped}`, 'yellow');
    
    const totalTests = this.results.passed + this.results.failed;
    const passRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
    this.log(`通过率: ${passRate}%`, passRate >= 95 ? 'green' : 'yellow');
    
    // 显示关键测试失败
    const criticalFailures = this.results.tests.filter(test => test.status === 'failed' && test.critical);
    if (criticalFailures.length > 0) {
      this.log('\n关键测试失败:', 'red');
      criticalFailures.forEach(test => {
        this.log(`  ❌ ${test.name}: ${test.error}`, 'red');
      });
    }
    
    // 显示所有失败详情
    const failures = this.results.tests.filter(test => test.status === 'failed');
    if (failures.length > 0) {
      this.log('\n失败详情:', 'red');
      failures.forEach(test => {
        this.log(`  ❌ ${test.name}: ${test.error}`, 'red');
      });
    }
    
    this.log('='.repeat(60), 'cyan');
    
    // 保存报告
    const reportPath = path.join(__dirname, '../test-reports', `regression-report-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportData = {
      ...this.results,
      endTime,
      duration,
      passRate: parseFloat(passRate),
      criticalFailures: criticalFailures.length,
      config: this.config
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    this.log(`回归测试报告已保存到: ${reportPath}`, 'blue');
    
    // 更新基线（如果所有测试通过）
    if (this.results.failed === 0) {
      const baselinePath = path.join(__dirname, '../test-reports/baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(reportData, null, 2));
      this.log(`基线数据已更新: ${baselinePath}`, 'green');
    }
    
    return {
      success: criticalFailures.length === 0,
      passRate: parseFloat(passRate),
      criticalFailures: criticalFailures.length
    };
  }

  async run() {
    this.log('开始回归测试...', 'bright');
    
    try {
      // 环境检查
      await this.testEnvironmentConsistency();
      await this.testDatabaseMigrations();
      
      // 核心功能测试
      await this.testUnitTests();
      await this.testIntegrationTests();
      await this.testAPIEndpoints();
      await this.testFrontendBuild();
      await this.testE2EFlows();
      
      // 性能测试
      await this.testPerformance();
      
      // 基线比较
      await this.compareWithBaseline();
      
    } catch (error) {
      this.log(`回归测试过程中发生关键错误: ${error.message}`, 'red');
    }
    
    // 生成报告
    const report = this.generateReport();
    
    if (report.success && report.passRate >= 95) {
      this.log('\n🎉 回归测试通过！新版本可以发布', 'green');
      process.exit(0);
    } else {
      this.log('\n❌ 回归测试失败，请修复问题后重新测试', 'red');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const tester = new RegressionTester();
  await tester.run();
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

module.exports = RegressionTester;
