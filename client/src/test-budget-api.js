// 测试预算API的脚本
// 使用方法: node test-budget-api.js

const axios = require('axios');

// 获取认证令牌
const token = localStorage.getItem('auth-token');

// 创建API客户端
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

// 测试获取预算列表
async function testGetBudgets() {
  try {
    console.log('测试获取预算列表...');
    
    // 获取账本列表
    const accountBooksResponse = await apiClient.get('/account-books');
    console.log('账本列表响应:', accountBooksResponse.data);
    
    if (!accountBooksResponse.data || !Array.isArray(accountBooksResponse.data)) {
      console.error('账本列表响应格式错误');
      return;
    }
    
    // 获取第一个账本ID
    const accountBookId = accountBooksResponse.data[0]?.id;
    if (!accountBookId) {
      console.error('没有找到可用的账本');
      return;
    }
    
    console.log(`使用账本ID: ${accountBookId}`);
    
    // 测试获取个人预算
    console.log('获取个人预算...');
    const personalBudgetsResponse = await apiClient.get('/budgets', {
      params: {
        accountBookId,
        budgetType: 'PERSONAL'
      }
    });
    
    console.log('个人预算响应:', personalBudgetsResponse.data);
    
    // 测试获取通用预算
    console.log('获取通用预算...');
    const generalBudgetsResponse = await apiClient.get('/budgets', {
      params: {
        accountBookId,
        budgetType: 'GENERAL'
      }
    });
    
    console.log('通用预算响应:', generalBudgetsResponse.data);
    
    // 检查响应格式
    console.log('检查响应格式...');
    checkResponseFormat(personalBudgetsResponse.data, '个人预算');
    checkResponseFormat(generalBudgetsResponse.data, '通用预算');
    
    console.log('测试完成');
  } catch (error) {
    console.error('测试失败:', error);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

// 检查响应格式
function checkResponseFormat(response, type) {
  console.log(`检查${type}响应格式...`);
  
  if (!response) {
    console.error(`${type}响应为空`);
    return;
  }
  
  if (Array.isArray(response)) {
    console.log(`${type}响应是数组，长度:`, response.length);
    if (response.length > 0) {
      console.log(`${type}第一项:`, response[0]);
    }
  } else if (response.data && Array.isArray(response.data)) {
    console.log(`${type}响应包含data字段，是数组，长度:`, response.data.length);
    if (response.data.length > 0) {
      console.log(`${type}第一项:`, response.data[0]);
    }
  } else {
    console.error(`${type}响应格式不符合预期:`, response);
  }
}

// 执行测试
testGetBudgets();
