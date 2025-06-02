// 测试托管成员API
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// 测试用户的token（需要从浏览器获取）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJjNWI4ZjZlLTMzMmYtNGJjYS04MDQ0LTU5ZmM0NzVkMzA5NiIsImVtYWlsIjoiemhhbmdqaWVAamFja3NvbnouY24iLCJpYXQiOjE3NDg4Mjk5NDAsImV4cCI6MTc0ODkxNjM0MH0.qe9epLFPzrC3LrW063QYcvGPuNKK0nR1xdPEFsfd1AM';

// 测试家庭ID
const FAMILY_ID = 'c3c6591f-8344-4a75-9b26-ac122371d79b';

async function testCustodialMembers() {
  console.log('🧪 开始测试托管成员API...');
  
  try {
    // 1. 获取当前托管成员列表
    console.log('\n📋 获取托管成员列表...');
    const getResponse = await fetch(`${BASE_URL}/api/families/${FAMILY_ID}/custodial-members`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (getResponse.ok) {
      const data = await getResponse.json();
      console.log('✅ 当前托管成员:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ 获取托管成员失败:', getResponse.status, await getResponse.text());
    }
    
    // 2. 添加一个托管成员
    console.log('\n➕ 添加托管成员...');
    const addResponse = await fetch(`${BASE_URL}/api/families/${FAMILY_ID}/custodial-members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: '小明',
        gender: '男',
        birthDate: '2020-05-15'
      })
    });
    
    if (addResponse.ok) {
      const newMember = await addResponse.json();
      console.log('✅ 添加托管成员成功:', JSON.stringify(newMember, null, 2));
      
      // 3. 再次获取托管成员列表验证
      console.log('\n🔄 验证添加结果...');
      const verifyResponse = await fetch(`${BASE_URL}/api/families/${FAMILY_ID}/custodial-members`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ 验证结果:', JSON.stringify(verifyData, null, 2));
      }
      
    } else {
      console.log('❌ 添加托管成员失败:', addResponse.status, await addResponse.text());
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testCustodialMembers();
