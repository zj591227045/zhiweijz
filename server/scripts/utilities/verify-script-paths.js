#!/usr/bin/env node

/**
 * 脚本路径验证工具
 * 验证所有脚本文件是否存在于正确的位置，以及引用是否正确
 */

const fs = require('fs');
const path = require('path');

class ScriptPathVerifier {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
    
    // 预期的目录结构
    this.expectedStructure = {
      'database': [
        'check-db.js',
        'create-default-account-book.js',
        'create-test-data.js',
        'generate-token.js'
      ],
      'migration': [
        'docker-safe-migrate.sh',
        'fix-migration-state.js',
        'init-database.sh',
        'mark-all-migrations.sh',
        'migrate-custodial-members.ts',
        'migrate-refresh-day.sh',
        'migration-manager.js',
        'validate-migration.js',
        'verify-database-sync.js',
        'version-conflict-resolver.js'
      ],
      'deployment': [
        'start.sh'
      ],
      'testing': [
        'test-budget-auto-continuation.ts',
        'test-budget-date-utils.ts',
        'test-category-logic.ts'
      ],
      'utilities': [
        'add-default-budget.ts',
        'budget-scheduler.ts',
        'cleanup-user-category-configs.ts',
        'create-budget-for-user.ts',
        'create-personal-budget.ts',
        'initialize-user-settings.ts',
        'verify-script-paths.js'
      ]
    };
  }

  /**
   * 验证目录结构
   */
  verifyDirectoryStructure() {
    console.log('🔍 验证目录结构...');
    
    const scriptsDir = path.join(__dirname, '..');
    
    // 检查每个分类目录
    for (const [category, files] of Object.entries(this.expectedStructure)) {
      const categoryDir = path.join(scriptsDir, category);
      
      if (!fs.existsSync(categoryDir)) {
        this.errors.push(`目录不存在: ${category}/`);
        continue;
      }
      
      this.success.push(`✅ 目录存在: ${category}/`);
      
      // 检查每个文件
      for (const file of files) {
        const filePath = path.join(categoryDir, file);
        
        if (!fs.existsSync(filePath)) {
          this.errors.push(`文件不存在: ${category}/${file}`);
        } else {
          this.success.push(`✅ 文件存在: ${category}/${file}`);
        }
      }
    }
  }

  /**
   * 验证文件权限
   */
  verifyFilePermissions() {
    console.log('🔐 验证文件权限...');
    
    const scriptsDir = path.join(__dirname, '..');
    
    // 检查shell脚本权限
    const shellScripts = [
      'migration/docker-safe-migrate.sh',
      'migration/init-database.sh',
      'migration/mark-all-migrations.sh',
      'migration/migrate-refresh-day.sh',
      'deployment/start.sh'
    ];
    
    for (const script of shellScripts) {
      const scriptPath = path.join(scriptsDir, script);
      
      if (fs.existsSync(scriptPath)) {
        try {
          const stats = fs.statSync(scriptPath);
          const mode = stats.mode;
          
          // 检查是否有执行权限 (0o111 = 执行权限)
          if (mode & 0o111) {
            this.success.push(`✅ 权限正确: ${script}`);
          } else {
            this.warnings.push(`⚠️  缺少执行权限: ${script}`);
          }
        } catch (error) {
          this.errors.push(`权限检查失败: ${script} - ${error.message}`);
        }
      }
    }
  }

  /**
   * 验证引用路径
   */
  verifyReferences() {
    console.log('🔗 验证引用路径...');
    
    const filesToCheck = [
      {
        file: '../../../server/Dockerfile',
        patterns: [
          'scripts/deployment/start.sh',
          'scripts/deployment/*.sh',
          'scripts/migration/*.sh'
        ]
      },
      {
        file: '../deployment/start.sh',
        patterns: [
          'scripts/migration/version-conflict-resolver.js',
          'scripts/migration/init-database.sh'
        ]
      },
      {
        file: '../../../docker/scripts/build-and-push.sh',
        patterns: [
          'server/scripts/deployment/start.sh'
        ]
      }
    ];
    
    for (const { file, patterns } of filesToCheck) {
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        this.warnings.push(`⚠️  引用检查跳过，文件不存在: ${file}`);
        continue;
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            this.success.push(`✅ 引用正确: ${file} -> ${pattern}`);
          } else {
            this.warnings.push(`⚠️  引用可能缺失: ${file} -> ${pattern}`);
          }
        }
      } catch (error) {
        this.errors.push(`引用检查失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 检查旧路径引用
   */
  checkOldReferences() {
    console.log('🔍 检查旧路径引用...');
    
    const oldPaths = [
      'scripts/start.sh',
      'scripts/migration-manager.js',
      'scripts/version-conflict-resolver.js',
      'scripts/init-database.sh'
    ];
    
    const filesToScan = [
      '../../../server/Dockerfile',
      '../deployment/start.sh',
      '../../../docker/scripts/build-and-push.sh',
      '../../../docs/DB_Update/QUICK_REFERENCE.md',
      '../../../docs/DB_Update/DATABASE_MIGRATION_STANDARDS.md'
    ];
    
    for (const file of filesToScan) {
      const filePath = path.join(__dirname, file);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        for (const oldPath of oldPaths) {
          if (content.includes(oldPath)) {
            this.warnings.push(`⚠️  发现旧路径引用: ${file} -> ${oldPath}`);
          }
        }
      } catch (error) {
        this.errors.push(`旧路径检查失败: ${file} - ${error.message}`);
      }
    }
  }

  /**
   * 运行所有验证
   */
  async runVerification() {
    console.log('🚀 开始脚本路径验证...');
    console.log('================================');
    
    this.verifyDirectoryStructure();
    this.verifyFilePermissions();
    this.verifyReferences();
    this.checkOldReferences();
    
    this.printResults();
  }

  /**
   * 打印验证结果
   */
  printResults() {
    console.log('\n📊 验证结果');
    console.log('================================');
    
    if (this.success.length > 0) {
      console.log('\n✅ 成功项目:');
      this.success.forEach(item => console.log(`  ${item}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  警告项目:');
      this.warnings.forEach(item => console.log(`  ${item}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ 错误项目:');
      this.errors.forEach(item => console.log(`  ${item}`));
    }
    
    console.log('\n📈 统计信息:');
    console.log(`  成功: ${this.success.length}`);
    console.log(`  警告: ${this.warnings.length}`);
    console.log(`  错误: ${this.errors.length}`);
    
    if (this.errors.length === 0) {
      console.log('\n🎉 脚本路径验证通过！');
      return true;
    } else {
      console.log('\n💥 脚本路径验证失败，请修复错误后重试');
      return false;
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const verifier = new ScriptPathVerifier();
  
  verifier.runVerification()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 验证过程中发生错误:', error);
      process.exit(1);
    });
}

module.exports = ScriptPathVerifier;
