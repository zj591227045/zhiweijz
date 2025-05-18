/**
 * 测试脚本：验证预算管理、仪表盘和统计页面的修复
 * 
 * 使用方法：
 * 1. 打开浏览器控制台
 * 2. 复制此脚本并粘贴到控制台中执行
 * 3. 查看测试结果
 */

// 测试配置
const config = {
  // 测试账本切换
  testAccountBookSwitch: true,
  // 测试仪表盘预算显示
  testDashboardBudget: true,
  // 测试统计页面分类显示
  testStatisticsCategories: true,
  // 详细日志
  verbose: true
};

// 日志函数
function log(message, type = 'info') {
  const styles = {
    info: 'color: #3B82F6; font-weight: bold;',
    success: 'color: #10B981; font-weight: bold;',
    error: 'color: #EF4444; font-weight: bold;',
    warning: 'color: #F59E0B; font-weight: bold;'
  };
  
  console.log(`%c[测试] ${message}`, styles[type]);
}

// 测试预算管理页面账本切换
async function testBudgetPageAccountBookSwitch() {
  log('开始测试预算管理页面账本切换...');
  
  try {
    // 获取当前页面URL
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/budgets')) {
      log('当前不在预算页面，请先导航到预算页面', 'warning');
      return false;
    }
    
    // 获取预算Store
    const budgetStore = window.__NEXT_DATA__?.props?.pageProps?.budgetStore;
    if (!budgetStore) {
      log('无法获取预算Store，请确保应用正确初始化', 'error');
      return false;
    }
    
    // 获取账本Store
    const accountBookStore = window.__NEXT_DATA__?.props?.pageProps?.accountBookStore;
    if (!accountBookStore) {
      log('无法获取账本Store，请确保应用正确初始化', 'error');
      return false;
    }
    
    // 记录当前选中的账本
    const currentAccountBook = accountBookStore.currentAccountBook;
    log(`当前选中的账本: ${currentAccountBook?.name || '无'}`, 'info');
    
    // 模拟切换账本
    log('模拟切换账本...');
    const otherAccountBook = accountBookStore.accountBooks.find(book => book.id !== currentAccountBook?.id);
    if (!otherAccountBook) {
      log('没有其他账本可供切换，请先创建多个账本', 'warning');
      return false;
    }
    
    // 调用setCurrentAccountBook方法
    window.useAccountBookStore.getState().setCurrentAccountBook(otherAccountBook.id);
    log(`已切换到账本: ${otherAccountBook.name}`, 'info');
    
    // 等待数据重新加载
    log('等待数据重新加载...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 验证预算数据是否已更新
    const newBudgetStore = window.__NEXT_DATA__?.props?.pageProps?.budgetStore;
    const selectedAccountBook = newBudgetStore?.selectedAccountBook;
    
    if (selectedAccountBook?.id === otherAccountBook.id) {
      log('预算页面账本切换测试通过：选中的账本已正确更新', 'success');
      return true;
    } else {
      log('预算页面账本切换测试失败：选中的账本未正确更新', 'error');
      return false;
    }
  } catch (error) {
    log(`预算页面账本切换测试出错: ${error.message}`, 'error');
    return false;
  }
}

// 测试仪表盘预算显示
async function testDashboardBudgetDisplay() {
  log('开始测试仪表盘预算显示...');
  
  try {
    // 获取当前页面URL
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/dashboard')) {
      log('当前不在仪表盘页面，请先导航到仪表盘页面', 'warning');
      return false;
    }
    
    // 查找BudgetProgress组件
    const budgetProgressElement = document.querySelector('.budget-progress');
    if (!budgetProgressElement) {
      log('无法找到预算进度组件，请确保页面正确加载', 'error');
      return false;
    }
    
    // 检查是否显示总预算
    const budgetCards = budgetProgressElement.querySelectorAll('.budget-card');
    if (budgetCards.length === 0) {
      log('没有找到预算卡片，请确保有预算数据', 'warning');
      return false;
    }
    
    // 检查第一个预算卡片是否为总预算
    const firstBudgetCard = budgetCards[0];
    const categoryName = firstBudgetCard.querySelector('.dashboard-category-name')?.textContent;
    
    if (categoryName && (
        categoryName.includes('总预算') || 
        categoryName.includes('月度预算') || 
        categoryName === '预算')) {
      log(`仪表盘预算显示测试通过：首个预算卡片为总预算 (${categoryName})`, 'success');
      return true;
    } else {
      log(`仪表盘预算显示测试失败：首个预算卡片不是总预算 (${categoryName})`, 'error');
      return false;
    }
  } catch (error) {
    log(`仪表盘预算显示测试出错: ${error.message}`, 'error');
    return false;
  }
}

// 测试统计页面分类显示
async function testStatisticsCategoriesDisplay() {
  log('开始测试统计页面分类显示...');
  
  try {
    // 获取当前页面URL
    const currentUrl = window.location.href;
    if (!currentUrl.includes('/statistics')) {
      log('当前不在统计页面，请先导航到统计页面', 'warning');
      return false;
    }
    
    // 查找CategoryDistribution组件
    const categoryDistributionElement = document.querySelector('.chart-card');
    if (!categoryDistributionElement) {
      log('无法找到分类分布组件，请确保页面正确加载', 'error');
      return false;
    }
    
    // 检查标题是否包含"交易分类"
    const chartTitle = categoryDistributionElement.querySelector('.chart-title')?.textContent;
    if (!chartTitle || !chartTitle.includes('交易分类')) {
      log(`统计页面分类显示测试失败：标题不包含"交易分类" (${chartTitle})`, 'error');
      return false;
    }
    
    // 检查是否有分类数据
    const legendItems = categoryDistributionElement.querySelectorAll('.legend-item');
    if (legendItems.length === 0) {
      log('没有找到分类图例，请确保有分类数据', 'warning');
      return false;
    }
    
    log(`统计页面分类显示测试通过：标题正确显示"交易分类"，找到 ${legendItems.length} 个分类`, 'success');
    return true;
  } catch (error) {
    log(`统计页面分类显示测试出错: ${error.message}`, 'error');
    return false;
  }
}

// 运行测试
async function runTests() {
  log('开始运行测试...', 'info');
  
  let results = {
    accountBookSwitch: false,
    dashboardBudget: false,
    statisticsCategories: false
  };
  
  if (config.testAccountBookSwitch) {
    results.accountBookSwitch = await testBudgetPageAccountBookSwitch();
  }
  
  if (config.testDashboardBudget) {
    results.dashboardBudget = await testDashboardBudgetDisplay();
  }
  
  if (config.testStatisticsCategories) {
    results.statisticsCategories = await testStatisticsCategoriesDisplay();
  }
  
  // 输出测试结果摘要
  log('测试结果摘要:', 'info');
  log(`预算管理页面账本切换: ${results.accountBookSwitch ? '通过 ✅' : '失败 ❌'}`, results.accountBookSwitch ? 'success' : 'error');
  log(`仪表盘预算显示: ${results.dashboardBudget ? '通过 ✅' : '失败 ❌'}`, results.dashboardBudget ? 'success' : 'error');
  log(`统计页面分类显示: ${results.statisticsCategories ? '通过 ✅' : '失败 ❌'}`, results.statisticsCategories ? 'success' : 'error');
  
  const allPassed = Object.values(results).every(result => result);
  log(`总体结果: ${allPassed ? '所有测试通过 ✅' : '部分测试失败 ❌'}`, allPassed ? 'success' : 'error');
}

// 执行测试
runTests();
