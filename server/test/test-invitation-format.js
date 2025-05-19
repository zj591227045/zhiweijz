/**
 * 邀请码格式测试
 * 
 * 这个脚本用于测试邀请码格式验证是否正确
 */

const Joi = require('joi');

// 模拟前端验证
function validateFrontend(code) {
  // 使用正则表达式验证8位数字
  const regex = /^\d{8}$/;
  return regex.test(code);
}

// 模拟后端验证
function validateBackend(code) {
  const schema = Joi.string().required().pattern(/^\d{8}$/);
  const { error } = schema.validate(code);
  return !error;
}

// 测试用例
const testCases = [
  { code: '12345678', expectedResult: true, description: '8位数字 - 有效' },
  { code: '1234567', expectedResult: false, description: '7位数字 - 无效' },
  { code: '123456789', expectedResult: false, description: '9位数字 - 无效' },
  { code: 'abcdefgh', expectedResult: false, description: '8位字母 - 无效' },
  { code: '1234abcd', expectedResult: false, description: '混合字符 - 无效' },
  { code: '', expectedResult: false, description: '空字符串 - 无效' },
  { code: '0000000', expectedResult: false, description: '7个0 - 无效' },
  { code: '00000000', expectedResult: true, description: '8个0 - 有效' },
  { code: '01234567', expectedResult: true, description: '以0开头的8位数字 - 有效' },
];

// 运行测试
function runTests() {
  console.log('开始测试邀请码格式验证...\n');
  
  let frontendPassCount = 0;
  let backendPassCount = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`测试用例 ${index + 1}: ${testCase.description}`);
    console.log(`邀请码: "${testCase.code}"`);
    
    // 前端验证
    const frontendResult = validateFrontend(testCase.code);
    const frontendPass = frontendResult === testCase.expectedResult;
    if (frontendPass) frontendPassCount++;
    
    console.log(`前端验证: ${frontendResult ? '通过' : '不通过'} ${frontendPass ? '✓' : '✗'}`);
    
    // 后端验证
    const backendResult = validateBackend(testCase.code);
    const backendPass = backendResult === testCase.expectedResult;
    if (backendPass) backendPassCount++;
    
    console.log(`后端验证: ${backendResult ? '通过' : '不通过'} ${backendPass ? '✓' : '✗'}`);
    console.log('-----------------------------------');
  });
  
  // 输出测试结果
  console.log(`\n测试完成!`);
  console.log(`前端验证: ${frontendPassCount}/${testCases.length} 通过`);
  console.log(`后端验证: ${backendPassCount}/${testCases.length} 通过`);
  
  if (frontendPassCount === testCases.length && backendPassCount === testCases.length) {
    console.log('\n所有测试通过! 邀请码格式验证正确。');
  } else {
    console.log('\n有测试未通过，请检查验证逻辑。');
  }
}

// 执行测试
runTests();
