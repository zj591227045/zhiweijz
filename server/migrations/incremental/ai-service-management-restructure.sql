/*META
VERSION: 1.7.9
DESCRIPTION: AI服务管理模块重构 - 添加调用日志来源字段和多模态AI调用记录支持
AUTHOR: AI Assistant
DATE: 2025-07-14
*/

-- =====================================================
-- AI服务管理模块重构数据库迁移
-- 版本: 1.7.9
-- 功能: 
-- 1. 为LLM调用日志添加来源字段
-- 2. 创建多模态AI调用日志表
-- 3. 为调用日志添加服务类型字段以区分不同AI服务
-- =====================================================

-- 1. 为LLM调用日志表添加来源字段
DO $$ 
BEGIN
    -- 添加来源字段，支持App、微信服务号、API等来源
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'llm_call_logs' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE llm_call_logs 
        ADD COLUMN source VARCHAR(50) DEFAULT 'App' NOT NULL;
        
        -- 添加注释
        COMMENT ON COLUMN llm_call_logs.source IS '调用来源：App(移动应用和Web应用)、WeChat(微信服务号)、API(直接API调用)';
    END IF;
    
    -- 添加AI服务类型字段，用于区分LLM、语音识别、图片识别等
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'llm_call_logs' 
        AND column_name = 'ai_service_type'
    ) THEN
        ALTER TABLE llm_call_logs 
        ADD COLUMN ai_service_type VARCHAR(50) DEFAULT 'llm' NOT NULL;
        
        -- 添加注释
        COMMENT ON COLUMN llm_call_logs.ai_service_type IS 'AI服务类型：llm(大语言模型)、speech(语音识别)、vision(图片识别)';
    END IF;
END $$;

-- 2. 创建多模态AI调用日志表
CREATE TABLE IF NOT EXISTS multimodal_ai_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    account_book_id TEXT,
    account_book_name VARCHAR(200),
    ai_service_type VARCHAR(50) NOT NULL, -- 'speech' 或 'vision'
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'App' NOT NULL, -- 调用来源
    input_size INTEGER DEFAULT 0, -- 输入文件大小（字节）
    input_format VARCHAR(20), -- 输入文件格式
    output_text TEXT, -- 识别结果文本
    confidence_score DECIMAL(5, 4), -- 置信度分数 (0.0000-1.0000)
    is_success BOOLEAN NOT NULL,
    error_message TEXT,
    duration INTEGER NOT NULL, -- 响应时间（毫秒）
    tokens INTEGER DEFAULT 0, -- 如果适用，token使用量
    cost DECIMAL(10, 6), -- 调用成本
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 外键约束
    CONSTRAINT fk_multimodal_ai_logs_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_multimodal_ai_logs_account_book 
        FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE SET NULL,
        
    -- 检查约束
    CONSTRAINT chk_ai_service_type 
        CHECK (ai_service_type IN ('speech', 'vision')),
    CONSTRAINT chk_source 
        CHECK (source IN ('App', 'WeChat', 'API')),
    CONSTRAINT chk_confidence_score 
        CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- 3. 为多模态AI调用日志表添加索引
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_user_id 
    ON multimodal_ai_call_logs (user_id);
    
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_created_at 
    ON multimodal_ai_call_logs (created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_ai_service_type 
    ON multimodal_ai_call_logs (ai_service_type);
    
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_source 
    ON multimodal_ai_call_logs (source);
    
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_provider 
    ON multimodal_ai_call_logs (provider);
    
CREATE INDEX IF NOT EXISTS idx_multimodal_ai_logs_is_success 
    ON multimodal_ai_call_logs (is_success);

-- 4. 为LLM调用日志表添加新字段的索引
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_source 
    ON llm_call_logs (source);
    
CREATE INDEX IF NOT EXISTS idx_llm_call_logs_ai_service_type 
    ON llm_call_logs (ai_service_type);

-- 5. 添加表注释
COMMENT ON TABLE multimodal_ai_call_logs IS '多模态AI调用日志表，记录语音识别和图片识别的调用历史';

-- 6. 更新现有LLM调用日志的来源字段（将NULL值设为默认值）
UPDATE llm_call_logs 
SET source = 'App' 
WHERE source IS NULL;

-- 7. 更新现有LLM调用日志的AI服务类型字段
UPDATE llm_call_logs 
SET ai_service_type = 'llm' 
WHERE ai_service_type IS NULL;

-- 8. 创建统一的AI调用日志视图，方便查询所有AI服务的调用记录
CREATE OR REPLACE VIEW ai_call_logs_unified AS
SELECT 
    id,
    user_id,
    user_name,
    account_book_id,
    account_book_name,
    ai_service_type,
    provider,
    model,
    source,
    is_success,
    error_message,
    duration,
    cost,
    created_at,
    -- LLM特有字段
    prompt_tokens,
    completion_tokens,
    total_tokens,
    user_message,
    assistant_message,
    system_prompt,
    -- 多模态AI字段设为NULL
    NULL::INTEGER as input_size,
    NULL::VARCHAR(20) as input_format,
    NULL::TEXT as output_text,
    NULL::DECIMAL(5,4) as confidence_score,
    'llm' as log_type
FROM llm_call_logs

UNION ALL

SELECT 
    id,
    user_id,
    user_name,
    account_book_id,
    account_book_name,
    ai_service_type,
    provider,
    model,
    source,
    is_success,
    error_message,
    duration,
    cost,
    created_at,
    -- LLM字段设为NULL或默认值
    NULL::INTEGER as prompt_tokens,
    NULL::INTEGER as completion_tokens,
    tokens as total_tokens,
    NULL::TEXT as user_message,
    output_text as assistant_message,
    NULL::TEXT as system_prompt,
    -- 多模态AI特有字段
    input_size,
    input_format,
    output_text,
    confidence_score,
    'multimodal' as log_type
FROM multimodal_ai_call_logs;

-- 9. 为统一视图添加注释
COMMENT ON VIEW ai_call_logs_unified IS '统一的AI调用日志视图，包含LLM和多模态AI的所有调用记录';
