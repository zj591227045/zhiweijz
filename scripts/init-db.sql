-- 数据库初始化脚本
-- 此脚本在PostgreSQL容器首次启动时执行

-- 确保数据库存在
SELECT 'CREATE DATABASE zhiweijz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'zhiweijz')\gexec

-- 设置数据库编码
ALTER DATABASE zhiweijz SET timezone TO 'Asia/Shanghai';

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 输出初始化完成信息
\echo 'Database zhiweijz initialized successfully'
