// 测试主题CSS变量应用
// 在浏览器控制台中运行此脚本

(function() {
  console.log('开始测试主题CSS变量应用...');
  
  // 检查CSS变量是否正确应用
  function testCssVariables() {
    // 获取根元素
    const root = document.documentElement;
    
    // 获取计算后的样式
    const computedStyle = getComputedStyle(root);
    
    // 检查主要CSS变量
    const variables = [
      '--primary-color',
      '--text-primary',
      '--text-secondary',
      '--border-color',
      '--card-background',
      '--radius'
    ];
    
    console.log('CSS变量检查:');
    variables.forEach(variable => {
      const value = computedStyle.getPropertyValue(variable).trim();
      console.log(`${variable}: ${value}`);
    });
    
    // 检查预算选择器样式
    const budgetSelector = document.querySelector('.budget-selector');
    if (budgetSelector) {
      const budgetSelectorStyle = getComputedStyle(budgetSelector);
      console.log('\n预算选择器样式:');
      console.log('background-color:', budgetSelectorStyle.backgroundColor);
      console.log('border-radius:', budgetSelectorStyle.borderRadius);
      console.log('box-shadow:', budgetSelectorStyle.boxShadow);
    } else {
      console.log('\n未找到预算选择器元素');
    }
    
    // 检查家庭成员选择器样式
    const familyMemberSelector = document.querySelector('.family-member-selector');
    if (familyMemberSelector) {
      const familyMemberSelectorStyle = getComputedStyle(familyMemberSelector);
      console.log('\n家庭成员选择器样式:');
      console.log('background-color:', familyMemberSelectorStyle.backgroundColor);
      console.log('border-radius:', familyMemberSelectorStyle.borderRadius);
      console.log('box-shadow:', familyMemberSelectorStyle.boxShadow);
    } else {
      console.log('\n未找到家庭成员选择器元素');
    }
  }
  
  // 测试暗色模式切换
  function testDarkMode() {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    console.log('\n当前主题模式:', isDark ? '暗色' : '亮色');
    
    // 切换暗色/亮色模式
    if (isDark) {
      root.classList.remove('dark');
      console.log('已切换到亮色模式');
    } else {
      root.classList.add('dark');
      console.log('已切换到暗色模式');
    }
    
    // 重新检查CSS变量
    setTimeout(testCssVariables, 500);
  }
  
  // 执行测试
  testCssVariables();
  
  // 提供暗色模式切换测试函数
  window.testDarkMode = testDarkMode;
  console.log('\n测试完成! 可以通过调用 window.testDarkMode() 来测试暗色模式切换');
})();
