#!/usr/bin/env node

/**
 * 后端API完整性测试脚本
 * 测试所有API端点的功能，确保后端服务正常工作
 */

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

class BackendAPITester {
  constructor() {
    // 智能检测API地址
    this.baseURL = this.detectAPIBaseURL();
    this.testUser = {
      email: 'test-api@zhiweijz.com',
      password: 'TestPassword123!',
      name: 'API测试用户'
    };
    this.authToken = null;
    this.testData = {};
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  detectAPIBaseURL() {
    // 优先使用环境变量
    if (process.env.API_BASE_URL) {
      return process.env.API_BASE_URL;
    }

    if (process.env.BACKEND_URL) {
      return `${process.env.BACKEND_URL}/api`;
    }

    // 检测Docker环境
    if (process.env.DOCKER_ENV || process.env.NODE_ENV === 'docker') {
      return 'http://localhost:8080/api';
    }

    // 默认开发环境
    return 'http://localhost:3000/api';
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
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

  // 认证相关测试
  async testAuthentication() {
    await this.runTest('用户注册', async () => {
      // 先尝试删除测试用户（如果存在）
      await this.makeRequest('DELETE', `/users/test-cleanup?email=${this.testUser.email}`);
      
      const result = await this.makeRequest('POST', '/auth/register', this.testUser);
      if (!result.success) {
        throw new Error(`注册失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.id || !result.data.email) {
        throw new Error('注册响应缺少必要字段');
      }
      
      this.testData.userId = result.data.id;
    });

    await this.runTest('用户登录', async () => {
      const result = await this.makeRequest('POST', '/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      if (!result.success) {
        throw new Error(`登录失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.token || !result.data.user) {
        throw new Error('登录响应缺少token或用户信息');
      }
      
      this.authToken = result.data.token;
      this.testData.user = result.data.user;
    });

    await this.runTest('认证状态检查', async () => {
      const result = await this.makeRequest('GET', '/auth/check');
      if (!result.success) {
        throw new Error(`认证检查失败: ${JSON.stringify(result.error)}`);
      }
    });
  }

  // 账本相关测试
  async testAccountBooks() {
    await this.runTest('获取账本列表', async () => {
      const result = await this.makeRequest('GET', '/account-books');
      if (!result.success) {
        throw new Error(`获取账本列表失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!Array.isArray(result.data)) {
        throw new Error('账本列表应该是数组');
      }
      
      this.testData.accountBooks = result.data;
    });

    await this.runTest('创建账本', async () => {
      const accountBookData = {
        name: 'API测试账本',
        description: '用于API测试的账本',
        currency: 'CNY'
      };
      
      const result = await this.makeRequest('POST', '/account-books', accountBookData);
      if (!result.success) {
        throw new Error(`创建账本失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.id || result.data.name !== accountBookData.name) {
        throw new Error('创建账本响应数据不正确');
      }
      
      this.testData.testAccountBook = result.data;
    });

    await this.runTest('获取单个账本', async () => {
      const result = await this.makeRequest('GET', `/account-books/${this.testData.testAccountBook.id}`);
      if (!result.success) {
        throw new Error(`获取账本详情失败: ${JSON.stringify(result.error)}`);
      }
      
      if (result.data.id !== this.testData.testAccountBook.id) {
        throw new Error('获取的账本ID不匹配');
      }
    });
  }

  // 分类相关测试
  async testCategories() {
    await this.runTest('获取分类列表', async () => {
      const result = await this.makeRequest('GET', '/categories');
      if (!result.success) {
        throw new Error(`获取分类列表失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!Array.isArray(result.data)) {
        throw new Error('分类列表应该是数组');
      }
      
      this.testData.categories = result.data;
    });

    await this.runTest('创建自定义分类', async () => {
      const categoryData = {
        name: 'API测试分类',
        type: 'EXPENSE',
        icon: 'test-icon'
      };
      
      const result = await this.makeRequest('POST', '/categories', categoryData);
      if (!result.success) {
        throw new Error(`创建分类失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.id || result.data.name !== categoryData.name) {
        throw new Error('创建分类响应数据不正确');
      }
      
      this.testData.testCategory = result.data;
    });
  }

  // 交易相关测试
  async testTransactions() {
    await this.runTest('创建交易记录', async () => {
      const transactionData = {
        amount: 100.50,
        type: 'EXPENSE',
        description: 'API测试交易',
        categoryId: this.testData.testCategory.id,
        accountBookId: this.testData.testAccountBook.id,
        date: new Date().toISOString()
      };
      
      const result = await this.makeRequest('POST', '/transactions', transactionData);
      if (!result.success) {
        throw new Error(`创建交易失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.id || result.data.amount !== transactionData.amount) {
        throw new Error('创建交易响应数据不正确');
      }
      
      this.testData.testTransaction = result.data;
    });

    await this.runTest('获取交易列表', async () => {
      const result = await this.makeRequest('GET', '/transactions');
      if (!result.success) {
        throw new Error(`获取交易列表失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.data || !Array.isArray(result.data.data)) {
        throw new Error('交易列表响应格式不正确');
      }
    });

    await this.runTest('更新交易记录', async () => {
      const updateData = {
        amount: 150.75,
        description: 'API测试交易（已更新）'
      };
      
      const result = await this.makeRequest('PUT', `/transactions/${this.testData.testTransaction.id}`, updateData);
      if (!result.success) {
        throw new Error(`更新交易失败: ${JSON.stringify(result.error)}`);
      }
      
      if (result.data.amount !== updateData.amount) {
        throw new Error('更新交易响应数据不正确');
      }
    });
  }

  // 预算相关测试
  async testBudgets() {
    await this.runTest('创建预算', async () => {
      const budgetData = {
        name: 'API测试预算',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: this.testData.testCategory.id,
        accountBookId: this.testData.testAccountBook.id
      };
      
      const result = await this.makeRequest('POST', '/budgets', budgetData);
      if (!result.success) {
        throw new Error(`创建预算失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.id || result.data.name !== budgetData.name) {
        throw new Error('创建预算响应数据不正确');
      }
      
      this.testData.testBudget = result.data;
    });

    await this.runTest('获取预算列表', async () => {
      const result = await this.makeRequest('GET', '/budgets');
      if (!result.success) {
        throw new Error(`获取预算列表失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!result.data.data || !Array.isArray(result.data.data)) {
        throw new Error('预算列表响应格式不正确');
      }
    });

    await this.runTest('获取活跃预算', async () => {
      const result = await this.makeRequest('GET', '/budgets/active');
      if (!result.success) {
        throw new Error(`获取活跃预算失败: ${JSON.stringify(result.error)}`);
      }
      
      if (!Array.isArray(result.data)) {
        throw new Error('活跃预算列表应该是数组');
      }
    });
  }

  // 统计相关测试
  async testStatistics() {
    await this.runTest('获取支出统计', async () => {
      const result = await this.makeRequest('GET', '/statistics/expenses');
      if (!result.success) {
        throw new Error(`获取支出统计失败: ${JSON.stringify(result.error)}`);
      }
    });

    await this.runTest('获取收入统计', async () => {
      const result = await this.makeRequest('GET', '/statistics/income');
      if (!result.success) {
        throw new Error(`获取收入统计失败: ${JSON.stringify(result.error)}`);
      }
    });

    await this.runTest('获取预算统计', async () => {
      const result = await this.makeRequest('GET', '/statistics/budgets');
      if (!result.success) {
        throw new Error(`获取预算统计失败: ${JSON.stringify(result.error)}`);
      }
    });
  }

  // 清理测试数据
  async cleanup() {
    this.log('清理测试数据...', 'yellow');
    
    // 删除测试交易
    if (this.testData.testTransaction) {
      await this.makeRequest('DELETE', `/transactions/${this.testData.testTransaction.id}`);
    }
    
    // 删除测试预算
    if (this.testData.testBudget) {
      await this.makeRequest('DELETE', `/budgets/${this.testData.testBudget.id}`);
    }
    
    // 删除测试分类
    if (this.testData.testCategory) {
      await this.makeRequest('DELETE', `/categories/${this.testData.testCategory.id}`);
    }
    
    // 删除测试账本
    if (this.testData.testAccountBook) {
      await this.makeRequest('DELETE', `/account-books/${this.testData.testAccountBook.id}`);
    }
  }

  async checkBackendAvailability() {
    this.log(`检查后端服务可用性: ${this.baseURL}`, 'yellow');

    try {
      const result = await this.makeRequest('GET', '/auth/check');
      if (result.status === 401 || result.status === 200) {
        this.log('✅ 后端服务可用', 'green');
        return true;
      } else {
        throw new Error(`后端服务响应异常: ${result.status}`);
      }
    } catch (error) {
      this.log('❌ 后端服务不可用', 'red');
      this.log('请确保后端服务正在运行:', 'yellow');
      this.log('  开发环境: cd server && npm run dev', 'yellow');
      this.log('  Docker环境: cd docker && ./start.sh', 'yellow');
      throw new Error(`无法连接到后端服务: ${error.message}`);
    }
  }

  async run() {
    this.log('开始后端API测试...', 'cyan');
    this.log(`API地址: ${this.baseURL}`, 'blue');

    try {
      // 检查后端服务可用性
      await this.checkBackendAvailability();

      // 运行所有测试
      await this.testAuthentication();
      await this.testAccountBooks();
      await this.testCategories();
      await this.testTransactions();
      await this.testBudgets();
      await this.testStatistics();
      
    } catch (error) {
      this.log(`测试过程中发生错误: ${error.message}`, 'red');
    } finally {
      // 清理测试数据
      await this.cleanup();
    }
    
    // 输出测试结果
    this.log('\n' + '='.repeat(50), 'cyan');
    this.log('后端API测试结果', 'cyan');
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
      this.log('🎉 所有后端API测试通过！', 'green');
      process.exit(0);
    }
  }
}

// 主函数
async function main() {
  const tester = new BackendAPITester();
  await tester.run();
}

if (require.main === module) {
  main();
}

module.exports = BackendAPITester;
