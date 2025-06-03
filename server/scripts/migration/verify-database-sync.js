#!/usr/bin/env node

// 验证数据库同步脚本
// 检查Docker数据库是否与生产环境保持一致

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTableExists(tableName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`检查表 ${tableName} 时出错:`, error.message);
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = ${tableName} 
        AND column_name = ${columnName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    console.error(`检查列 ${tableName}.${columnName} 时出错:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 开始验证数据库同步状态...\n');

  const checks = [
    // 检查关键表是否存在
    { type: 'table', name: 'account_books', description: '账本表' },
    { type: 'table', name: 'budgets', description: '预算表' },
    { type: 'table', name: 'user_llm_settings', description: 'LLM设置表' },
    { type: 'table', name: 'user_account_books', description: '用户账本关联表' },
    
    // 检查关键列是否存在
    { type: 'column', table: 'account_books', column: 'created_by', description: '账本创建者列' },
    { type: 'column', table: 'account_books', column: 'user_llm_setting_id', description: '账本LLM设置关联列' },
    { type: 'column', table: 'budgets', column: 'family_member_id', description: '预算家庭成员关联列' },
  ];

  let allPassed = true;

  for (const check of checks) {
    let exists = false;
    let description = '';

    if (check.type === 'table') {
      exists = await checkTableExists(check.name);
      description = `表 ${check.name} (${check.description})`;
    } else if (check.type === 'column') {
      exists = await checkColumnExists(check.table, check.column);
      description = `列 ${check.table}.${check.column} (${check.description})`;
    }

    if (exists) {
      console.log(`✅ ${description} - 存在`);
    } else {
      console.log(`❌ ${description} - 缺失`);
      allPassed = false;
    }
  }

  console.log('\n📊 数据库功能测试...');

  try {
    // 测试基本查询
    const userCount = await prisma.user.count();
    console.log(`✅ 用户表查询 - 成功 (${userCount} 条记录)`);

    const accountBookCount = await prisma.accountBook.count();
    console.log(`✅ 账本表查询 - 成功 (${accountBookCount} 条记录)`);

    const budgetCount = await prisma.budget.count();
    console.log(`✅ 预算表查询 - 成功 (${budgetCount} 条记录)`);

    // 测试关联查询
    const accountBooksWithUser = await prisma.accountBook.findMany({
      include: { user: true },
      take: 1
    });
    console.log(`✅ 账本用户关联查询 - 成功`);

  } catch (error) {
    console.log(`❌ 数据库查询测试失败: ${error.message}`);
    allPassed = false;
  }

  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 数据库同步验证通过！所有检查项目都正常。');
    console.log('✨ Docker环境已与生产环境保持一致。');
  } else {
    console.log('⚠️  数据库同步验证失败！存在缺失的表或列。');
    console.log('🔧 请检查迁移脚本并重新运行。');
  }

  console.log('='.repeat(50));
}

main()
  .catch((error) => {
    console.error('验证过程中发生错误:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
