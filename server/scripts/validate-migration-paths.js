#!/usr/bin/env node

/**
 * 验证迁移路径完整性脚本
 * 检查所有版本的升级路径是否完整和一致
 */

const fs = require('fs');
const path = require('path');

// 导入迁移配置
const migrationManagerPath = path.join(__dirname, '../migrations/migration-manager.js');
const migrationManagerContent = fs.readFileSync(migrationManagerPath, 'utf8');

// 提取UPGRADE_PATHS配置
const upgradePathsMatch = migrationManagerContent.match(/UPGRADE_PATHS:\s*{([\s\S]*?)}/);
if (!upgradePathsMatch) {
  console.error('❌ 无法找到UPGRADE_PATHS配置');
  process.exit(1);
}

// 解析配置（简化版本，仅用于验证）
const upgradePathsStr = upgradePathsMatch[1];
const lines = upgradePathsStr.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));

const UPGRADE_PATHS = {};
const LATEST_VERSION = '1.8.2';

// 解析每一行配置
lines.forEach(line => {
  const match = line.match(/'([^']+)':\s*\[(.*?)\]/);
  if (match) {
    const version = match[1];
    const migrationsStr = match[2];
    const migrations = migrationsStr
      .split(',')
      .map(m => m.trim().replace(/'/g, ''))
      .filter(m => m);
    UPGRADE_PATHS[version] = migrations;
  }
});

console.log('🔍 开始验证迁移路径完整性...\n');

// 1. 检查所有迁移文件是否存在
console.log('📁 检查迁移文件存在性:');
const migrationsDir = path.join(__dirname, '../migrations/incremental');
const allMigrations = new Set();

// 收集所有引用的迁移
Object.values(UPGRADE_PATHS).forEach(migrations => {
  migrations.forEach(migration => allMigrations.add(migration));
});

let missingFiles = 0;
allMigrations.forEach(migration => {
  const filePath = path.join(migrationsDir, `${migration}.sql`);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${migration}.sql`);
  } else {
    console.log(`  ❌ ${migration}.sql (文件不存在)`);
    missingFiles++;
  }
});

if (missingFiles > 0) {
  console.log(`\n⚠️  发现 ${missingFiles} 个缺失的迁移文件\n`);
} else {
  console.log('\n✅ 所有迁移文件都存在\n');
}

// 2. 检查版本升级路径的一致性
console.log('🔄 检查版本升级路径一致性:');

// 检查是否所有版本都能升级到最新版本
const versions = Object.keys(UPGRADE_PATHS).filter(v => v !== 'fresh_install');
let inconsistentPaths = 0;

versions.forEach(version => {
  const migrations = UPGRADE_PATHS[version];
  const hasPromptUpdate = migrations.includes('update-smart-accounting-prompts-v1.8.1');
  const hasRegistrationGiftConfig = migrations.includes('add-registration-gift-config');

  if (version === LATEST_VERSION) {
    if (migrations.length === 0) {
      console.log(`  ✅ ${version}: 当前最新版本，无需迁移`);
    } else {
      console.log(`  ❌ ${version}: 最新版本不应包含迁移路径`);
      inconsistentPaths++;
    }
  } else {
    // 检查是否包含必要的迁移
    const missingMigrations = [];

    // 1.8.1版本已经包含了提示词更新，所以只需要注册赠送配置
    if (version === '1.8.1') {
      if (!hasRegistrationGiftConfig) missingMigrations.push('注册赠送配置');
    } else {
      // 其他版本需要包含所有迁移
      if (!hasPromptUpdate) missingMigrations.push('提示词更新');
      if (!hasRegistrationGiftConfig) missingMigrations.push('注册赠送配置');
    }

    if (missingMigrations.length === 0) {
      console.log(`  ✅ ${version}: 包含所有必要迁移`);
    } else {
      console.log(`  ❌ ${version}: 缺少迁移 - ${missingMigrations.join(', ')}`);
      inconsistentPaths++;
    }
  }
});

if (inconsistentPaths > 0) {
  console.log(`\n⚠️  发现 ${inconsistentPaths} 个不一致的升级路径\n`);
} else {
  console.log('\n✅ 所有升级路径都一致\n');
}

// 3. 检查fresh_install路径
console.log('🆕 检查fresh_install路径:');
const freshInstallMigrations = UPGRADE_PATHS['fresh_install'] || [];
const hasAllRequiredMigrations = [
  'base-schema',
  'update-smart-accounting-prompts-v1.8.1',
  'add-registration-gift-config'
].every(required => freshInstallMigrations.includes(required));

if (hasAllRequiredMigrations) {
  console.log('  ✅ fresh_install包含所有必需的迁移');
} else {
  console.log('  ❌ fresh_install缺少必需的迁移');
}

console.log(`  📊 fresh_install包含 ${freshInstallMigrations.length} 个迁移\n`);

// 4. 生成统计报告
console.log('📊 统计报告:');
console.log(`  - 总版本数: ${versions.length}`);
console.log(`  - 最新版本: ${LATEST_VERSION}`);
console.log(`  - 总迁移文件数: ${allMigrations.size}`);
console.log(`  - 缺失文件数: ${missingFiles}`);
console.log(`  - 不一致路径数: ${inconsistentPaths}`);

// 5. 总结
console.log('\n🎯 验证结果:');
if (missingFiles === 0 && inconsistentPaths === 0) {
  console.log('✅ 所有迁移路径验证通过！');
  process.exit(0);
} else {
  console.log('❌ 发现问题，需要修复');
  process.exit(1);
}
