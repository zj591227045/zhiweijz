#!/usr/bin/env node

/**
 * 数据库迁移管理器
 * 用于管理和执行数据库结构迁移
 * 支持版本控制和回滚
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor() {
    this.prisma = new PrismaClient();
    this.migrations = [
      {
        version: '0.1.4',
        name: 'add_refresh_day_to_budgets',
        description: '添加refresh_day字段到budgets表',
        dependencies: [],
        up: this.addRefreshDayField.bind(this),
        down: this.removeRefreshDayField.bind(this),
        validate: this.validateRefreshDay.bind(this)
      },
      {
        version: '0.1.5',
        name: 'add_custodial_user_support',
        description: '添加托管用户支持',
        dependencies: ['0.1.4'],
        up: this.addCustodialSupport.bind(this),
        down: this.removeCustodialSupport.bind(this),
        validate: this.validateCustodialSupport.bind(this)
      },
      {
        version: '0.1.6',
        name: 'add_account_book_enhancements',
        description: '增强账本功能',
        dependencies: ['0.1.5'],
        up: this.addAccountBookEnhancements.bind(this),
        down: this.removeAccountBookEnhancements.bind(this),
        validate: this.validateAccountBookEnhancements.bind(this)
      }
    ];
  }

  /**
   * 检查迁移表是否存在，不存在则创建
   */
  async ensureMigrationTable() {
    try {
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
      console.log('迁移表已准备就绪');
    } catch (error) {
      console.error('创建迁移表失败:', error.message);
      throw error;
    }
  }

  /**
   * 检查迁移是否已执行
   */
  async isMigrationExecuted(version) {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT COUNT(*) as count FROM _migrations WHERE version = ${version}
      `;
      return parseInt(result[0].count) > 0;
    } catch (error) {
      // 如果表不存在，说明是全新安装
      return false;
    }
  }

  /**
   * 记录迁移执行
   */
  async recordMigration(migration, executionTime = 0, status = 'SUCCESS') {
    const checksum = this.calculateMigrationChecksum(migration);
    await this.prisma.$executeRaw`
      INSERT INTO _migrations (version, name, description, checksum, execution_time, status)
      VALUES (${migration.version}, ${migration.name}, ${migration.description}, ${checksum}, ${executionTime}, ${status})
    `;
  }

  /**
   * 计算迁移校验和
   */
  calculateMigrationChecksum(migration) {
    const content = JSON.stringify({
      version: migration.version,
      name: migration.name,
      description: migration.description
    });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * 检查依赖关系
   */
  async checkDependencies(migration) {
    if (!migration.dependencies || migration.dependencies.length === 0) {
      return true;
    }

    for (const dep of migration.dependencies) {
      const isExecuted = await this.isMigrationExecuted(dep);
      if (!isExecuted) {
        throw new Error(`迁移 ${migration.version} 依赖 ${dep}，但该依赖尚未执行`);
      }
    }
    return true;
  }

  /**
   * 添加refresh_day字段的迁移
   */
  async addRefreshDayField() {
    console.log('执行迁移: 添加refresh_day字段...');

    // 检查字段是否已存在
    const result = await this.prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name = 'refresh_day'
    `;

    if (result.length > 0) {
      console.log('refresh_day字段已存在，跳过迁移');
      return;
    }

    // 执行迁移步骤
    await this.prisma.$executeRaw`
      ALTER TABLE budgets ADD COLUMN refresh_day INTEGER DEFAULT 1
    `;

    await this.prisma.$executeRaw`
      ALTER TABLE budgets ADD CONSTRAINT budgets_refresh_day_check 
      CHECK (refresh_day IN (1, 5, 10, 15, 20, 25))
    `;

    await this.prisma.$executeRaw`
      UPDATE budgets SET refresh_day = 1 WHERE refresh_day IS NULL
    `;

    await this.prisma.$executeRaw`
      ALTER TABLE budgets ALTER COLUMN refresh_day SET NOT NULL
    `;

    console.log('✅ refresh_day字段添加成功');
  }

  /**
   * 移除refresh_day字段的回滚迁移
   */
  async removeRefreshDayField() {
    console.log('回滚迁移: 移除refresh_day字段...');

    await this.prisma.$executeRaw`
      ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_refresh_day_check
    `;

    await this.prisma.$executeRaw`
      ALTER TABLE budgets DROP COLUMN IF EXISTS refresh_day
    `;

    console.log('✅ refresh_day字段移除成功');
  }

  /**
   * 执行所有待执行的迁移
   */
  async runMigrations() {
    try {
      console.log('开始执行数据库迁移...');
      
      await this.ensureMigrationTable();

      let executedCount = 0;
      
      for (const migration of this.migrations) {
        const isExecuted = await this.isMigrationExecuted(migration.version);

        if (!isExecuted) {
          console.log(`执行迁移 ${migration.version}: ${migration.description}`);

          // 检查依赖关系
          await this.checkDependencies(migration);

          const startTime = Date.now();
          try {
            await migration.up();
            const executionTime = Date.now() - startTime;

            // 验证迁移结果
            if (migration.validate) {
              const isValid = await migration.validate();
              if (!isValid) {
                throw new Error(`迁移 ${migration.version} 验证失败`);
              }
            }

            await this.recordMigration(migration, executionTime, 'SUCCESS');
            executedCount++;
            console.log(`✅ 迁移 ${migration.version} 执行成功 (${executionTime}ms)`);
          } catch (error) {
            const executionTime = Date.now() - startTime;
            await this.recordMigration(migration, executionTime, 'FAILED');
            throw error;
          }
        } else {
          console.log(`⏭️  迁移 ${migration.version} 已执行，跳过`);
        }
      }

      if (executedCount > 0) {
        console.log(`🎉 成功执行 ${executedCount} 个迁移`);
      } else {
        console.log('📋 所有迁移都已是最新状态');
      }

      // 验证最终状态
      await this.validateMigrations();

    } catch (error) {
      console.error('❌ 迁移执行失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证迁移结果
   */
  async validateMigrations() {
    try {
      // 检查refresh_day字段
      const refreshDayField = await this.prisma.$queryRaw`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'budgets' AND column_name = 'refresh_day'
      `;

      if (refreshDayField.length > 0) {
        console.log('✅ refresh_day字段验证通过');
      }

      // 检查约束
      const constraint = await this.prisma.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'budgets_refresh_day_check'
      `;

      if (constraint.length > 0) {
        console.log('✅ refresh_day约束验证通过');
      }

      // 统计预算数量
      const budgetCount = await this.prisma.budget.count();
      console.log(`📊 当前预算总数: ${budgetCount}`);

    } catch (error) {
      console.error('验证失败:', error.message);
    }
  }

  /**
   * 验证refresh_day字段
   */
  async validateRefreshDay() {
    const result = await this.prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'budgets' AND column_name = 'refresh_day'
    `;
    return result.length > 0;
  }

  /**
   * 添加托管用户支持
   */
  async addCustodialSupport() {
    console.log('执行迁移: 添加托管用户支持...');

    // 添加is_custodial字段到users表
    await this.prisma.$executeRaw`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false
    `;

    console.log('✅ 托管用户支持添加完成');
  }

  /**
   * 移除托管用户支持
   */
  async removeCustodialSupport() {
    console.log('回滚迁移: 移除托管用户支持...');

    await this.prisma.$executeRaw`
      ALTER TABLE users DROP COLUMN IF EXISTS is_custodial
    `;

    console.log('✅ 托管用户支持回滚完成');
  }

  /**
   * 验证托管用户支持
   */
  async validateCustodialSupport() {
    const result = await this.prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_custodial'
    `;
    return result.length > 0;
  }

  /**
   * 添加账本增强功能
   */
  async addAccountBookEnhancements() {
    console.log('执行迁移: 添加账本增强功能...');

    // 添加created_by字段
    await this.prisma.$executeRaw`
      ALTER TABLE account_books ADD COLUMN IF NOT EXISTS created_by TEXT
    `;

    // 添加user_llm_setting_id字段
    await this.prisma.$executeRaw`
      ALTER TABLE account_books ADD COLUMN IF NOT EXISTS user_llm_setting_id TEXT
    `;

    // 添加family_member_id字段到budgets表
    await this.prisma.$executeRaw`
      ALTER TABLE budgets ADD COLUMN IF NOT EXISTS family_member_id TEXT
    `;

    console.log('✅ 账本增强功能添加完成');
  }

  /**
   * 移除账本增强功能
   */
  async removeAccountBookEnhancements() {
    console.log('回滚迁移: 移除账本增强功能...');

    await this.prisma.$executeRaw`
      ALTER TABLE account_books DROP COLUMN IF EXISTS created_by
    `;

    await this.prisma.$executeRaw`
      ALTER TABLE account_books DROP COLUMN IF EXISTS user_llm_setting_id
    `;

    await this.prisma.$executeRaw`
      ALTER TABLE budgets DROP COLUMN IF EXISTS family_member_id
    `;

    console.log('✅ 账本增强功能回滚完成');
  }

  /**
   * 验证账本增强功能
   */
  async validateAccountBookEnhancements() {
    const fields = ['created_by', 'user_llm_setting_id'];
    for (const field of fields) {
      const result = await this.prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'account_books' AND column_name = ${field}
      `;
      if (result.length === 0) return false;
    }

    const budgetField = await this.prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'budgets' AND column_name = 'family_member_id'
    `;
    return budgetField.length > 0;
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
  const manager = new MigrationManager();
  
  manager.runMigrations()
    .then(() => {
      console.log('🎉 数据库迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 数据库迁移失败:', error);
      process.exit(1);
    })
    .finally(() => {
      manager.disconnect();
    });
}

module.exports = MigrationManager;
