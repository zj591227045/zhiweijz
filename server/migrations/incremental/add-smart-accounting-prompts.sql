/*META
VERSION: 1.7.3
DESCRIPTION: Add smart accounting prompts configuration to system_config table
AUTHOR: Claude Code Assistant
*/

-- 添加智能记账提示词配置到系统配置表
-- 这些配置将用于智能记账功能的各种AI提示词

-- 1. 记账相关性判断提示词
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_relevance_check_prompt',
  '你是一个专业的财务助手。请判断以下用户描述是否与记账相关。

判断标准：
1. 包含金额信息（必须）
2. 包含记账流水明细（必须）
3. 可能包含日期信息（可选）
4. 可能包含预算信息（可选）

如果描述中包含明确的金额和记账内容（如购买、支付、收入、转账等），则判定为与记账相关。
如果描述中只是询问、闲聊或其他非记账相关内容，则判定为与记账无关。

请只回答 "相关" 或 "无关"，不要有其他文字。

用户描述: {{description}}',
  '智能记账-记账相关性判断提示词，用于过滤无关内容',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 智能记账分析提示词
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_prompt',
  '你是专业财务助手，从用户描述中提取记账信息。

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
  '智能记账-主要分析提示词，用于从用户描述中提取记账信息',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. 图片分析提示词
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_image_analysis_prompt',
  '请分析这张图片中的记账信息。

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
  '智能记账-图片分析提示词，用于从图片中提取记账信息',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. 多模态兼容提示词（向后兼容）
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_multimodal_prompt',
  '分析图片中的记账信息，提取：1.微信/支付宝付款记录：金额、收款人、备注，并从收款人分析记账类别；2.订单截图（美团/淘宝/京东/外卖/抖音）：内容、金额、时间、收件人；3.发票/票据：内容、分类、金额、时间。返回JSON格式。',
  '智能记账-多模态兼容提示词，用于向后兼容',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 5. 确保智能记账功能开关配置存在
INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_vision_enabled',
  'false',
  '智能记账-图片识别功能开关',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO system_configs (key, value, description, created_at, updated_at)
VALUES (
  'smart_accounting_speech_enabled',
  'false',
  '智能记账-语音识别功能开关',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- 验证配置是否正确插入
DO $$
BEGIN
  RAISE NOTICE '智能记账提示词配置已完成，共添加 % 个配置项',
    (SELECT COUNT(*) FROM system_configs WHERE key LIKE 'smart_accounting_%');
END
$$;