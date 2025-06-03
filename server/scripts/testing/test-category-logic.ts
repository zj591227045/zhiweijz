import { PrismaClient, TransactionType } from '@prisma/client';
import { CategoryService } from '../src/services/category.service';

const prisma = new PrismaClient();

/**
 * 测试分类逻辑是否正确工作
 */
async function testCategoryLogic() {
  try {
    console.log('开始测试分类逻辑...');
    
    const categoryService = new CategoryService();
    
    // 1. 确保默认分类存在
    console.log('\n1. 初始化默认分类...');
    const initCount = await categoryService.initializeDefaultCategories();
    console.log(`初始化了 ${initCount} 个默认分类`);
    
    // 2. 创建测试用户
    console.log('\n2. 创建测试用户...');
    const testUser = await prisma.user.create({
      data: {
        email: 'test-category@example.com',
        name: '分类测试用户',
        password: 'test123456'
      }
    });
    console.log(`创建测试用户: ${testUser.id}`);
    
    // 3. 测试获取分类（应该显示默认分类，无需user_category_configs记录）
    console.log('\n3. 测试获取支出分类...');
    const expenseCategories = await categoryService.getCategories(testUser.id, TransactionType.EXPENSE);
    console.log(`获取到 ${expenseCategories.length} 个支出分类`);
    console.log('支出分类排序:');
    expenseCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} (排序: ${cat.displayOrder}, 隐藏: ${cat.isHidden})`);
    });
    
    console.log('\n4. 测试获取收入分类...');
    const incomeCategories = await categoryService.getCategories(testUser.id, TransactionType.INCOME);
    console.log(`获取到 ${incomeCategories.length} 个收入分类`);
    console.log('收入分类排序:');
    incomeCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} (排序: ${cat.displayOrder}, 隐藏: ${cat.isHidden})`);
    });
    
    // 4. 检查是否有user_category_configs记录（应该没有）
    console.log('\n5. 检查用户分类配置记录...');
    const userConfigs = await prisma.userCategoryConfig.findMany({
      where: { userId: testUser.id }
    });
    console.log(`用户分类配置记录数量: ${userConfigs.length}`);
    
    if (userConfigs.length === 0) {
      console.log('✅ 正确：新用户没有创建冗余的分类配置记录');
    } else {
      console.log('❌ 错误：新用户创建了不必要的分类配置记录');
      userConfigs.forEach(config => {
        console.log(`  - 分类ID: ${config.categoryId}, 排序: ${config.displayOrder}, 隐藏: ${config.isHidden}`);
      });
    }
    
    // 5. 测试分类排序调整（应该只为调整的分类创建记录）
    console.log('\n6. 测试分类排序调整...');
    const categoryIds = expenseCategories.map(cat => cat.id);
    // 将第一个分类移动到最后
    const reorderedIds = [...categoryIds.slice(1), categoryIds[0]];
    
    await categoryService.updateCategoryOrder(testUser.id, reorderedIds, TransactionType.EXPENSE);
    console.log('分类排序调整完成');
    
    // 6. 检查调整后的分类配置记录
    console.log('\n7. 检查调整后的用户分类配置记录...');
    const updatedConfigs = await prisma.userCategoryConfig.findMany({
      where: { userId: testUser.id },
      include: { category: true }
    });
    console.log(`调整后的用户分类配置记录数量: ${updatedConfigs.length}`);
    
    if (updatedConfigs.length === 1) {
      const config = updatedConfigs[0];
      console.log(`✅ 正确：只为调整的分类创建了配置记录`);
      console.log(`  - 分类: ${config.category?.name}, 新排序: ${config.displayOrder}`);
    } else {
      console.log('❌ 错误：创建了过多的分类配置记录');
      updatedConfigs.forEach(config => {
        console.log(`  - 分类: ${config.category?.name}, 排序: ${config.displayOrder}`);
      });
    }
    
    // 7. 验证调整后的分类排序
    console.log('\n8. 验证调整后的分类排序...');
    const reorderedCategories = await categoryService.getCategories(testUser.id, TransactionType.EXPENSE);
    console.log('调整后的支出分类排序:');
    reorderedCategories.forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} (排序: ${cat.displayOrder})`);
    });
    
    // 8. 清理测试数据
    console.log('\n9. 清理测试数据...');
    await prisma.userCategoryConfig.deleteMany({
      where: { userId: testUser.id }
    });
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    console.log('测试数据清理完成');
    
    console.log('\n✅ 分类逻辑测试完成！');
    
  } catch (error) {
    console.error('测试分类逻辑失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testCategoryLogic();
