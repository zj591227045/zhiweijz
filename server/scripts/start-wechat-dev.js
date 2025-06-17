#!/usr/bin/env node

/**
 * 微信集成开发环境启动脚本
 * 用于快速启动和测试微信集成功能
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class WechatDevStarter {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.envFile = path.join(this.projectRoot, '.env');
  }

  /**
   * 检查环境配置
   */
  checkEnvironment() {
    console.log('🔍 检查环境配置...');
    
    // 检查.env文件
    if (!fs.existsSync(this.envFile)) {
      console.log('❌ 未找到.env文件');
      console.log('请复制.env.wechat.example为.env并配置相关参数');
      return false;
    }

    // 读取环境变量
    const envContent = fs.readFileSync(this.envFile, 'utf8');
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'WECHAT_APP_ID',
      'WECHAT_APP_SECRET',
      'WECHAT_TOKEN'
    ];

    const missingVars = [];
    requiredVars.forEach(varName => {
      if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your_`)) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      console.log('❌ 以下环境变量未配置或使用默认值:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('请在.env文件中配置这些变量');
      return false;
    }

    console.log('✅ 环境配置检查通过');
    return true;
  }

  /**
   * 检查数据库连接
   */
  async checkDatabase() {
    console.log('🗄️ 检查数据库连接...');
    
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      
      console.log('✅ 数据库连接正常');
      return true;
    } catch (error) {
      console.log('❌ 数据库连接失败:', error.message);
      console.log('请检查DATABASE_URL配置和数据库服务状态');
      return false;
    }
  }

  /**
   * 运行数据库迁移
   */
  async runMigrations() {
    console.log('🔄 运行数据库迁移...');
    
    return new Promise((resolve) => {
      const migration = spawn('npm', ['run', 'migrate:upgrade'], {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      migration.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 数据库迁移完成');
          resolve(true);
        } else {
          console.log('❌ 数据库迁移失败');
          resolve(false);
        }
      });
    });
  }

  /**
   * 构建项目
   */
  async buildProject() {
    console.log('🔨 构建项目...');
    
    return new Promise((resolve) => {
      const build = spawn('npm', ['run', 'build'], {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      build.on('close', (code) => {
        if (code === 0) {
          console.log('✅ 项目构建完成');
          resolve(true);
        } else {
          console.log('❌ 项目构建失败');
          resolve(false);
        }
      });
    });
  }

  /**
   * 启动开发服务器
   */
  async startDevServer() {
    console.log('🚀 启动开发服务器...');
    
    const server = spawn('npm', ['run', 'dev'], {
      cwd: this.projectRoot,
      stdio: 'inherit'
    });

    // 处理进程退出
    process.on('SIGINT', () => {
      console.log('\n🛑 正在停止服务器...');
      server.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 正在停止服务器...');
      server.kill('SIGTERM');
      process.exit(0);
    });

    server.on('close', (code) => {
      console.log(`服务器已停止 (退出码: ${code})`);
      process.exit(code);
    });
  }

  /**
   * 显示使用说明
   */
  showUsageInstructions() {
    console.log('\n📖 微信集成开发指南:');
    console.log('='.repeat(50));
    console.log('1. 服务器已启动在 http://localhost:3000');
    console.log('2. 微信回调地址: http://localhost:3000/api/wechat/callback');
    console.log('3. 健康检查: http://localhost:3000/api/wechat/health');
    console.log('');
    console.log('🔧 开发工具:');
    console.log('- 运行测试: npm run test:wechat');
    console.log('- 查看日志: tail -f logs/combined.log');
    console.log('- 数据库管理: npm run db:studio');
    console.log('');
    console.log('📱 微信测试:');
    console.log('1. 使用ngrok等工具暴露本地端口到公网');
    console.log('2. 在微信公众平台配置服务器URL');
    console.log('3. 发送测试消息验证功能');
    console.log('');
    console.log('按 Ctrl+C 停止服务器');
    console.log('='.repeat(50));
  }

  /**
   * 主启动流程
   */
  async start() {
    console.log('🎯 只为记账 - 微信集成开发环境启动器');
    console.log('='.repeat(50));

    // 检查环境配置
    if (!this.checkEnvironment()) {
      process.exit(1);
    }

    // 检查数据库连接
    if (!(await this.checkDatabase())) {
      process.exit(1);
    }

    // 运行数据库迁移
    if (!(await this.runMigrations())) {
      process.exit(1);
    }

    // 构建项目
    if (!(await this.buildProject())) {
      process.exit(1);
    }

    // 显示使用说明
    this.showUsageInstructions();

    // 启动开发服务器
    await this.startDevServer();
  }
}

// 运行启动器
if (require.main === module) {
  const starter = new WechatDevStarter();
  starter.start().catch(error => {
    console.error('启动失败:', error);
    process.exit(1);
  });
}

module.exports = WechatDevStarter;
