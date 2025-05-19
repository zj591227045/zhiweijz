/**
 * 预算API测试脚本
 * 
 * 这个脚本用于测试预算API的工作情况，特别是根据账本ID和预算类型过滤预算的功能。
 * 
 * 使用方法：
 * 1. 确保服务器正在运行
 * 2. 在终端中执行: node src/test/budget-api-test.js
 */

const axios = require('axios');

// 测试配置
const config = {
  baseUrl: 'http://localhost:3000/api',
  token: '', // 请在运行前设置有效的认证令牌
  accountBookId: 'b06549b1-2118-45e5-96e1-cce1ce8b484c', // 请替换为实际的账本ID
};

// 创建API客户端
const apiClient = axios.create({
  baseURL: config.baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.token}`
  }
});

// 测试获取个人预算
async function testGetPersonalBudgets() {
  try {
    console.log('测试获取个人预算...');
    const response = await apiClient.get('/budgets', {
      params: {
        accountBookId: config.accountBookId,
        budgetType: 'PERSONAL'
      }
    });
    
    console.log('响应状态码:', response.status);
    console.log('个人预算数量:', response.data.total);
    console.log('个人预算数据:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('获取个人预算失败:', error.response ? error.response.data : error.message);
    return null;
  }
}

// 测试获取通用预算
async function testGetGeneralBudgets() {
  try {
    console.log('测试获取通用预算...');
    const response = await apiClient.get('/budgets', {
      params: {
        accountBookId: config.accountBookId,
        budgetType: 'GENERAL'
      }
    });
    
    console.log('响应状态码:', response.status);
    console.log('通用预算数量:', response.data.total);
    console.log('通用预算数据:', JSON.stringify(response.data.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('获取通用预算失败:', error.response ? error.response.data : error.message);
    return null;
  }
}

// 运行测试
async function runTests() {
  console.log('开始测试预算API...');
  console.log('使用账本ID:', config.accountBookId);
  
  // 测试获取个人预算
  await testGetPersonalBudgets();
  
  console.log('\n-----------------------------------\n');
  
  // 测试获取通用预算
  await testGetGeneralBudgets();
  
  console.log('\n预算API测试完成');
}

// 执行测试
runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
});
