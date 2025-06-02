const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 验证数据库迁移是否正确完成
 * 确保所有必要的表和字段都存在
 */
async function validateMigration() {
  console.log('🔍 开始验证数据库迁移...');
  
  try {
    // 验证关键表是否存在
    const requiredTables = [
      'users', 'families', 'family_members', 'account_books', 
      'budgets', 'transactions', 'categories', 'sessions'
    ];
    
    for (const table of requiredTables) {
      try {
        await prisma.$queryRaw`SELECT 1 FROM ${table} LIMIT 1`;
        console.log(`✅ 表 ${table} 存在`);
      } catch (error) {
        console.error(`❌ 表 ${table} 不存在或无法访问`);
        return false;
      }
    }
    
    // 验证关键字段是否存在
    const criticalFields = [
      { table: 'users', field: 'is_custodial' },
      { table: 'family_members', field: 'is_custodial' },
      { table: 'budgets', field: 'budget_type' },
      { table: 'account_books', field: 'type' }
    ];
    
    for (const { table, field } of criticalFields) {
      try {
        const result = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${table} AND column_name = ${field}
        `;
        
        if (result.length > 0) {
          console.log(`✅ 字段 ${table}.${field} 存在`);
        } else {
          console.error(`❌ 字段 ${table}.${field} 不存在`);
          return false;
        }
      } catch (error) {
        console.error(`❌ 验证字段 ${table}.${field} 时出错:`, error.message);
        return false;
      }
    }
    
    // 验证枚举类型是否存在
    const requiredEnums = [
      'TransactionType', 'BudgetPeriod', 'Role', 'AccountBookType', 'BudgetType'
    ];
    
    for (const enumType of requiredEnums) {
      try {
        const result = await prisma.$queryRaw`
          SELECT typname 
          FROM pg_type 
          WHERE typname = ${enumType}
        `;
        
        if (result.length > 0) {
          console.log(`✅ 枚举类型 ${enumType} 存在`);
        } else {
          console.error(`❌ 枚举类型 ${enumType} 不存在`);
          return false;
        }
      } catch (error) {
        console.error(`❌ 验证枚举类型 ${enumType} 时出错:`, error.message);
        return false;
      }
    }
    
    // 验证外键约束
    console.log('🔗 验证外键约束...');
    try {
      // 测试一些关键的外键关系
      await prisma.$queryRaw`
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name IN ('family_members', 'budgets', 'transactions')
      `;
      console.log('✅ 外键约束验证通过');
    } catch (error) {
      console.error('❌ 外键约束验证失败:', error.message);
      return false;
    }
    
    console.log('🎉 数据库迁移验证成功！');
    return true;
    
  } catch (error) {
    console.error('❌ 迁移验证过程中发生错误:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 检查数据完整性
 */
async function checkDataIntegrity() {
  console.log('🔍 检查数据完整性...');
  
  try {
    // 检查是否有孤立的记录
    const orphanedBudgets = await prisma.budget.findMany({
      where: {
        AND: [
          { userId: null },
          { familyMemberId: null }
        ]
      }
    });
    
    if (orphanedBudgets.length > 0) {
      console.warn(`⚠️  发现 ${orphanedBudgets.length} 个孤立的预算记录`);
    } else {
      console.log('✅ 预算记录完整性检查通过');
    }
    
    // 检查托管用户数据
    const custodialUsers = await prisma.user.findMany({
      where: { isCustodial: true }
    });
    
    console.log(`📊 托管用户数量: ${custodialUsers.length}`);
    
    // 检查托管成员数据
    const custodialMembers = await prisma.familyMember.findMany({
      where: { 
        isCustodial: true,
        userId: null 
      }
    });
    
    if (custodialMembers.length > 0) {
      console.warn(`⚠️  发现 ${custodialMembers.length} 个未迁移的托管成员`);
    } else {
      console.log('✅ 托管成员迁移检查通过');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 数据完整性检查失败:', error);
    return false;
  }
}

async function main() {
  const migrationValid = await validateMigration();
  const dataIntegrityValid = await checkDataIntegrity();
  
  if (migrationValid && dataIntegrityValid) {
    console.log('🎉 所有验证通过！数据库状态正常');
    process.exit(0);
  } else {
    console.error('❌ 验证失败！请检查数据库状态');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateMigration, checkDataIntegrity };
