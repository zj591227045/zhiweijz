/*META
VERSION: 1.7.0
DESCRIPTION: 文件存储功能 - 添加S3文件存储支持
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：添加文件存储功能
-- 支持S3协议的文件存储，包括用户头像和交易附件
-- =======================================

-- 1. 创建文件存储类型枚举
DO $$ BEGIN
    CREATE TYPE "FileStorageType" AS ENUM ('LOCAL', 'S3', 'OSS', 'COS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 创建文件状态枚举
DO $$ BEGIN
    CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'DELETED', 'EXPIRED', 'PROCESSING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. 创建附件类型枚举
DO $$ BEGIN
    CREATE TYPE "AttachmentType" AS ENUM ('RECEIPT', 'INVOICE', 'CONTRACT', 'PHOTO', 'DOCUMENT', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. 创建文件存储表
CREATE TABLE IF NOT EXISTS "file_storage" (
    "id" TEXT NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "key" VARCHAR(500) NOT NULL,
    "url" VARCHAR(1000),
    "storage_type" "FileStorageType" NOT NULL DEFAULT 'S3',
    "status" "FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) WITHOUT TIME ZONE,
    "metadata" JSONB,

    CONSTRAINT "file_storage_pkey" PRIMARY KEY ("id")
);

-- 5. 创建交易附件表
CREATE TABLE IF NOT EXISTS "transaction_attachments" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "attachment_type" "AttachmentType" NOT NULL DEFAULT 'RECEIPT',
    "description" TEXT,
    "created_at" TIMESTAMP(3) WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_attachments_pkey" PRIMARY KEY ("id")
);

-- 6. 添加外键约束
DO $$ BEGIN
    ALTER TABLE "file_storage" ADD CONSTRAINT "file_storage_uploaded_by_fkey" 
        FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_transaction_id_fkey" 
        FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_file_id_fkey" 
        FOREIGN KEY ("file_id") REFERENCES "file_storage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. 创建唯一约束
DO $$ BEGIN
    ALTER TABLE "file_storage" ADD CONSTRAINT "file_storage_bucket_key_unique" 
        UNIQUE ("bucket", "key");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_unique" 
        UNIQUE ("transaction_id", "file_id");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. 创建索引
CREATE INDEX IF NOT EXISTS "idx_file_storage_uploaded_by" ON "file_storage"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_file_storage_bucket" ON "file_storage"("bucket");
CREATE INDEX IF NOT EXISTS "idx_file_storage_type" ON "file_storage"("storage_type");
CREATE INDEX IF NOT EXISTS "idx_file_storage_status" ON "file_storage"("status");
CREATE INDEX IF NOT EXISTS "idx_file_storage_created_at" ON "file_storage"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_file_storage_expires_at" ON "file_storage"("expires_at");

CREATE INDEX IF NOT EXISTS "idx_transaction_attachments_transaction_id" ON "transaction_attachments"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_attachments_file_id" ON "transaction_attachments"("file_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_attachments_type" ON "transaction_attachments"("attachment_type");
CREATE INDEX IF NOT EXISTS "idx_transaction_attachments_created_at" ON "transaction_attachments"("created_at" DESC);

-- 9. 添加字段注释
COMMENT ON TABLE "file_storage" IS '文件存储表：管理所有上传的文件，支持多种存储后端';
COMMENT ON COLUMN "file_storage"."filename" IS '存储的文件名（通常是UUID）';
COMMENT ON COLUMN "file_storage"."original_name" IS '用户上传时的原始文件名';
COMMENT ON COLUMN "file_storage"."mime_type" IS '文件MIME类型';
COMMENT ON COLUMN "file_storage"."size" IS '文件大小（字节）';
COMMENT ON COLUMN "file_storage"."bucket" IS '存储桶名称';
COMMENT ON COLUMN "file_storage"."key" IS '存储对象键（路径）';
COMMENT ON COLUMN "file_storage"."url" IS '文件访问URL';
COMMENT ON COLUMN "file_storage"."storage_type" IS '存储类型：LOCAL/S3/OSS/COS';
COMMENT ON COLUMN "file_storage"."status" IS '文件状态：ACTIVE/DELETED/EXPIRED/PROCESSING';
COMMENT ON COLUMN "file_storage"."uploaded_by" IS '上传用户ID';
COMMENT ON COLUMN "file_storage"."expires_at" IS '文件过期时间（可选）';
COMMENT ON COLUMN "file_storage"."metadata" IS '文件元数据（JSON格式）';

COMMENT ON TABLE "transaction_attachments" IS '交易附件表：关联交易记录和文件';
COMMENT ON COLUMN "transaction_attachments"."transaction_id" IS '交易记录ID';
COMMENT ON COLUMN "transaction_attachments"."file_id" IS '文件ID';
COMMENT ON COLUMN "transaction_attachments"."attachment_type" IS '附件类型：RECEIPT/INVOICE/CONTRACT等';
COMMENT ON COLUMN "transaction_attachments"."description" IS '附件描述';

-- 10. 添加用户表缺失的字段
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_custodial" BOOLEAN DEFAULT FALSE;

-- 11. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_file_storage_user_id" ON "file_storage" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_file_storage_bucket_key" ON "file_storage" ("bucket", "key");
CREATE INDEX IF NOT EXISTS "idx_file_storage_status" ON "file_storage" ("status");
CREATE INDEX IF NOT EXISTS "idx_file_storage_created_at" ON "file_storage" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_transaction_attachment_transaction_id" ON "transaction_attachments" ("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_attachment_file_id" ON "transaction_attachments" ("file_id");

-- 12. 插入默认的S3存储配置（默认禁用）
INSERT INTO "system_configs" ("key", "value", "description", "category") VALUES
    ('s3_enabled', 'false', '是否启用S3存储', 'storage'),
    ('s3_endpoint', '', 'S3服务端点', 'storage'),
    ('s3_access_key_id', '', 'S3访问密钥ID', 'storage'),
    ('s3_secret_access_key', '', 'S3访问密钥', 'storage'),
    ('s3_region', 'us-east-1', 'S3区域', 'storage'),
    ('s3_bucket_avatars', 'avatars', '头像存储桶', 'storage'),
    ('s3_bucket_attachments', 'transaction-attachments', '附件存储桶', 'storage'),
    ('s3_bucket_temp', 'temp-files', '临时文件存储桶', 'storage'),
    ('s3_bucket_system', 'system-files', '系统文件存储桶', 'storage'),
    ('file_max_size', '10485760', '文件最大大小（字节）', 'storage'),
    ('file_allowed_types', 'image/jpeg,image/png,image/gif,image/webp,application/pdf', '允许的文件类型', 'storage')
ON CONFLICT ("key") DO NOTHING;

-- 13. 记录迁移版本
INSERT INTO "schema_versions" ("version", "description", "migration_file") VALUES
    ('1.7.0', '添加文件存储功能支持', 'add-file-storage.sql')
ON CONFLICT ("migration_file") DO NOTHING;
