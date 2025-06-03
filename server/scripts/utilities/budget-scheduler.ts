#!/usr/bin/env ts-node

import { BudgetSchedulerService } from '../src/services/budget-scheduler.service';

/**
 * 预算定时任务脚本
 * 
 * 使用方法：
 * 1. 手动执行：npm run budget-scheduler
 * 2. 设置cron job：
 *    # 每月1号凌晨2点执行
 *    0 2 1 * * /path/to/node /path/to/project/server/scripts/budget-scheduler.ts
 */

async function main() {
  console.log('='.repeat(50));
  console.log('预算定时任务开始执行');
  console.log('执行时间:', new Date().toISOString());
  console.log('='.repeat(50));

  const scheduler = new BudgetSchedulerService();

  try {
    // 执行所有定时任务
    await scheduler.runAllScheduledTasks();
    
    console.log('='.repeat(50));
    console.log('预算定时任务执行成功');
    console.log('完成时间:', new Date().toISOString());
    console.log('='.repeat(50));
    
    process.exit(0);
  } catch (error) {
    console.error('='.repeat(50));
    console.error('预算定时任务执行失败:', error);
    console.error('失败时间:', new Date().toISOString());
    console.error('='.repeat(50));
    
    process.exit(1);
  }
}

// 如果直接运行此脚本，执行main函数
if (require.main === module) {
  main();
}

export { main };
