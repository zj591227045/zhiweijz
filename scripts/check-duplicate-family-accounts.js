const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('检查重复的家庭账本...');
    
    // 1. 获取指定的两个家庭账本详细信息
    const accountBook1Id = '2ea0deed-b08e-4bed-ab0d-9cc3c76d5e73';
    const accountBook2Id = 'b06549b1-2118-45e5-96e1-cce1ce8b484c';
    
    const accountBook1 = await prisma.$queryRaw`
      SELECT * FROM account_books WHERE id = ${accountBook1Id}
    `;
    
    const accountBook2 = await prisma.$queryRaw`
      SELECT * FROM account_books WHERE id = ${accountBook2Id}
    `;
    
    console.log('\n账本1详情:');
    console.log(accountBook1);
    
    console.log('\n账本2详情:');
    console.log(accountBook2);
    
    // 2. 获取关联的家庭信息
    const familyId = accountBook1[0].family_id;
    
    const family = await prisma.$queryRaw`
      SELECT * FROM families WHERE id = ${familyId}
    `;
    
    console.log('\n关联的家庭信息:');
    console.log(family);
    
    // 3. 获取家庭成员信息
    const familyMembers = await prisma.$queryRaw`
      SELECT * FROM family_members WHERE family_id = ${familyId}
    `;
    
    console.log('\n家庭成员信息:');
    console.log(familyMembers);
    
    // 4. 检查家庭账本创建和删除的逻辑
    console.log('\n检查家庭账本创建和删除的代码逻辑...');
    
    // 5. 检查所有与该家庭关联的账本
    const allFamilyAccountBooks = await prisma.$queryRaw`
      SELECT * FROM account_books WHERE family_id = ${familyId}
    `;
    
    console.log('\n所有与该家庭关联的账本:');
    console.log(allFamilyAccountBooks);
    
    // 6. 检查每个家庭成员在家庭账本下的预算
    console.log('\n检查每个家庭成员在家庭账本下的预算...');
    
    for (const member of familyMembers) {
      const memberBudgets = await prisma.$queryRaw`
        SELECT * FROM budgets 
        WHERE user_id = ${member.user_id} 
        AND family_id = ${familyId}
      `;
      
      console.log(`\n家庭成员 ${member.name} (ID: ${member.id}) 的预算:`);
      console.log(memberBudgets);
    }
    
    // 7. 检查家庭成员添加和移除的逻辑
    console.log('\n检查家庭成员添加和移除的代码逻辑...');
    
  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
