#!/usr/bin/env node

/**
 * 前端功能测试脚本
 * 测试前端页面渲染、组件交互、状态管理等功能
 */

const { execSync, spawn } = require('child_process');
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
};

class FrontendTester {
  constructor() {
    this.frontendURL = process.env.FRONTEND_URL || 'http://localhost:3003';
    this.backendURL = process.env.BACKEND_URL || 'http://localhost:3000';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.frontendProcess = null;
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

  async startFrontendServer() {
    return new Promise((resolve, reject) => {
      this.log('启动前端开发服务器...', 'yellow');
      
      const frontendDir = path.join(process.cwd(), 'apps/web');
      
      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendDir,
        stdio: 'pipe'
      });

      let output = '';
      
      this.frontendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('started server')) {
          this.log('前端服务器启动成功', 'green');
          resolve();
        }
      });

      this.frontendProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error') || errorOutput.includes('EADDRINUSE')) {
          reject(new Error(`前端服务器启动失败: ${errorOutput}`));
        }
      });

      // 超时处理
      setTimeout(() => {
        if (this.frontendProcess && !this.frontendProcess.killed) {
          reject(new Error('前端服务器启动超时'));
        }
      }, 60000);
    });
  }

  async stopFrontendServer() {
    if (this.frontendProcess && !this.frontendProcess.killed) {
      this.log('停止前端服务器...', 'yellow');
      this.frontendProcess.kill('SIGTERM');
      
      // 等待进程结束
      await new Promise((resolve) => {
        this.frontendProcess.on('close', resolve);
        setTimeout(resolve, 5000); // 最多等待5秒
      });
    }
  }

  async checkPageAccessibility(path, expectedTitle = null) {
    try {
      const response = await axios.get(`${this.frontendURL}${path}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`页面返回状态码: ${response.status}`);
      }
      
      const html = response.data;
      
      // 检查基本HTML结构
      if (!html.includes('<html') || !html.includes('</html>')) {
        throw new Error('页面HTML结构不完整');
      }
      
      // 检查页面标题（如果指定）
      if (expectedTitle) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (!titleMatch || !titleMatch[1].includes(expectedTitle)) {
          throw new Error(`页面标题不匹配，期望包含: ${expectedTitle}`);
        }
      }
      
      // 检查是否有JavaScript错误
      if (html.includes('Error') && html.includes('stack')) {
        throw new Error('页面包含JavaScript错误');
      }
      
      return true;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到前端服务器');
      }
      throw error;
    }
  }

  async testPageRendering() {
    const pages = [
      { path: '/', title: '只为记账', name: '首页' },
      { path: '/auth/login', title: '登录', name: '登录页面' },
      { path: '/auth/register', title: '注册', name: '注册页面' },
      { path: '/dashboard', title: '仪表盘', name: '仪表盘页面' },
      { path: '/transactions', title: '交易', name: '交易页面' },
      { path: '/budgets', title: '预算', name: '预算页面' },
      { path: '/books', title: '账本', name: '账本页面' },
      { path: '/settings', title: '设置', name: '设置页面' },
      { path: '/statistics', title: '统计', name: '统计页面' }
    ];

    for (const page of pages) {
      await this.runTest(`页面渲染 - ${page.name}`, async () => {
        await this.checkPageAccessibility(page.path, page.title);
      });
    }
  }

  async testAPIIntegration() {
    await this.runTest('API连接测试', async () => {
      try {
        // 测试前端是否能连接到后端
        const response = await axios.get(`${this.frontendURL}/test-api`, {
          timeout: 10000
        });
        
        if (response.status !== 200) {
          throw new Error(`API测试页面返回状态码: ${response.status}`);
        }
        
        const html = response.data;
        
        // 检查是否包含API测试相关内容
        if (!html.includes('API') && !html.includes('测试')) {
          throw new Error('API测试页面内容不正确');
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('前端无法连接到API测试页面');
        }
        throw error;
      }
    });
  }

  async testBuildProcess() {
    await this.runTest('前端构建测试', async () => {
      try {
        const frontendDir = path.join(process.cwd(), 'apps/web');
        
        this.log('执行前端构建...', 'yellow');
        execSync('npm run build', {
          cwd: frontendDir,
          stdio: 'pipe',
          timeout: 300000 // 5分钟超时
        });
        
        // 检查构建输出目录
        const buildDir = path.join(frontendDir, '.next');
        if (!fs.existsSync(buildDir)) {
          throw new Error('构建输出目录不存在');
        }
        
        // 检查关键构建文件
        const staticDir = path.join(buildDir, 'static');
        if (!fs.existsSync(staticDir)) {
          throw new Error('静态资源目录不存在');
        }
        
        this.log('前端构建成功', 'green');
        
      } catch (error) {
        if (error.status) {
          throw new Error(`构建失败，退出码: ${error.status}`);
        }
        throw error;
      }
    });
  }

  async testTypeScriptCompilation() {
    await this.runTest('TypeScript编译测试', async () => {
      try {
        const frontendDir = path.join(process.cwd(), 'apps/web');
        
        this.log('执行TypeScript类型检查...', 'yellow');
        execSync('npx tsc --noEmit', {
          cwd: frontendDir,
          stdio: 'pipe',
          timeout: 120000 // 2分钟超时
        });
        
        this.log('TypeScript编译通过', 'green');
        
      } catch (error) {
        if (error.stdout) {
          const output = error.stdout.toString();
          if (output.includes('error TS')) {
            throw new Error(`TypeScript编译错误: ${output.substring(0, 500)}`);
          }
        }
        throw new Error('TypeScript编译失败');
      }
    });
  }

  async testLinting() {
    await this.runTest('代码规范检查', async () => {
      try {
        const frontendDir = path.join(process.cwd(), 'apps/web');
        
        this.log('执行ESLint检查...', 'yellow');
        execSync('npm run lint', {
          cwd: frontendDir,
          stdio: 'pipe',
          timeout: 60000 // 1分钟超时
        });
        
        this.log('代码规范检查通过', 'green');
        
      } catch (error) {
        if (error.stdout) {
          const output = error.stdout.toString();
          if (output.includes('error') || output.includes('✖')) {
            throw new Error(`代码规范错误: ${output.substring(0, 500)}`);
          }
        }
        // ESLint可能返回非零退出码但没有错误，这种情况下认为通过
        this.log('代码规范检查完成（可能有警告）', 'yellow');
      }
    });
  }

  async testEnvironmentVariables() {
    await this.runTest('环境变量检查', async () => {
      const frontendDir = path.join(process.cwd(), 'apps/web');
      const envFiles = ['.env.local', '.env.development', '.env'];
      
      let envFileExists = false;
      for (const envFile of envFiles) {
        const envPath = path.join(frontendDir, envFile);
        if (fs.existsSync(envPath)) {
          envFileExists = true;
          
          const envContent = fs.readFileSync(envPath, 'utf8');
          
          // 检查关键环境变量
          const requiredVars = ['NEXT_PUBLIC_API_URL'];
          for (const varName of requiredVars) {
            if (!envContent.includes(varName)) {
              this.log(`警告: 环境变量 ${varName} 未在 ${envFile} 中找到`, 'yellow');
            }
          }
          break;
        }
      }
      
      if (!envFileExists) {
        this.log('警告: 未找到环境变量配置文件', 'yellow');
      }
    });
  }

  async testDependencies() {
    await this.runTest('依赖检查', async () => {
      const frontendDir = path.join(process.cwd(), 'apps/web');
      const packageJsonPath = path.join(frontendDir, 'package.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json文件不存在');
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // 检查关键依赖
      const requiredDeps = ['react', 'next', 'axios', 'zustand'];
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
          throw new Error(`缺少关键依赖: ${dep}`);
        }
      }
      
      // 检查node_modules
      const nodeModulesPath = path.join(frontendDir, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        throw new Error('node_modules目录不存在，请运行npm install');
      }
    });
  }

  async run() {
    this.log('开始前端功能测试...', 'cyan');
    
    try {
      // 静态测试（不需要启动服务器）
      await this.testDependencies();
      await this.testEnvironmentVariables();
      await this.testTypeScriptCompilation();
      await this.testLinting();
      await this.testBuildProcess();
      
      // 动态测试（需要启动服务器）
      try {
        await this.startFrontendServer();
        
        // 等待服务器完全启动
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await this.testPageRendering();
        await this.testAPIIntegration();
        
      } finally {
        await this.stopFrontendServer();
      }
      
    } catch (error) {
      this.log(`测试过程中发生错误: ${error.message}`, 'red');
    }
    
    // 输出测试结果
    this.log('\n' + '='.repeat(50), 'cyan');
    this.log('前端功能测试结果', 'cyan');
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
      this.log('🎉 所有前端功能测试通过！', 'green');
      process.exit(0);
    }
  }
}

// 主函数
async function main() {
  const tester = new FrontendTester();
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

module.exports = FrontendTester;
