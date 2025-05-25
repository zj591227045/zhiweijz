// 仪表盘刷新功能测试脚本
// 在浏览器控制台中运行此脚本来测试功能

console.log("=== 仪表盘刷新功能测试开始 ===");

// 模拟触发交易变化事件的函数
function testTriggerTransactionChange(accountBookId) {
  console.log("测试：触发交易变化事件，账本ID:", accountBookId);
  
  // 方法1：使用自定义事件
  const event = new CustomEvent('transactionChanged', {
    detail: { accountBookId }
  });
  window.dispatchEvent(event);
  console.log("测试：交易变化事件已触发");
  
  // 方法2：使用localStorage作为备用机制
  const refreshSignal = {
    accountBookId,
    timestamp: Date.now(),
    action: 'refresh_dashboard'
  };
  localStorage.setItem('dashboard_refresh_signal', JSON.stringify(refreshSignal));
  console.log("测试：仪表盘刷新信号已写入localStorage");
}

// 模拟设置事件监听器
function testSetupTransactionListener() {
  console.log("测试：设置交易变化监听器");
  
  const handler = (event) => {
    const { accountBookId } = event.detail;
    console.log("测试：监听到交易变化事件，账本ID:", accountBookId);
    
    setTimeout(() => {
      console.log("测试：开始自动刷新仪表盘数据...");
      // 模拟刷新数据
      setTimeout(() => {
        console.log("测试：仪表盘数据刷新完成");
      }, 1000);
    }, 500);
  };
  
  window.addEventListener('transactionChanged', handler);
  console.log("测试：仪表盘交易变化监听器已设置");
  
  return handler;
}

// 运行测试
console.log("1. 设置监听器...");
const handler = testSetupTransactionListener();

console.log("2. 等待2秒后触发事件...");
setTimeout(() => {
  console.log("3. 触发交易变化事件...");
  testTriggerTransactionChange('test-account-book-123');
  
  console.log("4. 检查localStorage...");
  const signal = localStorage.getItem('dashboard_refresh_signal');
  if (signal) {
    console.log("localStorage中的刷新信号:", JSON.parse(signal));
  } else {
    console.log("localStorage中没有刷新信号");
  }
  
  // 清理
  setTimeout(() => {
    console.log("5. 清理监听器...");
    window.removeEventListener('transactionChanged', handler);
    localStorage.removeItem('dashboard_refresh_signal');
    console.log("=== 测试完成 ===");
  }, 3000);
}, 2000); 