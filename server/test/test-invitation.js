/**
 * 测试邀请码功能
 * 
 * 这个脚本用于测试邀请码功能是否正常工作
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 配置
const API_URL = 'http://localhost:3000/api';
let authToken = '';

// 测试用户
const testUser = {
  email: 'test-invitation@example.com',
  password: 'Test123456',
  name: '测试用户'
};

// 测试家庭
const testFamily = {
  name: '测试家庭'
};

// 辅助函数：登录
async function login(email, password) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password
    });
    
    authToken = response.data.token;
    console.log('登录成功，获取到token');
    return response.data;
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：注册
async function register(userData) {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('注册成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('注册失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：创建家庭
async function createFamily(familyData) {
  try {
    const response = await axios.post(`${API_URL}/families`, familyData, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('创建家庭成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建家庭失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：创建邀请码
async function createInvitation(familyId) {
  try {
    const response = await axios.post(`${API_URL}/families/${familyId}/invitations`, {
      expiresInDays: 0.33 // 8小时
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('创建邀请码成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('创建邀请码失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：接受邀请
async function acceptInvitation(invitationCode) {
  try {
    const response = await axios.post(`${API_URL}/families/join`, {
      invitationCode
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('接受邀请成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('接受邀请失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：获取家庭列表
async function getFamilies() {
  try {
    const response = await axios.get(`${API_URL}/families`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('获取家庭列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取家庭列表失败:', error.response?.data || error.message);
    throw error;
  }
}

// 辅助函数：获取邀请列表
async function getInvitations(familyId) {
  try {
    const response = await axios.get(`${API_URL}/families/${familyId}/invitations`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    console.log('获取邀请列表成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取邀请列表失败:', error.response?.data || error.message);
    throw error;
  }
}

// 主测试函数
async function testInvitationFlow() {
  try {
    // 1. 注册测试用户
    try {
      await register(testUser);
    } catch (error) {
      // 如果用户已存在，忽略错误
      console.log('用户可能已存在，尝试登录');
    }

    // 2. 登录
    await login(testUser.email, testUser.password);

    // 3. 创建家庭
    const family = await createFamily(testFamily);
    const familyId = family.id;

    // 4. 创建邀请码
    const invitation = await createInvitation(familyId);
    console.log('邀请码:', invitation.invitationCode);

    // 5. 获取邀请列表
    await getInvitations(familyId);

    // 6. 测试接受邀请
    console.log('测试接受邀请...');
    console.log('使用邀请码:', invitation.invitationCode);
    
    // 这里可以模拟另一个用户接受邀请
    // 为了简化测试，我们只打印邀请码，不实际执行接受操作
    console.log('请使用另一个用户账号登录并使用此邀请码加入家庭');
    
    console.log('测试完成');
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    // 清理资源
    await prisma.$disconnect();
  }
}

// 执行测试
testInvitationFlow();
