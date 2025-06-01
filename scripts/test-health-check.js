#!/usr/bin/env node

/**
 * 系统健康检查脚本
 * 快速检查系统各组件的健康状态
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
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

class HealthChecker {
  constructor() {
    this.frontendURL = process.env.FRONTEND_URL || 'http://localhost:3003';
    this.backendURL = process.env.BACKEND_URL || 'http://localhost:3000';
    this.results = {
      overall: 'unknown',
      components: {},
      timestamp: new Date(),
      issues: []
    };
  }

  log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkComponent(name, checkFunction) {
    try {
      this.log(`检查 ${name}...`, 'blue');
      const startTime = Date.now();
      const result = await checkFunction();
      const responseTime = Date.now() - startTime;
      
      this.results.components[name] = {
        status: 'healthy',
        responseTime,
        details: result,
        timestamp: new Date()
      };
      
      this.log(`✅ ${name} 健康 (${responseTime}ms)`, 'green');
      return true;
    } catch (error) {
      this.results.components[name] = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
      
      this.results.issues.push({
        component: name,
        error: error.message,
        severity: 'error'
      });
      
      this.log(`❌ ${name} 异常: ${error.message}`, 'red');
      return false;
    }
  }

  async checkBackendAPI() {
    return await this.checkComponent('后端API', async () => {
      // 检查基本连通性
      const response = await axios.get(`${this.backendURL}/api/auth/check`, {
        timeout: 5000,
        validateStatus: (status) => status === 401 || status === 200 // 401是正常的（未认证）
      });
      
      if (response.status !== 401 && response.status !== 200) {
        throw new Error(`API响应异常: ${response.status}`);
      }
      
      return {
        status: response.status,
        endpoint: '/api/auth/check'
      };
    });
  }

  async checkDatabase() {
    return await this.checkComponent('数据库', async () => {
      try {
        // 通过Prisma检查数据库连接
        const output = execSync('cd server && npx prisma db pull --print', {
          encoding: 'utf8',
          timeout: 10000,
          stdio: 'pipe'
        });
        
        return {
          connection: 'ok',
          schema: 'accessible'
        };
      } catch (error) {
        // 如果db pull失败，尝试简单的连接测试
        const testOutput = execSync('cd server && node -e "const { PrismaClient } = require(\'@prisma/client\'); const prisma = new PrismaClient(); prisma.$connect().then(() => { console.log(\'connected\'); process.exit(0); }).catch(() => process.exit(1));"', {
          encoding: 'utf8',
          timeout: 10000,
          stdio: 'pipe'
        });
        
        if (testOutput.includes('connected')) {
          return { connection: 'ok' };
        }
        
        throw new Error('数据库连接失败');
      }
    });
  }

  async checkFrontend() {
    return await this.checkComponent('前端服务', async () => {
      const response = await axios.get(this.frontendURL, {
        timeout: 10000,
        headers: {
          'User-Agent': 'HealthChecker/1.0'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`前端响应异常: ${response.status}`);
      }
      
      const html = response.data;
      
      // 检查基本HTML结构
      if (!html.includes('<html') || !html.includes('</html>')) {
        throw new Error('前端HTML结构不完整');
      }
      
      // 检查是否包含应用标识
      if (!html.includes('只为记账') && !html.includes('zhiweijz')) {
        throw new Error('前端内容不正确');
      }
      
      return {
        status: response.status,
        contentLength: html.length,
        hasValidStructure: true
      };
    });
  }

  async checkDiskSpace() {
    return await this.checkComponent('磁盘空间', async () => {
      try {
        const output = execSync('df -h .', { encoding: 'utf8' });
        const lines = output.split('\n');
        const dataLine = lines[1];
        const parts = dataLine.split(/\s+/);
        const usagePercent = parseInt(parts[4].replace('%', ''));
        
        if (usagePercent > 90) {
          throw new Error(`磁盘空间不足: ${usagePercent}%`);
        }
        
        if (usagePercent > 80) {
          this.results.issues.push({
            component: '磁盘空间',
            error: `磁盘使用率较高: ${usagePercent}%`,
            severity: 'warning'
          });
        }
        
        return {
          usage: `${usagePercent}%`,
          available: parts[3],
          total: parts[1]
        };
      } catch (error) {
        // 在Windows或其他系统上可能失败，使用备用方法
        const stats = fs.statSync('.');
        return {
          usage: 'unknown',
          note: '无法获取详细磁盘信息'
        };
      }
    });
  }

  async checkMemoryUsage() {
    return await this.checkComponent('内存使用', async () => {
      const used = process.memoryUsage();
      const totalMB = Math.round(used.rss / 1024 / 1024);
      const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
      
      if (totalMB > 1000) { // 1GB
        this.results.issues.push({
          component: '内存使用',
          error: `内存使用较高: ${totalMB}MB`,
          severity: 'warning'
        });
      }
      
      return {
        rss: `${totalMB}MB`,
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`
      };
    });
  }

  async checkNodeModules() {
    return await this.checkComponent('依赖完整性', async () => {
      const issues = [];
      
      // 检查根目录node_modules
      if (!fs.existsSync('node_modules')) {
        issues.push('根目录缺少node_modules');
      }
      
      // 检查server目录node_modules
      if (!fs.existsSync('server/node_modules')) {
        issues.push('server目录缺少node_modules');
      }
      
      // 检查前端目录node_modules
      if (!fs.existsSync('apps/web/node_modules')) {
        issues.push('前端目录缺少node_modules');
      }
      
      if (issues.length > 0) {
        throw new Error(issues.join(', '));
      }
      
      return {
        rootNodeModules: true,
        serverNodeModules: true,
        frontendNodeModules: true
      };
    });
  }

  async checkEnvironmentVariables() {
    return await this.checkComponent('环境变量', async () => {
      const issues = [];
      const warnings = [];
      
      // 检查关键环境变量
      const requiredVars = ['NODE_ENV'];
      const recommendedVars = ['DATABASE_URL', 'JWT_SECRET'];
      
      for (const varName of requiredVars) {
        if (!process.env[varName]) {
          issues.push(`缺少必需环境变量: ${varName}`);
        }
      }
      
      for (const varName of recommendedVars) {
        if (!process.env[varName]) {
          warnings.push(`建议设置环境变量: ${varName}`);
        }
      }
      
      if (issues.length > 0) {
        throw new Error(issues.join(', '));
      }
      
      if (warnings.length > 0) {
        warnings.forEach(warning => {
          this.results.issues.push({
            component: '环境变量',
            error: warning,
            severity: 'warning'
          });
        });
      }
      
      return {
        nodeEnv: process.env.NODE_ENV || 'undefined',
        hasDatabase: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET
      };
    });
  }

  async checkPortAvailability() {
    return await this.checkComponent('端口可用性', async () => {
      const ports = [
        { port: 3000, name: '后端API' },
        { port: 3003, name: '前端服务' },
        { port: 5432, name: 'PostgreSQL' }
      ];
      
      const results = {};
      
      for (const { port, name } of ports) {
        try {
          await axios.get(`http://localhost:${port}`, { timeout: 2000 });
          results[name] = { port, status: 'responding' };
        } catch (error) {
          if (error.code === 'ECONNREFUSED') {
            results[name] = { port, status: 'not_running' };
          } else {
            results[name] = { port, status: 'responding' }; // 可能是HTTP错误但服务在运行
          }
        }
      }
      
      return results;
    });
  }

  calculateOverallHealth() {
    const components = Object.values(this.results.components);
    const healthyCount = components.filter(c => c.status === 'healthy').length;
    const totalCount = components.length;
    
    const healthPercentage = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;
    
    if (healthPercentage >= 90) {
      this.results.overall = 'healthy';
    } else if (healthPercentage >= 70) {
      this.results.overall = 'degraded';
    } else {
      this.results.overall = 'unhealthy';
    }
    
    return {
      status: this.results.overall,
      percentage: healthPercentage,
      healthy: healthyCount,
      total: totalCount
    };
  }

  generateReport() {
    const overall = this.calculateOverallHealth();
    
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log('系统健康检查报告', 'bright');
    this.log('='.repeat(60), 'cyan');
    
    this.log(`检查时间: ${this.results.timestamp.toLocaleString()}`, 'blue');
    
    // 总体状态
    const statusColor = overall.status === 'healthy' ? 'green' : 
                       overall.status === 'degraded' ? 'yellow' : 'red';
    this.log(`\n总体状态: ${overall.status.toUpperCase()} (${overall.percentage.toFixed(1)}%)`, statusColor);
    this.log(`健康组件: ${overall.healthy}/${overall.total}`, 'blue');
    
    // 组件详情
    this.log('\n组件状态:', 'bright');
    Object.entries(this.results.components).forEach(([name, component]) => {
      const statusIcon = component.status === 'healthy' ? '✅' : '❌';
      const responseTime = component.responseTime ? ` (${component.responseTime}ms)` : '';
      this.log(`  ${statusIcon} ${name}${responseTime}`, 
        component.status === 'healthy' ? 'green' : 'red');
    });
    
    // 问题列表
    if (this.results.issues.length > 0) {
      this.log('\n发现的问题:', 'yellow');
      this.results.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        this.log(`  ${icon} ${issue.component}: ${issue.error}`, 
          issue.severity === 'error' ? 'red' : 'yellow');
      });
    }
    
    this.log('='.repeat(60), 'cyan');
    
    // 保存报告
    const reportPath = path.join(__dirname, '../test-reports', `health-check-${Date.now()}.json`);
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      ...this.results,
      overall
    }, null, 2));
    
    this.log(`健康检查报告已保存到: ${reportPath}`, 'blue');
    
    return overall;
  }

  async run() {
    this.log('开始系统健康检查...', 'bright');
    
    // 运行所有检查
    await this.checkEnvironmentVariables();
    await this.checkNodeModules();
    await this.checkDiskSpace();
    await this.checkMemoryUsage();
    await this.checkPortAvailability();
    await this.checkDatabase();
    await this.checkBackendAPI();
    await this.checkFrontend();
    
    // 生成报告
    const overall = this.generateReport();
    
    if (overall.status === 'healthy') {
      this.log('\n🎉 系统健康状态良好！', 'green');
      process.exit(0);
    } else if (overall.status === 'degraded') {
      this.log('\n⚠️ 系统状态降级，建议检查相关问题', 'yellow');
      process.exit(1);
    } else {
      this.log('\n❌ 系统状态异常，请立即处理', 'red');
      process.exit(2);
    }
  }
}

// 主函数
async function main() {
  const checker = new HealthChecker();
  await checker.run();
}

if (require.main === module) {
  main();
}

module.exports = HealthChecker;
