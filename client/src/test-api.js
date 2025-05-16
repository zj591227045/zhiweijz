// 测试API路径是否正确
const axios = require('axios');

// 测试注册API
async function testRegister() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('注册成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('注册失败:', error.response ? error.response.data : error.message);
    return null;
  }
}

// 测试登录API
async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('登录成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('登录失败:', error.response ? error.response.data : error.message);
    return null;
  }
}

// 运行测试
async function runTests() {
  console.log('开始测试API路径...');
  
  // 测试注册
  console.log('\n测试注册API:');
  const registerResult = await testRegister();
  
  // 测试登录
  console.log('\n测试登录API:');
  const loginResult = await testLogin();
  
  console.log('\n测试完成!');
}

runTests();
