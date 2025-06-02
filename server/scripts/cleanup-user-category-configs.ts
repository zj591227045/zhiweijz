import { PrismaClient } from '@prisma/client';
import { defaultCategoryOrder } from '../src/models/category.model';

const prisma = new PrismaClient();

/**
 * 清理用户分类配置表中的冗余记录
 * 只保留真正调整过的分类配置（排序不等于默认排序或被隐藏的分类）
 */
async function cleanupUserCategoryConfigs() {
  try {
    console.log('开始清理用户分类配置表中的冗余记录...');
    
    // 获取所有用户分类配置
    const allConfigs = await prisma.userCategoryConfig.findMany({
      include: {
        category: true
      }
    });
    
    console.log(`找到 ${allConfigs.length} 个用户分类配置记录`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const config of allConfigs) {
      const category = config.category;
      
      // 如果分类不存在，删除配置
      if (!category) {
        console.log(`删除无效配置记录 ${config.id}（分类不存在）`);
        await prisma.userCategoryConfig.delete({
          where: { id: config.id }
        });
        deletedCount++;
        continue;
      }
      
      // 如果是自定义分类（非默认分类），保留配置
      if (!category.isDefault) {
        console.log(`保留自定义分类配置: ${category.name} (用户: ${config.userId})`);
        keptCount++;
        continue;
      }
      
      // 对于默认分类，检查是否真正调整过
      const defaultOrder = defaultCategoryOrder[category.type]?.[category.name];
      
      // 如果分类被隐藏，保留配置
      if (config.isHidden) {
        console.log(`保留隐藏分类配置: ${category.name} (用户: ${config.userId})`);
        keptCount++;
        continue;
      }
      
      // 如果排序与默认排序不同，保留配置
      if (defaultOrder !== undefined && config.displayOrder !== defaultOrder) {
        console.log(`保留调整排序的分类配置: ${category.name} (用户: ${config.userId}, 默认排序: ${defaultOrder}, 当前排序: ${config.displayOrder})`);
        keptCount++;
        continue;
      }
      
      // 如果排序与默认排序相同且未隐藏，删除冗余配置
      console.log(`删除冗余配置: ${category.name} (用户: ${config.userId}, 排序: ${config.displayOrder})`);
      await prisma.userCategoryConfig.delete({
        where: { id: config.id }
      });
      deletedCount++;
    }
    
    console.log(`清理完成！删除了 ${deletedCount} 个冗余记录，保留了 ${keptCount} 个有效记录`);
    
    // 验证清理结果
    const remainingConfigs = await prisma.userCategoryConfig.count();
    console.log(`清理后剩余配置记录数量: ${remainingConfigs}`);
    
  } catch (error) {
    console.error('清理用户分类配置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
cleanupUserCategoryConfigs();
