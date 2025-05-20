import { LLMProviderService } from './llm/llm-provider-service';
import { SmartAccounting } from './langgraph/smart-accounting';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 加载环境变量
dotenv.config();

/**
 * 测试智能记账功能
 */
async function testSmartAccounting() {
  try {
    // 创建Prisma客户端
    const prisma = new PrismaClient();

    // 创建LLM提供商服务
    const llmProviderService = new LLMProviderService();

    // 设置硅基流动API密钥
    process.env.SILICONFLOW_API_KEY = 'sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme';

    // 创建智能记账工作流
    const smartAccounting = new SmartAccounting(llmProviderService);

    // 查找一个有效的用户ID
    let userId = '1';
    try {
      const user = await prisma.user.findFirst();
      if (user) {
        userId = user.id;
        console.log(`使用用户ID: ${userId}`);
      }
    } catch (error) {
      console.error('查找用户时出错:', error);
    }

    // 测试描述
    const descriptions = [
      '昨天在沃尔玛买了日用品，花了128.5元',
      '今天在星巴克喝咖啡，花了35元',
      '收到工资5000元',
      '给妈妈买了生日礼物，200元',
      '坐地铁去上班，花了4元'
    ];

    // 测试每个描述
    for (const description of descriptions) {
      console.log(`\n处理描述: "${description}"`);

      try {
        // 处理描述
        const result = await smartAccounting.processDescription(description, userId);

        // 打印结果
        console.log('处理结果:');
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`处理描述 "${description}" 时出错:`, error);
      }
    }

    // 关闭Prisma客户端
    await prisma.$disconnect();
  } catch (error) {
    console.error('测试智能记账功能时出错:', error);
  }
}

// 运行测试
testSmartAccounting().then(() => {
  console.log('\n测试完成');
  process.exit(0);
}).catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
