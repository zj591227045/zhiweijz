/**
 * 用户密码重置脚本
 * 
 * 此脚本用于在生产环境中重置用户密码：
 * 1. 支持重置单个用户密码（通过用户ID或邮箱）
 * 2. 支持批量重置所有用户密码为统一密码
 * 3. 支持生成随机密码并导出用户密码列表
 * 4. 提供完善的安全验证和日志记录
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * 密码相关常量
 */
const PASSWORD_CONFIG = {
  DEFAULT_PASSWORD: 'TempPass123!', // 默认临时密码
  MIN_LENGTH: 8,
  MAX_LENGTH: 50,
  SALT_ROUNDS: 10,
  RANDOM_PASSWORD_LENGTH: 12
};

/**
 * 生成随机密码
 */
function generateRandomPassword(length = PASSWORD_CONFIG.RANDOM_PASSWORD_LENGTH) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // 确保密码包含各种字符类型
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // 打乱密码字符顺序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * 验证密码强度
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, message: '密码不能为空' };
  }
  
  if (password.length < PASSWORD_CONFIG.MIN_LENGTH) {
    return { valid: false, message: `密码长度至少需要${PASSWORD_CONFIG.MIN_LENGTH}个字符` };
  }
  
  if (password.length > PASSWORD_CONFIG.MAX_LENGTH) {
    return { valid: false, message: `密码长度不能超过${PASSWORD_CONFIG.MAX_LENGTH}个字符` };
  }
  
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{}|;':\",./<>?]/.test(password);
  
  if (!hasLowercase || !hasUppercase || !hasNumbers || !hasSpecialChar) {
    return { 
      valid: false, 
      message: '密码必须包含大写字母、小写字母、数字和特殊字符' 
    };
  }
  
  return { valid: true, message: '密码强度验证通过' };
}

/**
 * 重置单个用户密码
 */
async function resetSingleUserPassword(userIdentifier, newPassword, options = {}) {
  try {
    const { generateRandom = false, logDetails = true } = options;
    
    // 确定查询条件
    let whereCondition;
    if (userIdentifier.includes('@')) {
      whereCondition = { email: userIdentifier };
    } else {
      whereCondition = { id: userIdentifier };
    }
    
    // 查找用户
    const user = await prisma.user.findUnique({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isActive: true
      }
    });
    
    if (!user) {
      throw new Error(`用户不存在: ${userIdentifier}`);
    }
    
    if (!user.isActive) {
      console.warn(`⚠️  用户已被禁用: ${user.email} (${user.id})`);
    }
    
    // 生成或验证密码
    let finalPassword = newPassword;
    if (generateRandom) {
      finalPassword = generateRandomPassword();
      console.log(`🔐 为用户 ${user.email} 生成随机密码: ${finalPassword}`);
    } else {
      const validation = validatePassword(finalPassword);
      if (!validation.valid) {
        throw new Error(`密码验证失败: ${validation.message}`);
      }
    }
    
    // 哈希密码
    const passwordHash = await bcrypt.hash(finalPassword, PASSWORD_CONFIG.SALT_ROUNDS);
    
    // 更新密码
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    if (logDetails) {
      console.log(`✅ 用户密码重置成功:`);
      console.log(`   用户ID: ${user.id}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   姓名: ${user.name}`);
      console.log(`   注册时间: ${user.createdAt.toLocaleString()}`);
      if (generateRandom) {
        console.log(`   新密码: ${finalPassword}`);
      }
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        newPassword: generateRandom ? finalPassword : '***'
      }
    };
    
  } catch (error) {
    console.error(`❌ 重置用户密码失败 (${userIdentifier}):`, error.message);
    return {
      success: false,
      user: null,
      error: error.message
    };
  }
}

/**
 * 批量重置用户密码
 */
async function resetAllUsersPassword(newPassword, options = {}) {
  try {
    const { 
      generateRandomForEach = false, 
      excludeAdmins = true,
      onlyActiveUsers = true,
      batchSize = 50,
      exportPasswordList = false 
    } = options;
    
    console.log('🚀 开始批量重置用户密码...');
    
    // 构建查询条件
    const whereCondition = {};
    if (onlyActiveUsers) {
      whereCondition.isActive = true;
    }
    
    // 获取所有符合条件的用户
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        isActive: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    console.log(`📊 找到 ${users.length} 个符合条件的用户`);
    
    if (users.length === 0) {
      console.log('❌ 没有找到符合条件的用户，脚本结束');
      return { success: true, results: [] };
    }
    
    let successCount = 0;
    const errors = [];
    const passwordResults = [];
    
    // 如果不是为每个用户生成随机密码，验证统一密码
    if (!generateRandomForEach) {
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(`统一密码验证失败: ${validation.message}`);
      }
    }
    
    // 分批处理用户
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      console.log(`\n🔄 处理第 ${Math.floor(i/batchSize) + 1} 批用户 (${i + 1}-${Math.min(i + batchSize, users.length)}/${users.length})`);
      
      for (const user of batch) {
        try {
          const userPassword = generateRandomForEach ? generateRandomPassword() : newPassword;
          const passwordHash = await bcrypt.hash(userPassword, PASSWORD_CONFIG.SALT_ROUNDS);
          
          await prisma.user.update({
            where: { id: user.id },
            data: {
              passwordHash,
              passwordChangedAt: new Date(),
              updatedAt: new Date()
            }
          });
          
          console.log(`   ✅ ${user.name} (${user.email})`);
          
          passwordResults.push({
            id: user.id,
            email: user.email,
            name: user.name,
            newPassword: userPassword,
            resetTime: new Date().toISOString()
          });
          
          successCount++;
          
        } catch (userError) {
          const errorMsg = `用户 ${user.email} (ID: ${user.id}) 重置失败: ${userError.message}`;
          console.error(`   ❌ ${errorMsg}`);
          errors.push({
            userId: user.id,
            email: user.email,
            error: userError.message
          });
        }
      }
      
      // 批次间添加延迟，避免数据库压力过大
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 导出密码列表
    if (exportPasswordList && passwordResults.length > 0) {
      await exportPasswordsToFile(passwordResults);
    }
    
    // 输出总结报告
    console.log('\n' + '='.repeat(60));
    console.log('📈 批量密码重置结果总结:');
    console.log(`✅ 成功重置密码的用户数: ${successCount}`);
    console.log(`❌ 失败用户数: ${errors.length}`);
    console.log(`📊 总用户数: ${users.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ 失败详情:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.email} (${error.userId}): ${error.error}`);
      });
    }
    
    console.log('\n🎉 批量密码重置完成！');
    
    return {
      success: true,
      results: passwordResults,
      summary: {
        total: users.length,
        success: successCount,
        failed: errors.length,
        errors
      }
    };
    
  } catch (error) {
    console.error('❌ 批量重置密码时发生错误:', error);
    throw error;
  }
}

/**
 * 导出密码列表到文件
 */
async function exportPasswordsToFile(passwordResults) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `user-passwords-${timestamp}.json`;
    const outputDir = path.join(__dirname, 'password-exports');
    
    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filePath = path.join(outputDir, filename);
    
    const exportData = {
      exportTime: new Date().toISOString(),
      totalUsers: passwordResults.length,
      note: '⚠️  此文件包含敏感信息，请妥善保管并及时删除',
      users: passwordResults
    };
    
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log(`📄 密码列表已导出到: ${filePath}`);
    console.log('⚠️  请妥善保管此文件，建议用户首次登录后立即修改密码');
    
  } catch (error) {
    console.error('❌ 导出密码列表失败:', error);
  }
}

/**
 * 查询用户信息
 */
async function queryUserInfo(userIdentifier) {
  try {
    let whereCondition;
    if (userIdentifier.includes('@')) {
      whereCondition = { email: userIdentifier };
    } else {
      whereCondition = { id: userIdentifier };
    }
    
    const user = await prisma.user.findUnique({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        passwordChangedAt: true,
        isActive: true,
        isCustodial: true,
        bio: true
      }
    });
    
    if (!user) {
      console.log(`❌ 用户不存在: ${userIdentifier}`);
      return null;
    }
    
    console.log('👤 用户信息:');
    console.log(`   ID: ${user.id}`);
    console.log(`   邮箱: ${user.email}`);
    console.log(`   姓名: ${user.name}`);
    console.log(`   状态: ${user.isActive ? '激活' : '禁用'}`);
    console.log(`   账户类型: ${user.isCustodial ? '托管账户' : '普通账户'}`);
    console.log(`   注册时间: ${user.createdAt.toLocaleString()}`);
    console.log(`   最后更新: ${user.updatedAt.toLocaleString()}`);
    console.log(`   密码修改时间: ${user.passwordChangedAt ? user.passwordChangedAt.toLocaleString() : '从未修改'}`);
    if (user.bio) {
      console.log(`   个人简介: ${user.bio}`);
    }
    
    return user;
    
  } catch (error) {
    console.error(`❌ 查询用户信息失败:`, error);
    return null;
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🔐 用户密码重置脚本使用指南

📋 使用方法:
  node reset-user-password.js [command] [options]

🎯 命令列表:

  1. 重置单个用户密码:
     node reset-user-password.js single <userEmail|userId> [newPassword]
     
     示例:
     node reset-user-password.js single user@example.com MyNewPass123!
     node reset-user-password.js single uuid-string MyNewPass123!
     
  2. 重置单个用户密码（生成随机密码）:
     node reset-user-password.js single-random <userEmail|userId>
     
     示例:
     node reset-user-password.js single-random user@example.com
     
  3. 批量重置所有用户密码（统一密码）:
     node reset-user-password.js batch-all <newPassword>
     
     示例:
     node reset-user-password.js batch-all TempPass123!
     
  4. 批量重置所有用户密码（每个用户随机密码）:
     node reset-user-password.js batch-random [--export]
     
     示例:
     node reset-user-password.js batch-random --export
     
  5. 查询用户信息:
     node reset-user-password.js query <userEmail|userId>
     
     示例:
     node reset-user-password.js query user@example.com
     
  6. 显示帮助信息:
     node reset-user-password.js help

⚠️  安全提示:
  - 运行前请备份数据库
  - 确保新密码符合安全要求
  - 批量操作会影响所有用户，请谨慎使用
  - 生成的密码文件包含敏感信息，请妥善保管
  - 建议用户首次登录后立即修改密码

📊 密码要求:
  - 长度: ${PASSWORD_CONFIG.MIN_LENGTH}-${PASSWORD_CONFIG.MAX_LENGTH} 字符
  - 必须包含: 大写字母、小写字母、数字、特殊字符
`);
}

/**
 * 主函数
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === 'help') {
      showHelp();
      return;
    }
    
    const command = args[0];
    
    console.log('🔐 用户密码重置脚本启动');
    console.log('=' .repeat(60));
    
    switch (command) {
      case 'single': {
        if (args.length < 2) {
          console.log('❌ 缺少参数。用法: single <userEmail|userId> [newPassword]');
          return;
        }
        
        const userIdentifier = args[1];
        const newPassword = args[2] || PASSWORD_CONFIG.DEFAULT_PASSWORD;
        
        await resetSingleUserPassword(userIdentifier, newPassword);
        break;
      }
      
      case 'single-random': {
        if (args.length < 2) {
          console.log('❌ 缺少参数。用法: single-random <userEmail|userId>');
          return;
        }
        
        const userIdentifier = args[1];
        await resetSingleUserPassword(userIdentifier, '', { generateRandom: true });
        break;
      }
      
      case 'batch-all': {
        if (args.length < 2) {
          console.log('❌ 缺少参数。用法: batch-all <newPassword>');
          return;
        }
        
        const newPassword = args[1];
        await resetAllUsersPassword(newPassword, { 
          generateRandomForEach: false,
          exportPasswordList: false
        });
        break;
      }
      
      case 'batch-random': {
        const exportPassword = args.includes('--export');
        await resetAllUsersPassword('', { 
          generateRandomForEach: true,
          exportPasswordList: exportPassword
        });
        break;
      }
      
      case 'query': {
        if (args.length < 2) {
          console.log('❌ 缺少参数。用法: query <userEmail|userId>');
          return;
        }
        
        const userIdentifier = args[1];
        await queryUserInfo(userIdentifier);
        break;
      }
      
      default:
        console.log(`❌ 未知命令: ${command}`);
        showHelp();
        break;
    }
    
  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  resetSingleUserPassword,
  resetAllUsersPassword,
  queryUserInfo,
  generateRandomPassword,
  validatePassword
}; 