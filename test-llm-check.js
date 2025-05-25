// 测试LLM服务检查功能
// 这个脚本可以用来验证API路径是否正确

const testAccountId = "90fd9e64-252b-498f-9b62-02d0f3d14787";

// 模拟前端API调用
async function testLLMServiceCheck() {
  console.log("开始测试LLM服务检查功能...");
  
  try {
    // 测试正确的API路径
    const response = await fetch(`http://localhost:3000/api/ai/account/${testAccountId}/llm-settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 注意：实际使用时需要添加Authorization头
        // 'Authorization': `Bearer ${token}`
      }
    });
    
    console.log("API响应状态:", response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log("API响应数据:", data);
      
      if (data.bound === true) {
        console.log("✅ 账本已绑定LLM服务");
      } else if (data.bound === false) {
        console.log("❌ 账本未绑定LLM服务:", data.message);
      } else {
        console.log("⚠️ 响应格式不明确");
      }
    } else {
      console.log("❌ API请求失败，状态码:", response.status);
      const errorText = await response.text();
      console.log("错误信息:", errorText);
    }
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 如果在Node.js环境中运行
if (typeof window === 'undefined') {
  // 需要安装node-fetch: npm install node-fetch
  // const fetch = require('node-fetch');
  console.log("请在浏览器环境中运行此测试，或安装node-fetch包");
} else {
  // 在浏览器中运行
  testLLMServiceCheck();
}

console.log(`
修复总结：
1. ✅ 修复了web版本底部导航组件的LLM服务检查逻辑
2. ✅ 修复了API路径问题（移除了重复的/api前缀）
3. ✅ 正确处理API响应中的bound字段
4. ✅ 添加了详细的日志输出用于调试

正确的API路径：
- 后端路由：/ai/account/:accountId/llm-settings
- 前端调用：/ai/account/\${accountId}/llm-settings（通过apiClient，会自动添加/api前缀）
- 完整URL：http://localhost:3000/api/ai/account/\${accountId}/llm-settings

测试步骤：
1. 确保后端服务器运行在 http://localhost:3000
2. 确保用户已登录并有有效的认证token
3. 点击底部菜单栏的添加记账按钮
4. 查看浏览器控制台的日志输出
`); 