#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAndRecreate() {
  try {
    console.log('清理旧的版本管理表...');
    
    // 删除表
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS app_versions CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS version_configs CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS version_check_logs CASCADE;`);
    
    // 删除枚举类型
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "Platform" CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "VersionAction" CASCADE;`);
    
    console.log('✅ 清理完成');
    
    // 重新创建枚举类型
    console.log('创建枚举类型...');
    await prisma.$executeRawUnsafe(`CREATE TYPE "Platform" AS ENUM ('WEB', 'IOS', 'ANDROID');`);
    await prisma.$executeRawUnsafe(`CREATE TYPE "VersionAction" AS ENUM ('CHECK', 'UPDATE', 'SKIP');`);
    
    console.log('✅ 枚举类型创建完成');
    
    // 重新创建表
    console.log('创建版本管理表...');
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE app_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform "Platform" NOT NULL,
        version VARCHAR(50) NOT NULL,
        build_number INTEGER NOT NULL,
        version_code INTEGER NOT NULL,
        release_notes TEXT,
        download_url TEXT,
        app_store_url TEXT,
        is_force_update BOOLEAN DEFAULT false,
        is_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ,
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        
        UNIQUE(platform, version),
        UNIQUE(platform, version_code)
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE version_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    await prisma.$executeRawUnsafe(`
      CREATE TABLE version_check_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        platform "Platform" NOT NULL,
        current_version VARCHAR(50),
        current_build_number INTEGER,
        latest_version VARCHAR(50),
        latest_build_number INTEGER,
        action "VersionAction" NOT NULL,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    console.log('✅ 表创建完成');
    
    // 创建索引
    console.log('创建索引...');
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_app_versions_platform ON app_versions(platform);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_app_versions_enabled ON app_versions(is_enabled);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_app_versions_published_at ON app_versions(published_at);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_version_check_logs_user_id ON version_check_logs(user_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_version_check_logs_platform ON version_check_logs(platform);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX idx_version_check_logs_created_at ON version_check_logs(created_at);`);
    
    console.log('✅ 索引创建完成');
    
    // 插入默认配置
    console.log('插入默认配置...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO version_configs (key, value, description) VALUES
      ('version_check_enabled', 'false', '启用版本检查功能'),
      ('version_check_interval', '86400', '版本检查间隔(秒)'),
      ('force_update_grace_period', '604800', '强制更新宽限期(秒)'),
      ('version_check_api_enabled', 'true', '启用版本检查API'),
      ('update_notification_enabled', 'true', '启用更新通知')
      ON CONFLICT (key) DO NOTHING;
    `);
    
    // 插入初始版本数据
    console.log('插入初始版本数据...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO app_versions (platform, version, build_number, version_code, release_notes, is_enabled, published_at) VALUES
      ('WEB', '1.0.0', 1, 1000, '初始版本', true, NOW()),
      ('IOS', '1.0.0', 1, 1000, '初始版本', true, NOW()),
      ('ANDROID', '1.0.0', 1, 1000, '初始版本', true, NOW())
      ON CONFLICT (platform, version) DO NOTHING;
    `);
    
    console.log('✅ 版本管理系统重新创建完成');
    
  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAndRecreate().catch(console.error);