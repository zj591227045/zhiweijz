const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 修复迁移状态 - 标记已存在的数据库结构对应的迁移为已应用
 */
async function fixMigrationState() {
  console.log('🔧 开始修复迁移状态...');
  
  try {
    // 检查数据库中已存在的表
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    
    console.log('📊 现有表:', existingTables.map(t => t.table_name).join(', '));
    
    // 检查已存在的枚举类型
    const existingEnums = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
    `;
    
    console.log('📊 现有枚举:', existingEnums.map(e => e.typname).join(', '));
    
    // 需要标记为已应用的迁移（基于数据库现有结构）
    const migrationsToMark = [
      '20250515135020_init', // 基础表结构已存在
    ];
    
    // 检查每个迁移是否应该标记为已应用
    const allMigrations = [
      '20250515140114_add_password_reset_token',
      '20250515140202_add_user_settings', 
      '20250515_fix_email_uniqueness',
      '20250516003807_add_name_to_budget',
      '20250516024140_add_account_book_model',
      '20250517060000_add_category_budget_table',
      '20250517062712_add_missing_columns',
      '20250517064314_add_user_category_config',
      '20250517083516_add_user_birth_date',
      '20250517122223_add_security_tables',
      '20250517235836_add_account_book_type_and_family_relation',
      '20250518000000_add_budget_type',
      '20250519000000_add_budget_history_table',
      '20250520000000_add_transaction_metadata',
      '20250521000000_add_budget_history_fields',
      '20250521000001_add_budget_amount_modified_fields',
      '20250527000000_add_created_by_to_account_books',
      '20250527000001_add_missing_family_member_fields',
      '20250527000002_add_missing_tables_and_enums',
      '20250527000003_add_foreign_keys',
      '20250527000004_add_is_custodial_to_users'
    ];
    
    // 检查关键字段是否存在，决定哪些迁移需要标记为已应用
    const fieldChecks = [
      { migration: '20250517083516_add_user_birth_date', table: 'users', field: 'birth_date' },
      { migration: '20250527000001_add_missing_family_member_fields', table: 'family_members', field: 'is_custodial' },
      { migration: '20250527000004_add_is_custodial_to_users', table: 'users', field: 'is_custodial' }
    ];
    
    for (const check of fieldChecks) {
      try {
        const result = await prisma.$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = ${check.table} AND column_name = ${check.field}
        `;
        
        if (result.length > 0) {
          console.log(`✅ 字段 ${check.table}.${check.field} 存在，标记迁移 ${check.migration}`);
          if (!migrationsToMark.includes(check.migration)) {
            migrationsToMark.push(check.migration);
          }
        }
      } catch (error) {
        console.log(`⚠️  检查字段 ${check.table}.${check.field} 失败:`, error.message);
      }
    }
    
    // 标记迁移为已应用
    for (const migration of migrationsToMark) {
      try {
        await prisma.$queryRaw`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (gen_random_uuid(), '', NOW(), ${migration}, '', NULL, NOW(), 1)
          ON CONFLICT (migration_name) DO NOTHING
        `;
        console.log(`✅ 标记迁移 ${migration} 为已应用`);
      } catch (error) {
        console.log(`⚠️  标记迁移 ${migration} 失败:`, error.message);
      }
    }
    
    console.log('🎉 迁移状态修复完成！');
    return true;
    
  } catch (error) {
    console.error('❌ 修复迁移状态失败:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const success = await fixMigrationState();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { fixMigrationState };
