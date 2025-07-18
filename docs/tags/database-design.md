# 标签系统数据库设计

## 概述

本文档详细描述了标签系统的数据库设计，包括表结构、字段定义、索引、外键关系和数据迁移策略。

## 数据库表设计

### 1. 标签表 (tags)

#### 表结构
```sql
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    account_book_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 字段说明
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | UUID | 主键，标签唯一标识 | PRIMARY KEY |
| name | VARCHAR(50) | 标签名称 | NOT NULL |
| color | VARCHAR(7) | 标签颜色（十六进制） | NOT NULL, DEFAULT '#3B82F6' |
| description | TEXT | 标签描述 | 可选 |
| account_book_id | TEXT | 所属账本ID | NOT NULL, 外键 |
| created_by | TEXT | 创建者用户ID | NOT NULL, 外键 |
| is_active | BOOLEAN | 是否激活 | NOT NULL, DEFAULT true |
| usage_count | INTEGER | 使用次数统计 | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMP WITH TIME ZONE | 创建时间 | NOT NULL, DEFAULT NOW() |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新时间 | NOT NULL, DEFAULT NOW() |

#### 约束和索引
```sql
-- 唯一约束：同一账本内标签名称唯一
ALTER TABLE tags ADD CONSTRAINT tags_name_account_book_unique 
UNIQUE (name, account_book_id);

-- 外键约束
ALTER TABLE tags ADD CONSTRAINT fk_tags_account_book 
FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE;

ALTER TABLE tags ADD CONSTRAINT fk_tags_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX idx_tags_account_book_id ON tags(account_book_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_created_by ON tags(created_by);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);
CREATE INDEX idx_tags_created_at ON tags(created_at DESC);
```

### 2. 记账标签关联表 (transaction_tags)

#### 表结构
```sql
CREATE TABLE transaction_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### 字段说明
| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | UUID | 主键，关联记录唯一标识 | PRIMARY KEY |
| transaction_id | TEXT | 记账记录ID | NOT NULL, 外键 |
| tag_id | UUID | 标签ID | NOT NULL, 外键 |
| created_at | TIMESTAMP WITH TIME ZONE | 关联创建时间 | NOT NULL, DEFAULT NOW() |

#### 约束和索引
```sql
-- 唯一约束：同一记账记录和标签只能关联一次
ALTER TABLE transaction_tags ADD CONSTRAINT transaction_tags_unique 
UNIQUE (transaction_id, tag_id);

-- 外键约束
ALTER TABLE transaction_tags ADD CONSTRAINT fk_transaction_tags_transaction 
FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;

ALTER TABLE transaction_tags ADD CONSTRAINT fk_transaction_tags_tag 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

-- 索引
CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX idx_transaction_tags_created_at ON transaction_tags(created_at DESC);
```

## 触发器设计

### 1. 标签使用次数统计触发器

```sql
-- 创建触发器函数：更新标签使用次数
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 增加使用次数
        UPDATE tags SET 
            usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- 减少使用次数
        UPDATE tags SET 
            usage_count = GREATEST(usage_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON transaction_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();
```

### 2. 标签更新时间触发器

```sql
-- 创建触发器函数：自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_tags_updated_at();
```

## 数据完整性约束

### 1. 颜色值验证
```sql
-- 添加颜色格式检查约束
ALTER TABLE tags ADD CONSTRAINT check_color_format 
CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
```

### 2. 标签名称验证
```sql
-- 添加标签名称长度和格式检查
ALTER TABLE tags ADD CONSTRAINT check_name_length 
CHECK (LENGTH(TRIM(name)) >= 1 AND LENGTH(TRIM(name)) <= 50);
```

### 3. 使用次数验证
```sql
-- 添加使用次数非负检查
ALTER TABLE tags ADD CONSTRAINT check_usage_count_non_negative 
CHECK (usage_count >= 0);
```

## 查询优化

### 1. 常用查询模式

#### 获取账本的所有标签（按使用次数排序）
```sql
SELECT t.*, COUNT(tt.id) as actual_usage_count
FROM tags t
LEFT JOIN transaction_tags tt ON t.id = tt.tag_id
WHERE t.account_book_id = $1 AND t.is_active = true
GROUP BY t.id
ORDER BY actual_usage_count DESC, t.name ASC;
```

#### 获取记账记录的标签
```sql
SELECT t.*
FROM tags t
INNER JOIN transaction_tags tt ON t.id = tt.tag_id
WHERE tt.transaction_id = $1 AND t.is_active = true
ORDER BY t.name ASC;
```

#### 按标签筛选记账记录
```sql
SELECT DISTINCT tr.*
FROM transactions tr
INNER JOIN transaction_tags tt ON tr.id = tt.transaction_id
INNER JOIN tags t ON tt.tag_id = t.id
WHERE t.id = ANY($1) -- 标签ID数组
  AND tr.account_book_id = $2
ORDER BY tr.date DESC;
```

### 2. 性能优化建议

#### 复合索引
```sql
-- 为常用查询组合创建复合索引
CREATE INDEX idx_tags_account_book_active ON tags(account_book_id, is_active);
CREATE INDEX idx_transaction_tags_tag_transaction ON transaction_tags(tag_id, transaction_id);
```

#### 部分索引
```sql
-- 只为活跃标签创建索引
CREATE INDEX idx_tags_active_name ON tags(name) WHERE is_active = true;
CREATE INDEX idx_tags_active_usage ON tags(usage_count DESC) WHERE is_active = true;
```

## 数据迁移策略

### 1. 迁移文件结构

**文件名**: `1.4.0-to-1.5.0.sql`

```sql
/*META
VERSION: 1.5.0
DESCRIPTION: 标签系统 - 添加标签管理和记账标签关联功能
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：标签系统
-- 支持记账记录多标签管理、账本级别标签共享
-- =======================================

-- 1. 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    account_book_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 创建记账标签关联表
CREATE TABLE IF NOT EXISTS transaction_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 添加约束
DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT tags_name_account_book_unique 
    UNIQUE (name, account_book_id);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- 4. 添加外键约束
DO $$ BEGIN
    ALTER TABLE tags ADD CONSTRAINT fk_tags_account_book 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. 创建索引
CREATE INDEX IF NOT EXISTS idx_tags_account_book_id ON tags(account_book_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);

-- 6. 创建触发器
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1, updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tag_usage_count ON transaction_tags;
CREATE TRIGGER trigger_update_tag_usage_count
    AFTER INSERT OR DELETE ON transaction_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();
```

### 2. 回滚策略

由于采用增量迁移策略，不提供自动回滚。如需回滚：
1. 删除相关触发器
2. 删除新增表（注意数据备份）
3. 恢复到1.4.0版本

### 3. 数据验证

迁移后验证脚本：
```sql
-- 验证表结构
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('tags', 'transaction_tags')
ORDER BY table_name, ordinal_position;

-- 验证约束
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('tags', 'transaction_tags');

-- 验证索引
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('tags', 'transaction_tags');
```

## 性能监控

### 1. 关键指标
- 标签查询响应时间
- 记账标签关联查询性能
- 标签使用统计准确性

### 2. 监控查询
```sql
-- 监控标签使用分布
SELECT 
    usage_count,
    COUNT(*) as tag_count
FROM tags
WHERE is_active = true
GROUP BY usage_count
ORDER BY usage_count DESC;

-- 监控大量标签的记账记录
SELECT 
    tr.id,
    COUNT(tt.tag_id) as tag_count
FROM transactions tr
LEFT JOIN transaction_tags tt ON tr.id = tt.transaction_id
GROUP BY tr.id
HAVING COUNT(tt.tag_id) > 10
ORDER BY tag_count DESC;
```

---

**文档版本**: v1.0
**创建时间**: 2024年
**维护团队**: zhiweijz-team
