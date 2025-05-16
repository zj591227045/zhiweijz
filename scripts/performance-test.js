/**
 * 性能测试脚本
 *
 * 此脚本用于测试前端和后端的性能
 * 使用方法: node performance-test.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// 配置
const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:3000/api';
const TEST_ITERATIONS = 5;

// 测试路由
const FRONTEND_ROUTES = [
  '/',
  '/login',
  '/dashboard',
  '/transactions',
  '/transactions/new'
];

const BACKEND_ROUTES = [
  '/auth/check',
  '/categories',
  '/statistics/overview?startDate=2023-01-01&endDate=2023-12-31',
  '/transactions?limit=10&sort=date:desc'
];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 测试前端路由加载时间
 * @param {string} route 路由路径
 * @returns {Promise<number>} 加载时间(毫秒)
 */
async function testFrontendRoute(route) {
  const url = `${FRONTEND_URL}${route}`;
  const start = performance.now();

  try {
    const response = await axios.get(url);
    const end = performance.now();
    return end - start;
  } catch (error) {
    console.error(`${colors.red}测试前端路由 ${route} 失败:${colors.reset}`, error.message);
    return -1;
  }
}

/**
 * 测试后端API响应时间
 * @param {string} route API路由
 * @returns {Promise<number>} 响应时间(毫秒)
 */
async function testBackendRoute(route) {
  const url = `${BACKEND_URL}${route}`;
  const start = performance.now();

  try {
    const response = await axios.get(url);
    const end = performance.now();
    return end - start;
  } catch (error) {
    console.error(`${colors.red}测试后端API ${route} 失败:${colors.reset}`, error.message);
    return -1;
  }
}

/**
 * 运行前端性能测试
 */
async function runFrontendTests() {
  console.log(`\n${colors.cyan}===== 前端性能测试 =====${colors.reset}`);

  const results = {};

  for (const route of FRONTEND_ROUTES) {
    console.log(`\n${colors.yellow}测试路由:${colors.reset} ${route}`);
    const times = [];

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      console.log(`  运行测试 ${i + 1}/${TEST_ITERATIONS}...`);
      const time = await testFrontendRoute(route);

      if (time >= 0) {
        times.push(time);
        console.log(`  完成: ${colors.green}${time.toFixed(2)}ms${colors.reset}`);
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      results[route] = { avg, min, max };

      console.log(`  平均: ${colors.green}${avg.toFixed(2)}ms${colors.reset}`);
      console.log(`  最小: ${colors.green}${min.toFixed(2)}ms${colors.reset}`);
      console.log(`  最大: ${colors.green}${max.toFixed(2)}ms${colors.reset}`);
    }
  }

  return results;
}

/**
 * 运行后端性能测试
 */
async function runBackendTests() {
  console.log(`\n${colors.cyan}===== 后端性能测试 =====${colors.reset}`);

  const results = {};

  for (const route of BACKEND_ROUTES) {
    console.log(`\n${colors.yellow}测试API:${colors.reset} ${route}`);
    const times = [];

    for (let i = 0; i < TEST_ITERATIONS; i++) {
      console.log(`  运行测试 ${i + 1}/${TEST_ITERATIONS}...`);
      const time = await testBackendRoute(route);

      if (time >= 0) {
        times.push(time);
        console.log(`  完成: ${colors.green}${time.toFixed(2)}ms${colors.reset}`);
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      results[route] = { avg, min, max };

      console.log(`  平均: ${colors.green}${avg.toFixed(2)}ms${colors.reset}`);
      console.log(`  最小: ${colors.green}${min.toFixed(2)}ms${colors.reset}`);
      console.log(`  最大: ${colors.green}${max.toFixed(2)}ms${colors.reset}`);
    }
  }

  return results;
}

/**
 * 主函数
 */
async function main() {
  console.log(`${colors.magenta}开始性能测试${colors.reset}`);
  console.log(`前端URL: ${FRONTEND_URL}`);
  console.log(`后端URL: ${BACKEND_URL}`);
  console.log(`测试迭代次数: ${TEST_ITERATIONS}`);

  const frontendResults = await runFrontendTests();
  const backendResults = await runBackendTests();

  console.log(`\n${colors.magenta}性能测试完成${colors.reset}`);

  // 输出总结
  console.log(`\n${colors.cyan}===== 测试结果总结 =====${colors.reset}`);

  console.log(`\n${colors.yellow}前端路由平均响应时间:${colors.reset}`);
  for (const [route, result] of Object.entries(frontendResults)) {
    console.log(`  ${route}: ${colors.green}${result.avg.toFixed(2)}ms${colors.reset}`);
  }

  console.log(`\n${colors.yellow}后端API平均响应时间:${colors.reset}`);
  for (const [route, result] of Object.entries(backendResults)) {
    console.log(`  ${route}: ${colors.green}${result.avg.toFixed(2)}ms${colors.reset}`);
  }
}

// 运行测试
main().catch(error => {
  console.error(`${colors.red}测试过程中发生错误:${colors.reset}`, error);
});
