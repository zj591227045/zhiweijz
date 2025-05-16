// 测试脚本：测试账本API
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

// 生成JWT令牌
function generateToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

async function main() {
  try {
    console.log('开始测试账本API...');
    
    // 1. 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      }
    });
    
    if (users.length === 0) {
      console.log('没有找到用户，无法继续测试');
      return;
    }
    
    console.log(`系统中共有 ${users.length} 个用户`);
    
    // 2. 为每个用户测试账本API
    for (const user of users) {
      console.log(`\n测试用户 ${user.email} 的账本API:`);
      
      // 生成用户的JWT令牌
      const token = generateToken({
        id: user.id,
        email: user.email,
      });
      
      // 设置请求头
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      // 测试获取账本列表API
      try {
        console.log(`调用账本列表API: GET ${API_URL}/account-books`);
        const response = await axios.get(`${API_URL}/account-books`, { headers });
        
        console.log(`API响应状态: ${response.status}`);
        console.log('API响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log(`API返回 ${response.data.data.length} 个账本, 总数: ${response.data.total}`);
          
          if (response.data.data.length === 0 && response.data.total === 0) {
            // 检查数据库中是否真的没有账本
            const dbAccountBooks = await prisma.accountBook.findMany({
              where: { userId: user.id },
            });
            
            if (dbAccountBooks.length > 0) {
              console.log(`警告: 数据库中有 ${dbAccountBooks.length} 个账本，但API返回0个!`);
              console.log('数据库中的账本:');
              dbAccountBooks.forEach(book => {
                console.log(`- 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}`);
              });
            } else {
              console.log('数据库中确实没有该用户的账本');
            }
          }
        } else {
          console.log('警告: API响应格式不符合预期');
        }
      } catch (error) {
        console.error('调用账本列表API失败:', error.message);
        if (error.response) {
          console.error('错误响应:', error.response.data);
        }
      }
      
      // 测试创建账本API
      try {
        const newAccountBook = {
          name: `测试账本-${Date.now()}`,
          description: '这是一个测试账本',
          isDefault: false,
        };
        
        console.log(`\n调用创建账本API: POST ${API_URL}/account-books`);
        console.log('请求数据:', newAccountBook);
        
        const response = await axios.post(`${API_URL}/account-books`, newAccountBook, { headers });
        
        console.log(`API响应状态: ${response.status}`);
        console.log('API响应数据:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.id) {
          console.log(`成功创建账本，ID: ${response.data.id}`);
        } else {
          console.log('警告: API响应格式不符合预期');
        }
      } catch (error) {
        console.error('调用创建账本API失败:', error.message);
        if (error.response) {
          console.error('错误响应:', error.response.data);
        }
      }
    }
    
    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
