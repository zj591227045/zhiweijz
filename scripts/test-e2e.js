#!/usr/bin/env node

/**
 * 端到端集成测试脚本
 * 测试完整的用户流程，确保前后端协作正常
 */

const { spawn } = require('child_process');
const axios = require('axios');
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
};

class E2ETester {
  constructor() {
    this.frontendURL = process.env.FRONTEND_URL || 'http://localhost:3003';
    this.backendURL = process.env.BACKEND_URL || 'http://localhost:3000/api';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.processes = {
      frontend: null,
      backend: null
    };
    this.testUser = {
      email: 'e2e-test@zhiweijz.com',
      password: 'E2ETestPassword123!',
      name: 'E2E测试用户'
    };
    this.authToken = null;
    this.testData = {};
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

  async startServices() {
    this.log('启动后端服务...', 'yellow');
    await this.startBackend();
    
    this.log('启动前端服务...', 'yellow');
    await this.startFrontend();
    
    // 等待服务完全启动
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      const serverDir = path.join(process.cwd(), 'server');
      
      this.processes.backend = spawn('npm', ['run', 'dev'], {
        cwd: serverDir,
        stdio: 'pipe'
      });

      let output = '';
      
      this.processes.backend.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running') || output.includes('listening')) {
          this.log('后端服务启动成功', 'green');
          resolve();
        }
      });

      this.processes.backend.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error') || errorOutput.includes('EADDRINUSE')) {
          reject(new Error(`后端服务启动失败: ${errorOutput}`));
        }
      });

      setTimeout(() => {
        if (this.processes.backend && !this.processes.backend.killed) {
          reject(new Error('后端服务启动超时'));
        }
      }, 60000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      const frontendDir = path.join(process.cwd(), 'apps/web');
      
      this.processes.frontend = spawn('npm', ['run', 'dev'], {
        cwd: frontendDir,
        stdio: 'pipe'
      });

      let output = '';
      
      this.processes.frontend.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('started server')) {
          this.log('前端服务启动成功', 'green');
          resolve();
        }
      });

      this.processes.frontend.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error') || errorOutput.includes('EADDRINUSE')) {
          reject(new Error(`前端服务启动失败: ${errorOutput}`));
        }
      });

      setTimeout(() => {
        if (this.processes.frontend && !this.processes.frontend.killed) {
          reject(new Error('前端服务启动超时'));
        }
      }, 60000);
    });
  }

  async stopServices() {
    this.log('停止服务...', 'yellow');
    
    if (this.processes.frontend && !this.processes.frontend.killed) {
      this.processes.frontend.kill('SIGTERM');
    }
    
    if (this.processes.backend && !this.processes.backend.killed) {
      this.processes.backend.kill('SIGTERM');
    }
    
    // 等待进程结束
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async makeAPIRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.backendURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async checkPageResponse(path) {
    try {
      const response = await axios.get(`${this.frontendURL}${path}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; E2ETestBot/1.0)'
        }
      });
      
      return {
        success: response.status === 200,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 500,
        error: error.message
      };
    }
  }

  async testServiceConnectivity() {
    await this.runTest('服务连通性测试', async () => {
      // 测试后端API
      const backendResponse = await this.makeAPIRequest('GET', '/auth/check');
      if (backendResponse.status !== 401 && backendResponse.status !== 200) {
        throw new Error(`后端API响应异常: ${backendResponse.status}`);
      }
      
      // 测试前端页面
      const frontendResponse = await this.checkPageResponse('/');
      if (!frontendResponse.success) {
        throw new Error(`前端页面访问失败: ${frontendResponse.status}`);
      }
    });
  }

  async testUserRegistrationFlow() {
    await this.runTest('用户注册流程', async () => {
      // 1. 访问注册页面
      const registerPageResponse = await this.checkPageResponse('/auth/register');
      if (!registerPageResponse.success) {
        throw new Error('无法访问注册页面');
      }
      
      // 2. 通过API注册用户
      const registerResponse = await this.makeAPIRequest('POST', '/auth/register', this.testUser);
      if (!registerResponse.success) {
        // 如果用户已存在，先删除再注册
        if (registerResponse.error?.message?.includes('已存在')) {
          this.log('用户已存在，跳过注册', 'yellow');
        } else {
          throw new Error(`注册失败: ${JSON.stringify(registerResponse.error)}`);
        }
      } else {
        this.testData.userId = registerResponse.data.id;
      }
    });
  }

  async testUserLoginFlow() {
    await this.runTest('用户登录流程', async () => {
      // 1. 访问登录页面
      const loginPageResponse = await this.checkPageResponse('/auth/login');
      if (!loginPageResponse.success) {
        throw new Error('无法访问登录页面');
      }
      
      // 2. 通过API登录
      const loginResponse = await this.makeAPIRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (!loginResponse.success) {
        throw new Error(`登录失败: ${JSON.stringify(loginResponse.error)}`);
      }
      
      if (!loginResponse.data.token) {
        throw new Error('登录响应缺少token');
      }
      
      this.authToken = loginResponse.data.token;
      this.testData.user = loginResponse.data.user;
    });
  }

  async testDashboardAccess() {
    await this.runTest('仪表盘访问', async () => {
      const dashboardResponse = await this.checkPageResponse('/dashboard');
      if (!dashboardResponse.success) {
        throw new Error('无法访问仪表盘页面');
      }
      
      // 检查页面是否包含仪表盘相关内容
      const html = dashboardResponse.data;
      if (!html.includes('仪表盘') && !html.includes('dashboard')) {
        throw new Error('仪表盘页面内容不正确');
      }
    });
  }

  async testAccountBookManagement() {
    await this.runTest('账本管理流程', async () => {
      // 1. 访问账本页面
      const booksPageResponse = await this.checkPageResponse('/books');
      if (!booksPageResponse.success) {
        throw new Error('无法访问账本页面');
      }
      
      // 2. 获取账本列表
      const accountBooksResponse = await this.makeAPIRequest('GET', '/account-books');
      if (!accountBooksResponse.success) {
        throw new Error('获取账本列表失败');
      }
      
      // 3. 创建测试账本
      const createBookResponse = await this.makeAPIRequest('POST', '/account-books', {
        name: 'E2E测试账本',
        description: '端到端测试用账本',
        currency: 'CNY'
      });
      
      if (!createBookResponse.success) {
        throw new Error('创建账本失败');
      }
      
      this.testData.accountBook = createBookResponse.data;
    });
  }

  async testTransactionManagement() {
    await this.runTest('交易管理流程', async () => {
      // 1. 访问交易页面
      const transactionsPageResponse = await this.checkPageResponse('/transactions');
      if (!transactionsPageResponse.success) {
        throw new Error('无法访问交易页面');
      }
      
      // 2. 获取分类列表（创建交易需要）
      const categoriesResponse = await this.makeAPIRequest('GET', '/categories');
      if (!categoriesResponse.success || !categoriesResponse.data.length) {
        throw new Error('获取分类列表失败或分类为空');
      }
      
      const category = categoriesResponse.data[0];
      
      // 3. 创建测试交易
      const createTransactionResponse = await this.makeAPIRequest('POST', '/transactions', {
        amount: 100.50,
        type: 'EXPENSE',
        description: 'E2E测试交易',
        categoryId: category.id,
        accountBookId: this.testData.accountBook.id,
        date: new Date().toISOString()
      });
      
      if (!createTransactionResponse.success) {
        throw new Error('创建交易失败');
      }
      
      this.testData.transaction = createTransactionResponse.data;
      
      // 4. 获取交易列表
      const transactionsResponse = await this.makeAPIRequest('GET', '/transactions');
      if (!transactionsResponse.success) {
        throw new Error('获取交易列表失败');
      }
    });
  }

  async testBudgetManagement() {
    await this.runTest('预算管理流程', async () => {
      // 1. 访问预算页面
      const budgetsPageResponse = await this.checkPageResponse('/budgets');
      if (!budgetsPageResponse.success) {
        throw new Error('无法访问预算页面');
      }
      
      // 2. 获取分类列表
      const categoriesResponse = await this.makeAPIRequest('GET', '/categories');
      if (!categoriesResponse.success || !categoriesResponse.data.length) {
        throw new Error('获取分类列表失败');
      }
      
      const category = categoriesResponse.data[0];
      
      // 3. 创建测试预算
      const createBudgetResponse = await this.makeAPIRequest('POST', '/budgets', {
        name: 'E2E测试预算',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: category.id,
        accountBookId: this.testData.accountBook.id
      });
      
      if (!createBudgetResponse.success) {
        throw new Error('创建预算失败');
      }
      
      this.testData.budget = createBudgetResponse.data;
      
      // 4. 获取预算列表
      const budgetsResponse = await this.makeAPIRequest('GET', '/budgets');
      if (!budgetsResponse.success) {
        throw new Error('获取预算列表失败');
      }
    });
  }

  async testStatisticsAccess() {
    await this.runTest('统计页面访问', async () => {
      // 1. 访问统计页面
      const statisticsPageResponse = await this.checkPageResponse('/statistics');
      if (!statisticsPageResponse.success) {
        throw new Error('无法访问统计页面');
      }
      
      // 2. 获取统计数据
      const expenseStatsResponse = await this.makeAPIRequest('GET', '/statistics/expenses');
      if (!expenseStatsResponse.success) {
        throw new Error('获取支出统计失败');
      }
      
      const incomeStatsResponse = await this.makeAPIRequest('GET', '/statistics/income');
      if (!incomeStatsResponse.success) {
        throw new Error('获取收入统计失败');
      }
    });
  }

  async cleanup() {
    this.log('清理测试数据...', 'yellow');
    
    // 删除测试数据
    if (this.testData.transaction) {
      await this.makeAPIRequest('DELETE', `/transactions/${this.testData.transaction.id}`);
    }
    
    if (this.testData.budget) {
      await this.makeAPIRequest('DELETE', `/budgets/${this.testData.budget.id}`);
    }
    
    if (this.testData.accountBook) {
      await this.makeAPIRequest('DELETE', `/account-books/${this.testData.accountBook.id}`);
    }
  }

  async run() {
    this.log('开始端到端集成测试...', 'cyan');
    
    try {
      // 启动服务
      await this.startServices();
      
      // 运行测试
      await this.testServiceConnectivity();
      await this.testUserRegistrationFlow();
      await this.testUserLoginFlow();
      await this.testDashboardAccess();
      await this.testAccountBookManagement();
      await this.testTransactionManagement();
      await this.testBudgetManagement();
      await this.testStatisticsAccess();
      
    } catch (error) {
      this.log(`测试过程中发生错误: ${error.message}`, 'red');
    } finally {
      // 清理测试数据
      await this.cleanup();
      
      // 停止服务
      await this.stopServices();
    }
    
    // 输出测试结果
    this.log('\n' + '='.repeat(50), 'cyan');
    this.log('端到端集成测试结果', 'cyan');
    this.log('='.repeat(50), 'cyan');
    this.log(`通过: ${this.results.passed}`, 'green');
    this.log(`失败: ${this.results.failed}`, this.results.failed > 0 ? 'red' : 'green');
    
    if (this.results.failed > 0) {
      this.log('\n失败的测试:', 'red');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          this.log(`  ❌ ${test.name}: ${test.error}`, 'red');
        });
    }
    
    this.log('='.repeat(50), 'cyan');
    
    if (this.results.failed > 0) {
      process.exit(1);
    } else {
      this.log('🎉 所有端到端测试通过！', 'green');
      process.exit(0);
    }
  }
}

// 主函数
async function main() {
  const tester = new E2ETester();
  await tester.run();
}

// 处理进程退出
process.on('SIGINT', async () => {
  console.log('\n收到中断信号，正在清理...');
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = E2ETester;
