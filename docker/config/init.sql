-- 智慧记账数据库初始化脚本
-- 此文件包含完整的数据库结构，包括refresh_day字段支持
-- 版本: 0.1.4

-- 设置数据库编码和时区
ALTER DATABASE zhiweijz SET timezone TO 'Asia/Shanghai';

-- 创建枚举类型
CREATE TYPE public."AccountBookType" AS ENUM (
    'PERSONAL',
    'FAMILY'
);

CREATE TYPE public."BudgetPeriod" AS ENUM (
    'MONTHLY',
    'YEARLY'
);

CREATE TYPE public."BudgetType" AS ENUM (
    'PERSONAL',
    'GENERAL'
);

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'MEMBER'
);

CREATE TYPE public."RolloverType" AS ENUM (
    'SURPLUS',
    'DEFICIT'
);

CREATE TYPE public."TransactionType" AS ENUM (
    'INCOME',
    'EXPENSE'
);

-- 创建用户表
CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    avatar text,
    bio text,
    birth_date timestamp(3) without time zone,
    password_changed_at timestamp(3) without time zone
);

-- 创建账本表
CREATE TABLE public.account_books (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    user_id text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    family_id text,
    type public."AccountBookType" DEFAULT 'PERSONAL'::public."AccountBookType" NOT NULL,
    created_by text,
    user_llm_setting_id text
);

-- 创建分类表
CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    type public."TransactionType" NOT NULL,
    icon text,
    user_id text,
    family_id text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    account_book_id text
);

-- 创建预算表（包含refresh_day字段）
CREATE TABLE public.budgets (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    period public."BudgetPeriod" NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    category_id text,
    user_id text,
    family_id text,
    rollover boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    name text NOT NULL,
    account_book_id text,
    is_auto_calculated boolean DEFAULT false NOT NULL,
    enable_category_budget boolean DEFAULT false NOT NULL,
    rollover_amount numeric(10,2),
    budget_type public."BudgetType" DEFAULT 'PERSONAL'::public."BudgetType" NOT NULL,
    amount_modified boolean DEFAULT false NOT NULL,
    last_amount_modified_at timestamp(3) without time zone,
    family_member_id text,
    refresh_day integer DEFAULT 1 NOT NULL
);

-- 创建交易表
CREATE TABLE public.transactions (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    type public."TransactionType" NOT NULL,
    category_id text NOT NULL,
    description text,
    date timestamp(3) without time zone NOT NULL,
    user_id text NOT NULL,
    family_id text,
    family_member_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    account_book_id text,
    budget_id text
);

-- 创建预算历史表
CREATE TABLE public.budget_histories (
    id text NOT NULL,
    budget_id text NOT NULL,
    period text NOT NULL,
    amount numeric(10,2) NOT NULL,
    type public."RolloverType" NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    budget_amount numeric(10,2),
    spent_amount numeric(10,2),
    previous_rollover numeric(10,2)
);

-- 创建其他必要的表
CREATE TABLE public.families (
    id text NOT NULL,
    name text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.family_members (
    id text NOT NULL,
    family_id text NOT NULL,
    user_id text,
    name text NOT NULL,
    role public."Role" DEFAULT 'MEMBER'::public."Role" NOT NULL,
    is_registered boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    birth_date timestamp(3) without time zone,
    gender text,
    is_custodial boolean DEFAULT false NOT NULL
);

CREATE TABLE public.sessions (
    id text NOT NULL,
    user_id text NOT NULL,
    token text NOT NULL,
    device_name text,
    device_type text,
    browser text,
    os text,
    ip text,
    location text,
    is_current boolean DEFAULT false NOT NULL,
    last_active timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.user_settings (
    id text NOT NULL,
    user_id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.verification_codes (
    id text NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    email text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_used boolean DEFAULT false NOT NULL
);

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    token text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_used boolean DEFAULT false NOT NULL
);

CREATE TABLE public.security_logs (
    id text NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    device_info text NOT NULL,
    ip_address text NOT NULL,
    location text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.invitations (
    id text NOT NULL,
    family_id text NOT NULL,
    invitation_code text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    used_at timestamp(3) without time zone,
    used_by_user_id text,
    used_by_user_name text
);

CREATE TABLE public.user_llm_settings (
    id text NOT NULL,
    user_id text NOT NULL,
    provider text DEFAULT 'openai'::text NOT NULL,
    model text DEFAULT 'gpt-3.5-turbo'::text NOT NULL,
    api_key text,
    temperature double precision DEFAULT 0.3 NOT NULL,
    max_tokens integer DEFAULT 1000 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    base_url text,
    description text,
    name text DEFAULT '默认LLM设置'::text NOT NULL
);

CREATE TABLE public.account_llm_settings (
    id text NOT NULL,
    account_book_id text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    api_key text,
    temperature double precision DEFAULT 0.3 NOT NULL,
    max_tokens integer DEFAULT 1000 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.category_budgets (
    id text NOT NULL,
    budget_id text NOT NULL,
    category_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    spent numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.user_category_configs (
    id text NOT NULL,
    user_id text NOT NULL,
    category_id text NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.user_feedback (
    id text NOT NULL,
    user_id text NOT NULL,
    transaction_id text,
    suggestion_id text,
    feedback_type text NOT NULL,
    content text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.ai_models (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    type text NOT NULL,
    model_path text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

-- 添加主键约束
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.account_books ADD CONSTRAINT account_books_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.categories ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.budgets ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.budget_histories ADD CONSTRAINT budget_histories_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.families ADD CONSTRAINT families_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.family_members ADD CONSTRAINT family_members_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_settings ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.verification_codes ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.security_logs ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invitations ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_llm_settings ADD CONSTRAINT user_llm_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.account_llm_settings ADD CONSTRAINT account_llm_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.category_budgets ADD CONSTRAINT category_budgets_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_category_configs ADD CONSTRAINT user_category_configs_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_feedback ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.ai_models ADD CONSTRAINT ai_models_pkey PRIMARY KEY (id);

-- 添加唯一约束
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);
CREATE UNIQUE INDEX user_settings_user_id_key_key ON public.user_settings USING btree (user_id, key);
CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);
CREATE UNIQUE INDEX invitations_invitation_code_key ON public.invitations USING btree (invitation_code);
CREATE UNIQUE INDEX account_llm_settings_account_book_id_key ON public.account_llm_settings USING btree (account_book_id);
CREATE UNIQUE INDEX category_budgets_budget_id_category_id_key ON public.category_budgets USING btree (budget_id, category_id);
CREATE UNIQUE INDEX user_category_configs_user_id_category_id_key ON public.user_category_configs USING btree (user_id, category_id);

-- 添加外键约束
ALTER TABLE ONLY public.account_books ADD CONSTRAINT account_books_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.transactions ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.budget_histories ADD CONSTRAINT budget_histories_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.families ADD CONSTRAINT families_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.family_members ADD CONSTRAINT family_members_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_settings ADD CONSTRAINT user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.verification_codes ADD CONSTRAINT verification_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.security_logs ADD CONSTRAINT security_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.invitations ADD CONSTRAINT invitations_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE ONLY public.user_llm_settings ADD CONSTRAINT user_llm_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.account_llm_settings ADD CONSTRAINT account_llm_settings_account_book_id_fkey FOREIGN KEY (account_book_id) REFERENCES public.account_books(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.category_budgets ADD CONSTRAINT category_budgets_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.category_budgets ADD CONSTRAINT category_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_category_configs ADD CONSTRAINT user_category_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_category_configs ADD CONSTRAINT user_category_configs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE ONLY public.user_feedback ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- 添加refresh_day字段约束
ALTER TABLE ONLY public.budgets ADD CONSTRAINT budgets_refresh_day_check CHECK (refresh_day IN (1, 5, 10, 15, 20, 25));

-- 输出初始化完成信息
\echo 'Database schema initialized successfully with refresh_day support (v0.1.4)'
