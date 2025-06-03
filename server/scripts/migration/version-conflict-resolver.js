#!/usr/bin/env node

/**
 * 版本冲突解决器
 * 专门处理数据库版本冲突和迁移状态不一致问题
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

class VersionConflictResolver {
  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * 检测并解决版本冲突
   */
  async resolveConflicts() {
    try {
      console.log('🔍 开始检测版本冲突...');
      
      // 1. 检查Prisma迁移状态
      const migrationStatus = await this.checkMigrationStatus();
      
      // 2. 检查数据库实际状态
      const dbStatus = await this.checkDatabaseStatus();
      
      // 3. 检查应用版本与数据库版本匹配
      const versionMatch = await this.checkVersionMatch();
      
      // 4. 解决冲突
      if (migrationStatus.hasConflict || dbStatus.hasIssues || !versionMatch.isMatch) {
        await this.resolveVersionConflicts(migrationStatus, dbStatus, versionMatch);
      } else {
        console.log('✅ 未发现版本冲突');
      }
      
    } catch (error) {
      console.error('❌ 版本冲突解决失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查Prisma迁移状态
   */
  async checkMigrationStatus() {
    try {
      const output = execSync('npx prisma migrate status', { encoding: 'utf8' });
      
      const hasConflict = output.includes('drift') || 
                         output.includes('conflict') || 
                         output.includes('failed') ||
                         output.includes('pending');
      
      const hasPendingMigrations = output.includes('following migration');
      
      return {
        hasConflict,
        hasPendingMigrations,
        output
      };
    } catch (error) {
      return {
        hasConflict: true,
        hasPendingMigrations: false,
        output: error.message,
        error: true
      };
    }
  }

  /**
   * 检查数据库实际状态
   */
  async checkDatabaseStatus() {
    const issues = [];
    
    try {
      // 检查关键表是否存在
      const requiredTables = ['users', 'account_books', 'budgets', 'transactions'];
      for (const table of requiredTables) {
        try {
          await this.prisma.$queryRaw`SELECT 1 FROM ${table} LIMIT 1`;
        } catch (error) {
          issues.push(`表 ${table} 不存在或无法访问`);
        }
      }

      // 检查关键字段是否存在
      const requiredFields = [
        { table: 'users', field: 'is_custodial' },
        { table: 'budgets', field: 'refresh_day' },
        { table: 'account_books', field: 'created_by' }
      ];

      for (const { table, field } of requiredFields) {
        const result = await this.prisma.$queryRaw`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = ${table} AND column_name = ${field}
        `;
        if (result.length === 0) {
          issues.push(`表 ${table} 缺少字段 ${field}`);
        }
      }

      return {
        hasIssues: issues.length > 0,
        issues
      };
    } catch (error) {
      return {
        hasIssues: true,
        issues: [`数据库连接或查询失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查应用版本与数据库版本匹配
   */
  async checkVersionMatch() {
    try {
      // 获取应用版本
      const packageJson = require('../../package.json');
      const appVersion = packageJson.version;

      // 检查迁移表是否存在
      let dbVersion = '0.0.0';
      try {
        const result = await this.prisma.$queryRaw`
          SELECT version FROM _migrations ORDER BY executed_at DESC LIMIT 1
        `;
        if (result.length > 0) {
          dbVersion = result[0].version;
        }
      } catch (error) {
        // 迁移表不存在，说明是全新数据库
        console.log('迁移表不存在，可能是全新数据库');
      }

      const isMatch = this.compareVersions(appVersion, dbVersion);

      return {
        isMatch,
        appVersion,
        dbVersion
      };
    } catch (error) {
      return {
        isMatch: false,
        appVersion: 'unknown',
        dbVersion: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * 比较版本号
   */
  compareVersions(appVersion, dbVersion) {
    // 简化的版本比较，实际项目中可能需要更复杂的逻辑
    const appParts = appVersion.split('.').map(Number);
    const dbParts = dbVersion.split('.').map(Number);

    // 如果数据库版本落后于应用版本，需要迁移
    for (let i = 0; i < Math.max(appParts.length, dbParts.length); i++) {
      const appPart = appParts[i] || 0;
      const dbPart = dbParts[i] || 0;
      
      if (appPart > dbPart) {
        return false; // 需要升级数据库
      } else if (appPart < dbPart) {
        return false; // 数据库版本过新，可能需要回滚应用
      }
    }
    
    return true; // 版本匹配
  }

  /**
   * 解决版本冲突
   */
  async resolveVersionConflicts(migrationStatus, dbStatus, versionMatch) {
    console.log('🔧 开始解决版本冲突...');

    // 1. 处理Prisma迁移冲突
    if (migrationStatus.hasConflict) {
      console.log('📋 解决Prisma迁移冲突...');
      await this.resolvePrismaMigrationConflict();
    }

    // 2. 处理数据库结构问题
    if (dbStatus.hasIssues) {
      console.log('🔧 修复数据库结构问题...');
      await this.fixDatabaseStructure(dbStatus.issues);
    }

    // 3. 处理版本不匹配
    if (!versionMatch.isMatch) {
      console.log('🔄 同步版本信息...');
      await this.syncVersionInfo(versionMatch);
    }

    console.log('✅ 版本冲突解决完成');
  }

  /**
   * 解决Prisma迁移冲突
   */
  async resolvePrismaMigrationConflict() {
    try {
      // 方案1: 尝试重置迁移状态
      console.log('尝试重置迁移状态...');
      execSync('npx prisma migrate resolve --applied $(ls prisma/migrations | tail -1)', { stdio: 'inherit' });
      
      // 方案2: 如果还有问题，强制同步
      const statusAfterReset = await this.checkMigrationStatus();
      if (statusAfterReset.hasConflict) {
        console.log('强制同步数据库结构...');
        execSync('npx prisma db push --force-reset --accept-data-loss', { stdio: 'inherit' });
      }
    } catch (error) {
      console.warn('Prisma迁移冲突解决失败，将使用备用方案:', error.message);
      // 备用方案：直接推送当前schema
      execSync('npx prisma db push --force-reset --accept-data-loss', { stdio: 'inherit' });
    }
  }

  /**
   * 修复数据库结构问题
   */
  async fixDatabaseStructure(issues) {
    for (const issue of issues) {
      console.log(`修复问题: ${issue}`);
      
      if (issue.includes('缺少字段 is_custodial')) {
        await this.prisma.$executeRaw`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false
        `;
      }
      
      if (issue.includes('缺少字段 refresh_day')) {
        await this.prisma.$executeRaw`
          ALTER TABLE budgets ADD COLUMN IF NOT EXISTS refresh_day INTEGER DEFAULT 1
        `;
      }
      
      if (issue.includes('缺少字段 created_by')) {
        await this.prisma.$executeRaw`
          ALTER TABLE account_books ADD COLUMN IF NOT EXISTS created_by TEXT
        `;
      }
    }
  }

  /**
   * 同步版本信息
   */
  async syncVersionInfo(versionMatch) {
    try {
      // 确保迁移表存在
      await this.prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          checksum VARCHAR(64),
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER,
          status VARCHAR(20) DEFAULT 'SUCCESS'
        )
      `;

      // 记录当前应用版本
      await this.prisma.$executeRaw`
        INSERT INTO _migrations (version, name, description, status)
        VALUES (${versionMatch.appVersion}, 'version_sync', '版本同步', 'SUCCESS')
        ON CONFLICT (version) DO NOTHING
      `;

      console.log(`版本信息已同步: ${versionMatch.appVersion}`);
    } catch (error) {
      console.warn('版本信息同步失败:', error.message);
    }
  }

  /**
   * 关闭数据库连接
   */
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const resolver = new VersionConflictResolver();
  
  resolver.resolveConflicts()
    .then(() => {
      console.log('🎉 版本冲突检查和解决完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 版本冲突解决失败:', error);
      process.exit(1);
    })
    .finally(() => {
      resolver.disconnect();
    });
}

module.exports = VersionConflictResolver;
