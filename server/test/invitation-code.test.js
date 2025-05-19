/**
 * 邀请码生成测试
 * 
 * 这个测试脚本用于验证邀请码生成逻辑是否正确
 */

// 模拟邀请码生成函数
function generateInvitationCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// 测试生成的邀请码是否为8位数字
function testInvitationCodeFormat() {
  const code = generateInvitationCode();
  console.log('生成的邀请码:', code);
  
  // 验证长度是否为8位
  if (code.length !== 8) {
    console.error(`邀请码长度不是8位: ${code.length}`);
    return false;
  }
  
  // 验证是否全部为数字
  if (!/^\d+$/.test(code)) {
    console.error('邀请码包含非数字字符');
    return false;
  }
  
  console.log('邀请码格式验证通过');
  return true;
}

// 测试邀请码的唯一性
function testInvitationCodeUniqueness(count = 100) {
  const codes = new Set();
  
  for (let i = 0; i < count; i++) {
    codes.add(generateInvitationCode());
  }
  
  console.log(`生成了 ${count} 个邀请码，唯一的有 ${codes.size} 个`);
  
  if (codes.size < count * 0.95) {
    console.warn('邀请码唯一性较低，可能存在冲突风险');
    return false;
  }
  
  console.log('邀请码唯一性验证通过');
  return true;
}

// 运行测试
function runTests() {
  console.log('开始测试邀请码生成...');
  
  const formatTestPassed = testInvitationCodeFormat();
  const uniquenessTestPassed = testInvitationCodeUniqueness();
  
  if (formatTestPassed && uniquenessTestPassed) {
    console.log('所有测试通过!');
  } else {
    console.error('测试失败!');
  }
}

// 执行测试
runTests();
