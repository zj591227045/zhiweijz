# 数据库迁移系统指南

## 概述

本目录包含了重构后的数据库迁移系统，采用模块化设计，支持自动路径生成和版本管理。

## 目录结构

```
server/migrations/
├── README.md                           # 本文档
├── README-MIGRATION-SYSTEM.md         # 系统重构说明
├── version-config.js                  # 版本配置管理
├── migration-path-generator.js        # 迁移路径生成器
├── migration-manager.js               # 迁移执行管理器
├── data-integrity-check.js            # 数据完整性检查
├── migration-status.js                # 迁移状态查询
├── review-migration-system.js           # 迁移系统测试
├── migration-template.sql             # SQL文件模板
└── incremental/                       # 增量迁移文件目录
    ├── base-schema.sql                # 基础数据库结构
    ├── admin-features.sql             # 管理功能
    ├── 1.x.x-to-1.y.y.sql           # 版本升级迁移
    ├── add-feature-name.sql          # 功能性迁移
    └── fix-issue-description.sql     # 修复性迁移
```

## 🚨 AI IDE 数据库更新指南

### 1. 确定版本号

在添加新的数据库字段或功能时，首先确定版本号：

1. **查看当前最新版本**：
   ```bash
   # 查看 version-config.js 中的 LATEST_DB_VERSION
   ```

2. **确定新版本号**：
   - 新功能：递增 MINOR 版本（如 1.8.2 → 1.9.0）
   - 字段修复：递增 PATCH 版本（如 1.8.2 → 1.8.3）
   - 重大变更：递增 MAJOR 版本（如 1.8.2 → 2.0.0）

### 2. 必须更新的文件

当添加新的数据库迁移时，**必须**按顺序更新以下文件：

#### 2.1 创建迁移SQL文件
在 `incremental/` 目录下创建新的SQL文件：

```sql
/*META
VERSION: 1.8.3
DESCRIPTION: Add new feature description
AUTHOR: AI Assistant
*/

-- 你的SQL语句
ALTER TABLE table_name ADD COLUMN new_field VARCHAR(255);

-- 添加索引（如需要）
CREATE INDEX IF NOT EXISTS idx_table_new_field ON table_name(new_field);

-- 数据迁移（如需要）
UPDATE table_name SET new_field = 'default_value' WHERE new_field IS NULL;
```

#### 2.2 更新版本配置 (version-config.js)
```javascript
// 1. 更新版本历史
const DB_VERSION_HISTORY = [
  // ... 现有版本
  '1.8.2', '1.8.3'  // 添加新版本
];

// 2. 更新最新版本
const LATEST_DB_VERSION = '1.8.3';

// 3. 如果是应用版本发布，更新映射
const APP_TO_DB_VERSION_MAP = {
  // ... 现有映射
  '0.7.1': '1.8.3',  // 新的应用版本映射
};

// 4. 添加迁移文件映射（如果是命名迁移）
const MIGRATION_TO_VERSION_MAP = {
  // ... 现有映射
  'add-new-feature': '1.8.3',
};
```

#### 2.3 更新迁移路径生成器 (migration-path-generator.js)
```javascript
// 在 VERSION_TO_MIGRATIONS 中添加新版本
const VERSION_TO_MIGRATIONS = {
  // ... 现有版本
  '1.8.3': ['add-new-feature'],
};

// 在 FRESH_INSTALL_MIGRATIONS 末尾添加新迁移
const FRESH_INSTALL_MIGRATIONS = [
  // ... 现有迁移
  'add-new-feature'  // 添加到末尾
];
```

### 3. SQL文件编写规范

#### 3.1 文件头部元数据
```sql
/*META
VERSION: 1.8.3
DESCRIPTION: 简短描述迁移内容
AUTHOR: AI Assistant
DATE: 2025-07-31
*/
```

#### 3.2 必须使用的安全语法
```sql
-- ✅ 正确：使用 IF NOT EXISTS
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_name ON table_name(field);

-- ✅ 正确：使用 ON CONFLICT
INSERT INTO table_name (key, value) VALUES ('key', 'value')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ✅ 正确：PostgreSQL函数定义
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ❌ 错误：语法错误
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END
$$ language 'plpgsql';  -- ❌ 应该是 LANGUAGE plpgsql
```

#### 3.3 避免的危险操作
```sql
-- ❌ 避免：直接删除列
ALTER TABLE table_name DROP COLUMN old_field;

-- ❌ 避免：不安全的数据迁移
UPDATE table_name SET field = 'value';  -- 没有WHERE条件

-- ❌ 避免：复杂的DO块（容易出语法错误）
DO $$
DECLARE
    -- 复杂逻辑
BEGIN
    -- 多层嵌套
END $$;

-- ❌ 避免：嵌套EXECUTE语句（容易导致多命令错误）
DO $$
BEGIN
    EXECUTE '
        CREATE FUNCTION ...
        $func$ LANGUAGE plpgsql;
        ';  -- ❌ 容易导致语法错误
END $$;

-- ❌ 避免：在一个语句中包含多个命令
INSERT INTO table1 VALUES (1); INSERT INTO table2 VALUES (2);  -- ❌ 多命令
```

#### 3.4 推荐的安全模式
```sql
-- ✅ 推荐：分步骤添加约束
-- 1. 先添加字段
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);

-- 2. 填充数据
UPDATE table_name SET new_field = 'default' WHERE new_field IS NULL;

-- 3. 添加约束
ALTER TABLE table_name ALTER COLUMN new_field SET NOT NULL;

-- ✅ 推荐：使用简单的验证查询
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ 迁移成功'
        ELSE '❌ 迁移失败'
    END as status
FROM table_name 
WHERE new_field IS NOT NULL;
```

## 4. 常见语法错误及修复

### 4.1 PostgreSQL函数定义错误

**问题**：使用错误的LANGUAGE语法
```sql
-- ❌ 错误写法
$$ language 'plpgsql';

-- ✅ 正确写法
$$ LANGUAGE plpgsql;
```

**修复方法**：
1. 移除language周围的引号
2. 使用大写的LANGUAGE关键字

### 4.2 嵌套EXECUTE语句错误

**问题**：在DO块中使用嵌套EXECUTE创建函数
```sql
-- ❌ 错误写法
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'func_name') THEN
        EXECUTE '
        CREATE FUNCTION func_name()
        RETURNS TRIGGER AS $func$
        BEGIN
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END $$;
```

**修复方法**：直接使用CREATE OR REPLACE FUNCTION
```sql
-- ✅ 正确写法
CREATE OR REPLACE FUNCTION func_name()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 多命令语句错误

**问题**：在一个SQL语句中包含多个命令
```sql
-- ❌ 错误：分号后还有其他语句
INSERT INTO table1 VALUES (1); COMMENT ON TABLE table1 IS 'comment';
```

**修复方法**：分割为独立的语句
```sql
-- ✅ 正确写法
INSERT INTO table1 VALUES (1);

COMMENT ON TABLE table1 IS 'comment';
```

### 4.4 Dollar Quote标签支持

**支持的标签格式**：
- `$$` - 标准格式
- `$func$` - 函数标签
- `$body$` - 函数体标签
- `$tag$` - 自定义标签

**示例**：
```sql
CREATE OR REPLACE FUNCTION example()
RETURNS TEXT AS $func$
BEGIN
    RETURN 'Hello World';
END;
$func$ LANGUAGE plpgsql;
```

## 5. 测试和验证

#### 5.1 运行测试
```bash
# 在项目根目录执行
node server/migrations/review-migration-system.js
```

#### 5.2 真实数据库测试

**完整测试脚本**：
```bash
# 测试全新安装和所有升级路径
node server/migrations/test-real-database.js
```

**单文件测试**：
```bash
# 测试特定迁移文件
node server/migrations/test-single-file.js filename
```

**测试覆盖范围**：
- ✅ 全新安装（32个迁移文件）
- ✅ 从0.2.5升级到0.7.0（1.6.0 → 1.8.2，20个迁移）
- ✅ 从0.5.1升级到0.7.0（1.7.12 → 1.8.2，6个迁移）
- ✅ 从0.6.0升级到0.7.0（1.7.16 → 1.8.2，3个迁移）

#### 5.3 检查迁移路径
```bash
# 检查特定版本的迁移路径
node server/migrations/migration-manager.js status
```

#### 4.3 验证文件完整性
测试脚本会自动检查：
- 所有引用的迁移文件是否存在
- 迁移路径是否正确
- 版本配置是否一致

### 5. 常见错误和解决方案

#### 5.1 SQL语法错误
- **问题**：PostgreSQL函数定义语法错误
- **解决**：确保使用正确的 `$$ LANGUAGE plpgsql;` 语法

#### 5.2 迁移文件缺失
- **问题**：引用了不存在的迁移文件
- **解决**：检查文件名拼写，确保文件在 `incremental/` 目录中

#### 5.3 版本配置不一致
- **问题**：版本号在不同文件中不匹配
- **解决**：确保所有相关文件中的版本号一致

### 6. 发布流程

1. **创建迁移文件** → 2. **更新版本配置** → 3. **更新路径生成器** → 4. **运行测试** → 5. **提交代码**

### 7. 紧急回滚

如果迁移出现问题：
```sql
-- 在迁移文件中添加回滚逻辑
-- ROLLBACK SECTION (仅在紧急情况下使用)
-- ALTER TABLE table_name DROP COLUMN IF EXISTS new_field;
```

## 📞 技术支持

如遇到迁移问题：
1. 运行 `review-migration-system.js` 生成诊断报告
2. 检查错误日志
3. 参考 `README-MIGRATION-SYSTEM.md` 了解系统架构
