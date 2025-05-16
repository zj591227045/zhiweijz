-- 查找用户ID
SELECT id FROM users WHERE email = '591227045@qq.com';

-- 检查是否已有默认账本
SELECT * FROM account_books WHERE user_id = '8ac2a69c-46c5-47bf-b000-227a3f0ba7bf' AND is_default = true;

-- 创建默认账本
INSERT INTO account_books (id, name, description, user_id, is_default, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  '默认账本',
  '系统自动创建的默认账本',
  '8ac2a69c-46c5-47bf-b000-227a3f0ba7bf',
  true,
  NOW(),
  NOW()
)
RETURNING id;

-- 为默认账本创建LLM设置
INSERT INTO account_llm_settings (id, account_book_id, provider, model, api_key, temperature, max_tokens, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  (SELECT id FROM account_books WHERE user_id = '8ac2a69c-46c5-47bf-b000-227a3f0ba7bf' AND is_default = true LIMIT 1),
  'OPENAI',
  'gpt-3.5-turbo',
  '',
  0.7,
  1000,
  NOW(),
  NOW()
);
