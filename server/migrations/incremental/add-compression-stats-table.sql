-- 创建图片压缩统计表
-- 执行时间: 2024-12-XX

-- 创建压缩统计表
CREATE TABLE IF NOT EXISTS compression_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy VARCHAR(50) NOT NULL, -- 压缩策略: avatar, attachment, multimodal, general
    original_size BIGINT NOT NULL, -- 原始文件大小（字节）
    compressed_size BIGINT NOT NULL, -- 压缩后文件大小（字节）
    compression_ratio DECIMAL(5,2) NOT NULL, -- 压缩比率
    original_format VARCHAR(20) NOT NULL, -- 原始格式: jpeg, png, webp等
    compressed_format VARCHAR(20) NOT NULL, -- 压缩后格式
    processing_time INTEGER NOT NULL DEFAULT 0, -- 处理时间（毫秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_compression_stats_user_id ON compression_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_compression_stats_strategy ON compression_stats(strategy);
CREATE INDEX IF NOT EXISTS idx_compression_stats_created_at ON compression_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_compression_stats_user_created ON compression_stats(user_id, created_at);

-- 添加约束
ALTER TABLE compression_stats 
ADD CONSTRAINT chk_compression_stats_sizes 
CHECK (original_size > 0 AND compressed_size > 0);

ALTER TABLE compression_stats 
ADD CONSTRAINT chk_compression_stats_ratio 
CHECK (compression_ratio > 0);

ALTER TABLE compression_stats 
ADD CONSTRAINT chk_compression_stats_processing_time 
CHECK (processing_time >= 0);

-- 添加注释
COMMENT ON TABLE compression_stats IS '图片压缩统计表';
COMMENT ON COLUMN compression_stats.id IS '统计记录ID';
COMMENT ON COLUMN compression_stats.user_id IS '用户ID';
COMMENT ON COLUMN compression_stats.strategy IS '压缩策略';
COMMENT ON COLUMN compression_stats.original_size IS '原始文件大小（字节）';
COMMENT ON COLUMN compression_stats.compressed_size IS '压缩后文件大小（字节）';
COMMENT ON COLUMN compression_stats.compression_ratio IS '压缩比率（原始大小/压缩后大小）';
COMMENT ON COLUMN compression_stats.original_format IS '原始图片格式';
COMMENT ON COLUMN compression_stats.compressed_format IS '压缩后图片格式';
COMMENT ON COLUMN compression_stats.processing_time IS '压缩处理时间（毫秒）';
COMMENT ON COLUMN compression_stats.created_at IS '创建时间';
COMMENT ON COLUMN compression_stats.updated_at IS '更新时间';
