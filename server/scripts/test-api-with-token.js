// 脚本：使用指定token测试API
const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3000/api';
const TOKEN = process.argv[2]; // 从命令行参数获取token

if (!TOKEN) {
  console.error('错误: 请提供有效的JWT令牌作为命令行参数');
  console.error('用法: node test-api-with-token.js <JWT令牌>');
  process.exit(1);
}

async function main() {
  try {
    console.log('开始测试API...');
    
    // 设置请求头
    const headers = {
      'Authorization': `Bearer ${TOKEN}`,
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
      } else {
        console.log('警告: API响应格式不符合预期');
      }
    } catch (error) {
      console.error('调用账本列表API失败:', error.message);
      if (error.response) {
        console.error('错误响应:', error.response.data);
      }
    }
    
    // 测试获取默认账本API
    try {
      console.log(`\n调用默认账本API: GET ${API_URL}/account-books/default`);
      const response = await axios.get(`${API_URL}/account-books/default`, { headers });
      
      console.log(`API响应状态: ${response.status}`);
      console.log('API响应数据:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('调用默认账本API失败:', error.message);
      if (error.response) {
        console.error('错误响应:', error.response.data);
      }
    }
    
    // 测试获取分类列表API
    try {
      console.log(`\n调用分类列表API: GET ${API_URL}/categories`);
      const response = await axios.get(`${API_URL}/categories`, { headers });
      
      console.log(`API响应状态: ${response.status}`);
      console.log('API响应数据:', JSON.stringify(response.data, null, 2));
      
      if (Array.isArray(response.data)) {
        console.log(`API返回 ${response.data.length} 个分类`);
      } else {
        console.log('警告: API响应格式不符合预期');
      }
    } catch (error) {
      console.error('调用分类列表API失败:', error.message);
      if (error.response) {
        console.error('错误响应:', error.response.data);
      }
    }
    
    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

main();
