/**
 * 分类排序功能测试脚本
 * 
 * 测试目标：
 * 1. 验证只有位置发生变化的分类才会在数据库中创建记录
 * 2. 验证插入式排序ID的正确性（如1801）
 * 3. 验证默认分类的排序逻辑
 */

const API_BASE = 'http://localhost:3000/api';

// 模拟的认证token（需要替换为实际的token）
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImIyNmVjZDMwLTQ5YjEtNDU0NC04YmI4LWU0MzQ5YTA5NDI3YyIsImVtYWlsIjoidGVzdDAxQHRlc3QuY29tIiwiaWF0IjoxNzQ4ODM4ODA1LCJleHAiOjE3NDg5MjUyMDV9.ANICL3cG9acDZUUCvEX9xjRh_czoI_Zd9wdN2dGmSIQ';

async function makeRequest(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Authorization': AUTH_TOKEN,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function testCategorySorting() {
  console.log('🧪 开始测试分类排序功能...\n');
  
  try {
    // 1. 获取当前支出分类
    console.log('📋 1. 获取当前支出分类');
    const categories = await makeRequest('/categories?type=EXPENSE');
    const expenseCategories = categories.filter(cat => cat.type === 'EXPENSE');
    
    console.log(`   找到 ${expenseCategories.length} 个支出分类`);
    console.log('   当前排序:', expenseCategories.map(cat => `${cat.name}(${cat.displayOrder})`).join(', '));
    
    // 2. 找到"利息"分类
    const interestCategory = expenseCategories.find(cat => cat.name === '利息');
    if (!interestCategory) {
      throw new Error('未找到"利息"分类');
    }
    
    console.log(`   找到利息分类: ${interestCategory.name} (ID: ${interestCategory.id})`);
    
    // 3. 创建新的排序：将"利息"移动到"还款"和"保险"之间
    const repaymentCategory = expenseCategories.find(cat => cat.name === '还款');
    const insuranceCategory = expenseCategories.find(cat => cat.name === '保险');
    
    if (!repaymentCategory || !insuranceCategory) {
      throw new Error('未找到"还款"或"保险"分类');
    }
    
    console.log(`   还款分类排序ID: ${repaymentCategory.displayOrder}`);
    console.log(`   保险分类排序ID: ${insuranceCategory.displayOrder}`);
    
    // 4. 构建新的排序数组
    const newOrder = expenseCategories
      .filter(cat => cat.id !== interestCategory.id) // 移除利息分类
      .sort((a, b) => a.displayOrder - b.displayOrder); // 按当前排序排列
    
    // 找到还款分类的位置，在其后插入利息分类
    const repaymentIndex = newOrder.findIndex(cat => cat.id === repaymentCategory.id);
    newOrder.splice(repaymentIndex + 1, 0, interestCategory);
    
    const newCategoryIds = newOrder.map(cat => cat.id);
    
    console.log('\n📝 2. 执行分类排序更新');
    console.log('   新的排序:', newOrder.map(cat => cat.name).join(' -> '));
    
    // 5. 发送排序更新请求
    const updateResult = await makeRequest('/categories/order', {
      method: 'PUT',
      body: JSON.stringify({
        categoryIds: newCategoryIds,
        type: 'EXPENSE'
      })
    });
    
    console.log('   ✅ 排序更新成功');
    
    // 6. 验证结果
    console.log('\n🔍 3. 验证排序结果');
    
    // 重新获取分类
    const updatedCategories = await makeRequest('/categories?type=EXPENSE');
    const updatedExpenseCategories = updatedCategories.filter(cat => cat.type === 'EXPENSE');
    
    console.log('   更新后的排序:', updatedExpenseCategories.map(cat => `${cat.name}(${cat.displayOrder})`).join(', '));
    
    // 检查利息分类的新位置
    const updatedInterestCategory = updatedExpenseCategories.find(cat => cat.id === interestCategory.id);
    console.log(`   利息分类新的排序ID: ${updatedInterestCategory.displayOrder}`);
    
    // 验证利息分类是否在还款和保险之间
    const updatedRepaymentCategory = updatedExpenseCategories.find(cat => cat.id === repaymentCategory.id);
    const updatedInsuranceCategory = updatedExpenseCategories.find(cat => cat.id === insuranceCategory.id);
    
    const isCorrectPosition = 
      updatedInterestCategory.displayOrder > updatedRepaymentCategory.displayOrder &&
      updatedInterestCategory.displayOrder < updatedInsuranceCategory.displayOrder;
    
    if (isCorrectPosition) {
      console.log('   ✅ 利息分类位置正确：在还款和保险之间');
    } else {
      console.log('   ❌ 利息分类位置错误');
    }
    
    // 7. 检查数据库中的用户分类配置
    console.log('\n📊 4. 检查数据库配置记录');
    console.log('   请手动检查数据库中 user_category_configs 表');
    console.log('   预期：只有位置发生变化的分类才有记录');
    console.log('   预期：利息分类的 display_order 应该是类似 1801 的插入式排序ID');
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
if (typeof window === 'undefined') {
  // Node.js 环境
  const fetch = require('node-fetch');
  testCategorySorting();
} else {
  // 浏览器环境
  window.testCategorySorting = testCategorySorting;
  console.log('测试函数已加载，请在浏览器控制台中运行: testCategorySorting()');
}
