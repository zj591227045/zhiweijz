import { dataAggregationService } from '../services/data-aggregation.service';

/**
 * 启动数据聚合服务
 */
async function startAggregationService() {
  try {
    console.log('正在启动数据聚合服务...');
    
    // 启动定时任务
    dataAggregationService.start();
    
    // 可选：立即执行一次聚合任务
    if (process.argv.includes('--run-now')) {
      console.log('立即执行一次数据聚合...');
      await dataAggregationService.runManualAggregation();
    }
    
    console.log('数据聚合服务启动成功');
  } catch (error) {
    console.error('启动数据聚合服务失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则启动服务
if (require.main === module) {
  startAggregationService();
}

export { startAggregationService }; 