/**
 * 测试邀请码修复
 * 验证前端发送的参数名称是否与后端期望的一致
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

// 测试用户凭据（需要先登录获取token）
let authToken = '';

async function testInvitationFix() {
  console.log('🧪 测试邀请码修复...\n');

  try {
    // 1. 先注册测试用户
    console.log('1. 注册测试用户...');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'password123';

    try {
      await axios.post(`${API_URL}/auth/register`, {
        name: '测试用户',
        email: testEmail,
        password: testPassword
      });
      console.log('✅ 用户注册成功');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('ℹ️ 用户已存在，继续测试');
      } else {
        throw error;
      }
    }

    // 2. 登录获取token
    console.log('\n2. 登录获取认证token...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });

    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('✅ 登录成功');
    } else {
      console.log('❌ 登录失败');
      return;
    }

    // 3. 创建测试家庭
    console.log('\n3. 创建测试家庭...');
    const familyResponse = await axios.post(`${API_URL}/families`, {
      name: '测试家庭-邀请码修复'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const familyId = familyResponse.data.id;
    console.log(`✅ 家庭创建成功，ID: ${familyId}`);

    // 4. 生成邀请码
    console.log('\n4. 生成邀请码...');
    const invitationResponse = await axios.post(`${API_URL}/families/${familyId}/invitations`, {
      expiresInDays: 0.33 // 8小时
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const invitationCode = invitationResponse.data.invitationCode;
    console.log(`✅ 邀请码生成成功: ${invitationCode}`);

    // 5. 测试修复前的参数格式（应该失败）
    console.log('\n5. 测试修复前的参数格式（使用inviteCode）...');
    try {
      await axios.post(`${API_URL}/families/join`, {
        inviteCode: invitationCode  // 错误的参数名
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('❌ 意外成功 - 这不应该发生');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ 正确返回400错误（参数验证失败）');
        console.log(`   错误信息: ${error.response.data.message}`);
      } else {
        console.log(`❌ 意外错误: ${error.message}`);
      }
    }

    // 6. 测试修复后的参数格式（应该成功，但会因为用户已经是成员而失败）
    console.log('\n6. 测试修复后的参数格式（使用invitationCode）...');
    try {
      await axios.post(`${API_URL}/families/join`, {
        invitationCode: invitationCode  // 正确的参数名
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('❌ 意外成功 - 用户应该已经是家庭成员');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ 正确返回409错误（用户已经是家庭成员）');
        console.log(`   错误信息: ${error.response.data.message}`);
      } else if (error.response && error.response.status === 400) {
        console.log('❌ 仍然返回400错误，修复可能未生效');
        console.log(`   错误信息: ${error.response.data.message}`);
      } else {
        console.log(`❌ 意外错误: ${error.message}`);
      }
    }

    // 7. 清理：删除测试家庭
    console.log('\n7. 清理测试数据...');
    await axios.delete(`${API_URL}/families/${familyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ 测试家庭已删除');

    console.log('\n🎉 测试完成！');
    console.log('\n总结：');
    console.log('- 修复前：使用inviteCode参数会返回400错误');
    console.log('- 修复后：使用invitationCode参数会正确处理（返回409因为用户已是成员）');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
testInvitationFix();
