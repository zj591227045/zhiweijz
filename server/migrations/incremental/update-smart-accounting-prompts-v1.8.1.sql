/*META
VERSION: 1.8.1
DESCRIPTION: Force update smart accounting and image analysis prompts to latest version
AUTHOR: Claude Code Assistant
*/

-- 强制更新智能记账和图片分析提示词到最新版本
-- 此迁移将覆盖现有的提示词配置，确保所有用户使用最新的提示词

-- 1. 强制更新智能记账主要分析提示词
UPDATE system_configs 
SET value = '你是专业财务助手，从用户描述中提取记账信息。

分类列表：
{{categories}}
预算列表：
{{budgets}}

从描述中提取：
1. 金额（仅数字）
2. 日期（未提及用今日）
3. 分类（匹配上述分类）
4. 预算（若提及预算/人名则匹配）
5. 备注（简短描述）

返回JSON格式：
{
  "amount": 数字,
  "date": "YYYY-MM-DD",
  "categoryId": "分类ID",
  "categoryName": "分类名",
  "type": "EXPENSE/INCOME",
  "budgetName": "预算名(可选)",
  "confidence": 0-1小数,
  "note": "备注"
}

用户描述: {{description}}
当前日期: {{currentDate}}

仅返回JSON，无其他文字。',
    description = '智能记账-主要分析提示词，用于从用户描述中提取记账信息 (v1.8.1更新)',
    updated_at = NOW()
WHERE key = 'smart_accounting_prompt';

-- 2. 强制更新图片分析提示词
UPDATE system_configs 
SET value = '请分析这张图片中的记账信息。

请从图片中识别以下信息：
1. 记账金额：准确的数字金额
2. 记账时间：日期和时间信息
3. 记账类型：收入、支出、转账等
4. 记账内容：商品名称、服务描述或记账备注
5. 记账分类：推测的记账分类

请以JSON格式返回结果：
{
  "amount": "金额数字",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "type": "EXPENSE/INCOME/TRANSFER",
  "description": "记账描述",
  "category": "推测的记账分类",
  "confidence": 0.0-1.0,
}
如果识别到了多个完整的订单、账单、消费记录内容，请以数组形式输出多个订单内容：[{},{}]。
如果图片中没有明确的记账信息，请返回 {"error": "未识别到记账信息"}。',
    description = '智能记账-图片分析提示词，用于从图片中提取记账信息 (v1.8.1更新)',
    updated_at = NOW()
WHERE key = 'smart_accounting_image_analysis_prompt';

-- 验证更新结果
DO $$
DECLARE
    smart_accounting_count INTEGER;
    image_analysis_count INTEGER;
BEGIN
    -- 检查智能记账提示词是否更新成功
    SELECT COUNT(*) INTO smart_accounting_count 
    FROM system_configs 
    WHERE key = 'smart_accounting_prompt' 
    AND description LIKE '%v1.8.1更新%';
    
    -- 检查图片分析提示词是否更新成功
    SELECT COUNT(*) INTO image_analysis_count 
    FROM system_configs 
    WHERE key = 'smart_accounting_image_analysis_prompt' 
    AND description LIKE '%v1.8.1更新%';
    
    IF smart_accounting_count = 1 AND image_analysis_count = 1 THEN
        RAISE NOTICE '✅ 智能记账提示词更新成功 - 版本1.8.1';
        RAISE NOTICE '   - 智能记账主要分析提示词已更新';
        RAISE NOTICE '   - 图片分析提示词已更新';
    ELSE
        RAISE WARNING '⚠️ 提示词更新可能存在问题:';
        RAISE WARNING '   - 智能记账提示词更新数量: %', smart_accounting_count;
        RAISE WARNING '   - 图片分析提示词更新数量: %', image_analysis_count;
    END IF;
END
$$;

-- 记录迁移日志
INSERT INTO system_configs (key, value, description, category, created_at, updated_at)
VALUES (
    'migration_log_v1.8.1_prompts_update',
    NOW()::text,
    '记录v1.8.1版本智能记账提示词强制更新的时间',
    'migration_log',
    NOW(),
    NOW()
) ON CONFLICT (key) DO UPDATE SET
    value = NOW()::text,
    updated_at = NOW();
