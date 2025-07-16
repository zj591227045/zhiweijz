/*META
VERSION: 1.7.12
DESCRIPTION: 添加 FamilyMember 表缺失的字段：is_custodial, birth_date, gender
AUTHOR: zhiweijz-team
*/

-- 添加 family_members 表缺失的字段
-- 这些字段在 Prisma schema 中已定义，但在数据库中可能缺失

-- 1. 添加 is_custodial 字段
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "is_custodial" BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. 添加 birth_date 字段
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "birth_date" TIMESTAMP(3) WITHOUT TIME ZONE;

-- 3. 添加 gender 字段
ALTER TABLE "family_members" ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_family_members_is_custodial" ON "family_members" ("is_custodial");
CREATE INDEX IF NOT EXISTS "idx_family_members_birth_date" ON "family_members" ("birth_date");

-- 5. 添加字段注释
COMMENT ON COLUMN "family_members"."is_custodial" IS '是否为托管成员';
COMMENT ON COLUMN "family_members"."birth_date" IS '出生日期';
COMMENT ON COLUMN "family_members"."gender" IS '性别';

-- 6. 验证字段是否存在的查询（用于调试）
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'family_members' 
-- AND column_name IN ('is_custodial', 'birth_date', 'gender')
-- ORDER BY column_name;
