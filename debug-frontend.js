// 前端调试脚本
// 在浏览器控制台中运行此脚本来调试前端问题

console.log('=== 前端调试脚本开始 ===');

// 1. 检查当前认证状态
console.log('1. 检查认证状态:');
const token = localStorage.getItem('auth-token');
const user = localStorage.getItem('user');
console.log('Token:', token ? token.substring(0, 50) + '...' : 'null');
console.log('User:', user ? JSON.parse(user) : 'null');

// 2. 测试登录API
async function testLogin() {
  console.log('\n2. 测试登录API:');
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'zhangjie@jacksonz.cn',
        password: 'Zj233401!'
      })
    });
    
    const data = await response.json();
    console.log('登录响应:', data);
    
    if (data.token) {
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      console.log('Token已保存到localStorage');
      return data.token;
    }
  } catch (error) {
    console.error('登录失败:', error);
  }
}

// 3. 测试账本API
async function testAccountBooks(token) {
  console.log('\n3. 测试账本API:');
  try {
    const response = await fetch('/api/account-books', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('账本API响应:', data);
    console.log('账本数量:', data.data ? data.data.length : 0);
    return data;
  } catch (error) {
    console.error('获取账本失败:', error);
  }
}

// 4. 测试其他API
async function testOtherAPIs(token, accountBookId) {
  console.log('\n4. 测试其他API:');
  
  // 测试统计API
  try {
    const statsResponse = await fetch(`/api/statistics?accountBookId=${accountBookId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const statsData = await statsResponse.json();
    console.log('统计API响应:', statsData);
  } catch (error) {
    console.error('统计API失败:', error);
  }
  
  // 测试交易API
  try {
    const transactionsResponse = await fetch(`/api/transactions?accountBookId=${accountBookId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const transactionsData = await transactionsResponse.json();
    console.log('交易API响应:', transactionsData);
  } catch (error) {
    console.error('交易API失败:', error);
  }
}

// 5. 运行完整测试
async function runFullTest() {
  console.log('\n=== 开始完整测试 ===');
  
  // 如果没有token，先登录
  let currentToken = localStorage.getItem('auth-token');
  if (!currentToken) {
    currentToken = await testLogin();
  }
  
  if (currentToken) {
    // 测试账本API
    const accountBooksData = await testAccountBooks(currentToken);
    
    if (accountBooksData && accountBooksData.data && accountBooksData.data.length > 0) {
      const firstAccountBook = accountBooksData.data[0];
      console.log('使用第一个账本进行测试:', firstAccountBook);
      
      // 测试其他API
      await testOtherAPIs(currentToken, firstAccountBook.id);
    }
  }
  
  console.log('\n=== 测试完成 ===');
}

// 6. 清除认证状态
function clearAuth() {
  localStorage.removeItem('auth-token');
  localStorage.removeItem('user');
  console.log('认证状态已清除');
}

// 7. 检查页面状态
function checkPageState() {
  console.log('\n5. 检查页面状态:');
  console.log('当前URL:', window.location.href);
  console.log('页面标题:', document.title);
  
  // 检查是否有错误信息
  const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
  if (errorElements.length > 0) {
    console.log('页面错误元素:', errorElements);
  }
  
  // 检查加载状态
  const loadingElements = document.querySelectorAll('[class*="loading"], [class*="Loading"]');
  if (loadingElements.length > 0) {
    console.log('页面加载元素:', loadingElements);
  }
}

// 导出函数到全局作用域
window.debugFrontend = {
  testLogin,
  testAccountBooks,
  testOtherAPIs,
  runFullTest,
  clearAuth,
  checkPageState
};

console.log('\n可用的调试函数:');
console.log('- debugFrontend.testLogin() - 测试登录');
console.log('- debugFrontend.testAccountBooks(token) - 测试账本API');
console.log('- debugFrontend.runFullTest() - 运行完整测试');
console.log('- debugFrontend.clearAuth() - 清除认证状态');
console.log('- debugFrontend.checkPageState() - 检查页面状态');

// 自动运行初始检查
checkPageState();

console.log('\n=== 前端调试脚本加载完成 ===');
