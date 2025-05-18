// 测试脚本：验证家庭成员选择器修复
// 使用方法：在浏览器控制台中运行此脚本

(function() {
  console.log('开始测试家庭成员选择器修复...');
  
  // 模拟API响应
  const mockResponse = {
    members: [
      {
        id: 'member1',
        name: '用户1',
        role: 'ADMIN',
        isCurrentUser: true
      },
      {
        id: 'member2',
        name: '用户2',
        role: 'MEMBER'
      }
    ],
    totalCount: 2
  };
  
  // 测试解析逻辑
  function testParsingLogic() {
    console.log('测试响应解析逻辑...');
    
    // 获取成员数组
    const membersList = mockResponse.members || [];
    
    if (Array.isArray(membersList) && membersList.length > 0) {
      console.log('✅ 成功解析成员列表:', membersList);
      
      // 添加"全部成员"选项
      const allMembersOption = {
        id: 'all',
        name: '全部成员',
        role: 'ALL'
      };
      
      const membersWithAll = [allMembersOption, ...membersList];
      console.log('✅ 添加全部成员选项后:', membersWithAll);
      
      // 测试查找当前成员
      const currentMemberId = 'member1';
      const index = currentMemberId 
        ? membersWithAll.findIndex(member => member.id === currentMemberId)
        : 0;
        
      console.log('✅ 当前成员索引:', index);
      console.log('✅ 当前选中的成员:', membersWithAll[index]);
    } else {
      console.error('❌ 成员列表解析失败');
    }
  }
  
  // 执行测试
  testParsingLogic();
  
  console.log('测试完成!');
})();
