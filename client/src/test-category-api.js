// 测试分类API的脚本
// 使用方法: node test-category-api.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 从本地存储获取认证令牌
let token = '';
try {
  // 尝试从localStorage.json文件中读取token
  const localStoragePath = path.join(__dirname, '../localStorage.json');
  if (fs.existsSync(localStoragePath)) {
    const data = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
    token = data['auth-token'] || '';
    console.log('从localStorage.json获取到token:', token ? '成功' : '失败');
  } else {
    console.log('localStorage.json文件不存在');
  }
} catch (error) {
  console.error('读取token失败:', error);
}

// 如果没有找到token，使用一个硬编码的token进行测试
if (!token) {
  token = process.env.AUTH_TOKEN || '';
  console.log('使用环境变量中的token:', token ? '成功' : '失败');
}

// 创建API客户端
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }
});

// 测试获取分类列表
async function testGetCategories() {
  try {
    console.log('测试获取分类列表...');

    // 获取所有分类
    console.log('获取所有分类...');
    const allCategoriesResponse = await apiClient.get('/categories');
    console.log('所有分类响应:', allCategoriesResponse.data);

    // 获取支出分类
    console.log('获取支出分类...');
    const expenseCategoriesResponse = await apiClient.get('/categories', {
      params: {
        type: 'EXPENSE'
      }
    });
    console.log('支出分类响应:', expenseCategoriesResponse.data);

    // 获取收入分类
    console.log('获取收入分类...');
    const incomeCategoriesResponse = await apiClient.get('/categories', {
      params: {
        type: 'INCOME'
      }
    });
    console.log('收入分类响应:', incomeCategoriesResponse.data);

    // 检查分类数据结构
    console.log('检查分类数据结构...');
    if (expenseCategoriesResponse.data && expenseCategoriesResponse.data.length > 0) {
      const firstCategory = expenseCategoriesResponse.data[0];
      console.log('第一个支出分类的数据结构:', firstCategory);

      // 检查必要的字段
      const requiredFields = ['id', 'name', 'icon', 'type'];
      const missingFields = requiredFields.filter(field => !firstCategory.hasOwnProperty(field));

      if (missingFields.length > 0) {
        console.error('分类数据缺少必要字段:', missingFields);
      } else {
        console.log('分类数据包含所有必要字段');
      }

      // 检查图标字段
      if (firstCategory.icon) {
        console.log('图标字段值:', firstCategory.icon);

        // 检查图标字段是否符合预期格式
        const expectedIconFormats = ['fa-', 'restaurant', 'shopping', 'transport', 'home'];
        const matchesExpectedFormat = expectedIconFormats.some(format =>
          typeof firstCategory.icon === 'string' && firstCategory.icon.includes(format)
        );

        if (matchesExpectedFormat) {
          console.log('图标字段符合预期格式');
        } else {
          console.error('图标字段不符合预期格式:', firstCategory.icon);
        }
      } else {
        console.error('图标字段为空');
      }

      // 检查颜色字段
      if (firstCategory.color) {
        console.log('颜色字段值:', firstCategory.color);
      } else {
        console.warn('颜色字段为空，前端将使用默认颜色');
      }
    } else {
      console.error('没有获取到支出分类数据');
    }

    console.log('测试完成');
  } catch (error) {
    console.error('测试失败:', error);
    if (error.response) {
      console.error('错误响应:', error.response.data);
    }
  }
}

// 执行测试
testGetCategories();
