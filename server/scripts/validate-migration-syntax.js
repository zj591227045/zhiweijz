#!/usr/bin/env node

/**
 * SQL迁移文件语法验证脚本
 * 用于检查迁移文件的基本语法和结构
 */

const fs = require('fs');
const path = require('path');

function validateMigrationFile(filePath) {
  console.log(`🔍 验证迁移文件: ${filePath}`);

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // 基本语法检查
    const checks = [
      {
        name: '文件包含BEGIN语句',
        test: content.includes('BEGIN;'),
        required: true
      },
      {
        name: '文件包含COMMIT语句',
        test: content.includes('COMMIT;'),
        required: true
      },
      {
        name: '包含INSERT语句',
        test: content.includes('INSERT INTO scheduled_tasks'),
        required: true
      },
      {
        name: '不包含显式id字段',
        test: !content.includes('id,\n') && !content.includes('gen_random_uuid(),'),
        required: true
      },
      {
        name: '包含ON CONFLICT处理',
        test: content.includes('ON CONFLICT DO NOTHING'),
        required: true
      },
      {
        name: '包含内部任务定义',
        test: content.includes('script_type,\n  script_path') || content.includes('script_type',''),
        required: true
      }
    ];

    let passed = 0;
    let failed = 0;

    console.log('\n📋 语法检查结果:');

    for (const check of checks) {
      if (check.test) {
        console.log(`   ✅ ${check.name}`);
        passed++;
      } else {
        console.log(`   ${check.required ? '❌' : '⚠️'} ${check.name}`);
        if (check.required) failed++;
      }
    }

    // 检查INSERT语句数量
    const insertMatches = content.match(/INSERT INTO scheduled_tasks/g);
    const insertCount = insertMatches ? insertMatches.length : 0;

    console.log(`\n📊 统计信息:`);
    console.log(`   INSERT语句数量: ${insertCount}`);
    console.log(`   预期任务数量: 8`);
    console.log(`   通过检查项目: ${passed}`);
    console.log(`   失败检查项目: ${failed}`);

    if (insertCount !== 8) {
      console.log(`   ⚠️  INSERT语句数量不匹配预期`);
      failed++;
    }

    const success = failed === 0;

    console.log(`\n${success ? '✅' : '❌'} 验证结果: ${success ? '通过' : '失败'}`);

    return success;

  } catch (error) {
    console.error(`❌ 读取文件失败: ${error.message}`);
    return false;
  }
}

// 验证修复后的迁移文件
const migrationFile = path.join(__dirname, '../migrations/incremental/add-internal-scheduled-tasks.sql');
const success = validateMigrationFile(migrationFile);

process.exit(success ? 0 : 1);