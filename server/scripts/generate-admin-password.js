#!/usr/bin/env node

/**
 * 管理员密码哈希生成工具
 * 用于生成bcrypt密码哈希，供数据库迁移使用
 */

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 生成密码哈希
 */
async function generatePasswordHash(password) {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    throw new Error(`生成密码哈希失败: ${error.message}`);
  }
}

/**
 * 验证密码哈希
 */
async function verifyPasswordHash(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`验证密码哈希失败: ${error.message}`);
  }
}

/**
 * 交互式密码输入
 */
function promptPassword(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('=== 管理员密码哈希生成工具 ===\n');
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    let password;
    
    if (args.length > 0) {
      // 从命令行参数获取密码
      password = args[0];
      console.log('使用命令行提供的密码...');
    } else {
      // 交互式输入密码
      password = await promptPassword('请输入管理员密码: ');
      
      if (!password || password.trim() === '') {
        console.error('密码不能为空');
        process.exit(1);
      }
      
      // 确认密码
      const confirmPassword = await promptPassword('请确认密码: ');
      
      if (password !== confirmPassword) {
        console.error('两次输入的密码不一致');
        process.exit(1);
      }
    }
    
    // 密码强度检查
    if (password.length < 8) {
      console.warn('警告: 密码长度小于8位，建议使用更强的密码');
    }
    
    // 生成哈希
    console.log('\n正在生成密码哈希...');
    const hash = await generatePasswordHash(password);
    
    // 验证哈希
    console.log('验证密码哈希...');
    const isValid = await verifyPasswordHash(password, hash);
    
    if (isValid) {
      console.log('\n=== 生成结果 ===');
      console.log('密码哈希:');
      console.log(hash);
      console.log('\n=== SQL 语句 ===');
      console.log(`INSERT INTO admins (username, password_hash, email, role, is_active) 
VALUES ('admin', '${hash}', 'admin@zhiweijz.com', 'SUPER_ADMIN', true)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;`);
      console.log('\n=== 环境变量 ===');
      console.log(`DEFAULT_ADMIN_PASSWORD=${password}`);
      console.log('\n注意: 请妥善保管密码和哈希值，不要泄露给他人');
    } else {
      console.error('密码哈希验证失败');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`管理员密码哈希生成工具

用法:
  node generate-admin-password.js [密码]

参数:
  密码        可选，直接指定密码，不指定则交互式输入

示例:
  node generate-admin-password.js                    # 交互式输入
  node generate-admin-password.js mySecurePassword   # 直接指定密码

选项:
  -h, --help  显示此帮助信息

注意:
  生成的哈希值可用于数据库迁移脚本或环境变量配置`);
}

// 检查帮助参数
if (process.argv.includes('-h') || process.argv.includes('--help')) {
  showHelp();
  process.exit(0);
}

// 运行主程序
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  generatePasswordHash,
  verifyPasswordHash
}; 