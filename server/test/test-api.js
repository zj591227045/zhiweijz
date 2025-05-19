/**
 * 测试API调用
 * 
 * 这个脚本用于测试API调用
 */

const axios = require('axios');

// 测试获取邀请列表API
async function testGetInvitations() {
  try {
    // 登录获取token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('登录成功，获取到token');
    
    // 使用token获取邀请列表
    const familyId = 'f05fdb3d-838b-4b14-8a12-87b55c4c0c2b';
    const invitationsResponse = await axios.get(`http://localhost:3000/api/families/${familyId}/invitations`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const invitations = invitationsResponse.data;
    console.log(`获取到 ${invitations.length} 条邀请记录：`);
    
    // 打印每条记录的详细信息
    invitations.forEach((invitation, index) => {
      console.log(`\n记录 ${index + 1}:`);
      console.log(`ID: ${invitation.id}`);
      console.log(`家庭ID: ${invitation.familyId}`);
      console.log(`邀请码: ${invitation.invitationCode}`);
      console.log(`创建时间: ${invitation.createdAt}`);
      console.log(`过期时间: ${invitation.expiresAt}`);
      console.log(`是否已使用: ${invitation.isUsed ? '是' : '否'}`);
      
      if (invitation.isUsed) {
        console.log(`使用时间: ${invitation.usedAt}`);
        console.log(`使用者ID: ${invitation.usedByUserId || '未记录'}`);
        console.log(`使用者名称: ${invitation.usedByUserName || '未记录'}`);
      }
    });
    
    return invitations;
  } catch (error) {
    console.error('API调用失败:', error.response ? error.response.data : error.message);
    return [];
  }
}

// 执行测试
testGetInvitations();
