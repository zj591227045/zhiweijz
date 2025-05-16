const axios = require('axios');

// 配置
const API_BASE_URL = 'http://localhost:3000/api';
// 请在此处手动设置您的认证令牌
const TOKEN = ''; // 需要手动填写从浏览器中获取的token

// 测试API路径
async function testApiPaths() {
  try {
    console.log('开始测试API路径...');
    console.log('使用的认证Token:', TOKEN ? TOKEN.substring(0, 10) + '...' : '无');

    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': TOKEN ? `Bearer ${TOKEN}` : ''
    };

    // 1. 测试获取账本列表
    console.log('\n测试获取账本列表...');
    try {
      const response = await axios.get(`${API_BASE_URL}/account-books`, { headers });
      console.log('状态码:', response.status);
      console.log('账本数量:', response.data.length);
      console.log('账本列表:', response.data);
    } catch (error) {
      console.error('获取账本列表失败:', error.response?.status, error.response?.data || error.message);
    }

    // 2. 测试获取默认账本
    console.log('\n测试获取默认账本...');
    try {
      const response = await axios.get(`${API_BASE_URL}/account-books/default`, { headers });
      console.log('状态码:', response.status);
      console.log('默认账本:', response.data);
    } catch (error) {
      console.error('获取默认账本失败:', error.response?.status, error.response?.data || error.message);
    }

    // 3. 测试获取财务概览
    console.log('\n测试获取财务概览...');
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    try {
      const response = await axios.get(
        `${API_BASE_URL}/statistics/overview?startDate=${startDate}&endDate=${endDate}`,
        { headers }
      );
      console.log('状态码:', response.status);
      console.log('财务概览:', response.data);
    } catch (error) {
      console.error('获取财务概览失败:', error.response?.status, error.response?.data || error.message);
    }

    // 4. 测试获取预算执行情况
    console.log('\n测试获取预算执行情况...');
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const response = await axios.get(
        `${API_BASE_URL}/statistics/budgets?month=${month}`,
        { headers }
      );
      console.log('状态码:', response.status);
      console.log('预算执行情况:', response.data);
    } catch (error) {
      console.error('获取预算执行情况失败:', error.response?.status, error.response?.data || error.message);
    }

    // 5. 测试获取最近交易
    console.log('\n测试获取最近交易...');
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transactions?limit=5&sort=date:desc`,
        { headers }
      );
      console.log('状态码:', response.status);
      console.log('交易数量:', response.data.length);
      console.log('最近交易:', response.data);
    } catch (error) {
      console.error('获取最近交易失败:', error.response?.status, error.response?.data || error.message);
    }

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 执行测试
testApiPaths();
