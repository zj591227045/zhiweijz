/**
 * 预算API测试脚本
 * 
 * 这个脚本用于测试预算API的工作情况，包括：
 * 1. 获取当前账本ID
 * 2. 获取个人预算列表
 * 3. 获取通用预算列表
 * 
 * 使用方法：
 * 1. 在浏览器控制台中复制并执行这个脚本
 * 2. 查看控制台输出的测试结果
 */

// 获取当前账本ID
async function getCurrentAccountBookId() {
  try {
    // 从localStorage获取token
    const token = localStorage.getItem("auth-token");
    if (!token) {
      console.error('未找到认证令牌，请先登录');
      return null;
    }

    // 获取默认账本
    const response = await fetch('/api/account-books/default', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取默认账本失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('默认账本数据:', data);

    if (!data || !data.id) {
      console.error('未找到默认账本ID');
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('获取当前账本ID失败:', error);
    return null;
  }
}

// 获取预算列表
async function getBudgets(accountBookId: string, budgetType: 'PERSONAL' | 'GENERAL') {
  try {
    // 从localStorage获取token
    const token = localStorage.getItem("auth-token");
    if (!token) {
      console.error('未找到认证令牌，请先登录');
      return null;
    }

    // 构建URL
    const url = `/api/budgets?accountBookId=${accountBookId}&budgetType=${budgetType}`;
    console.log(`请求URL: ${url}`);

    // 发送请求
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`获取预算列表失败: ${response.status} ${response.statusText}`);
    }

    // 解析响应数据
    const data = await response.json();
    console.log(`${budgetType}预算响应数据:`, data);

    // 检查响应数据结构
    if (data === null || data === undefined) {
      console.warn(`${budgetType}预算响应数据为空`);
      return [];
    }

    // 提取预算数组
    let budgets = [];
    if (Array.isArray(data)) {
      budgets = data;
    } else if (data.data && Array.isArray(data.data)) {
      budgets = data.data;
    } else if (data.budgets && Array.isArray(data.budgets)) {
      budgets = data.budgets;
    } else {
      console.warn(`${budgetType}预算响应数据格式不符合预期:`, data);
      return [];
    }

    return budgets;
  } catch (error) {
    console.error(`获取${budgetType}预算列表失败:`, error);
    return null;
  }
}

// 运行测试
async function runTest() {
  console.log('开始测试预算API...');

  // 获取当前账本ID
  const accountBookId = await getCurrentAccountBookId();
  if (!accountBookId) {
    console.error('测试失败: 无法获取账本ID');
    return;
  }
  console.log('当前账本ID:', accountBookId);

  // 获取个人预算列表
  console.log('测试获取个人预算列表...');
  const personalBudgets = await getBudgets(accountBookId, 'PERSONAL');
  console.log('个人预算列表:', personalBudgets);

  // 获取通用预算列表
  console.log('测试获取通用预算列表...');
  const generalBudgets = await getBudgets(accountBookId, 'GENERAL');
  console.log('通用预算列表:', generalBudgets);

  console.log('预算API测试完成');
}

// 执行测试
runTest();
