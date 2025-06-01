--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13
-- Dumped by pg_dump version 15.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AccountBookType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountBookType" AS ENUM (
    'PERSONAL',
    'FAMILY'
);


--
-- Name: BudgetPeriod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BudgetPeriod" AS ENUM (
    'MONTHLY',
    'YEARLY'
);


--
-- Name: BudgetType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BudgetType" AS ENUM (
    'PERSONAL',
    'GENERAL'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'MEMBER'
);


--
-- Name: RolloverType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RolloverType" AS ENUM (
    'SURPLUS',
    'DEFICIT'
);


--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TransactionType" AS ENUM (
    'INCOME',
    'EXPENSE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_books; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: account_llm_settings; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: ai_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_models (
    id text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    type text NOT NULL,
    model_path text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: budget_histories; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: category_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_budgets (
    id text NOT NULL,
    budget_id text NOT NULL,
    category_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    spent numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.families (
    id text NOT NULL,
    name text NOT NULL,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: family_members; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    token text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_used boolean DEFAULT false NOT NULL
);


--
-- Name: security_logs; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_account_books; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_account_books (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    account_book_id uuid NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_category_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_category_configs (
    id text NOT NULL,
    user_id text NOT NULL,
    category_id text NOT NULL,
    is_hidden boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feedback (
    id text NOT NULL,
    user_id text NOT NULL,
    transaction_id text,
    suggestion_id text,
    feedback_type text NOT NULL,
    content text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_llm_settings; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id text NOT NULL,
    user_id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: verification_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_codes (
    id text NOT NULL,
    user_id text NOT NULL,
    code text NOT NULL,
    email text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_used boolean DEFAULT false NOT NULL
);


--
-- Name: account_books account_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_books
    ADD CONSTRAINT account_books_pkey PRIMARY KEY (id);


--
-- Name: account_llm_settings account_llm_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_llm_settings
    ADD CONSTRAINT account_llm_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_models ai_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_models
    ADD CONSTRAINT ai_models_pkey PRIMARY KEY (id);


--
-- Name: budget_histories budget_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_histories
    ADD CONSTRAINT budget_histories_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_budgets category_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_pkey PRIMARY KEY (id);


--
-- Name: families families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_pkey PRIMARY KEY (id);


--
-- Name: family_members family_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: security_logs security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_logs
    ADD CONSTRAINT security_logs_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: user_account_books user_account_books_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account_books
    ADD CONSTRAINT user_account_books_pkey PRIMARY KEY (id);


--
-- Name: user_category_configs user_category_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_category_configs
    ADD CONSTRAINT user_category_configs_pkey PRIMARY KEY (id);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_llm_settings user_llm_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_llm_settings
    ADD CONSTRAINT user_llm_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: verification_codes verification_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_codes
    ADD CONSTRAINT verification_codes_pkey PRIMARY KEY (id);


--
-- Name: account_llm_settings_account_book_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX account_llm_settings_account_book_id_key ON public.account_llm_settings USING btree (account_book_id);


--
-- Name: category_budgets_budget_id_category_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX category_budgets_budget_id_category_id_key ON public.category_budgets USING btree (budget_id, category_id);


--
-- Name: invitations_invitation_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invitations_invitation_code_key ON public.invitations USING btree (invitation_code);


--
-- Name: password_reset_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);


--
-- Name: sessions_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token);


--
-- Name: user_account_books_user_id_account_book_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_account_books_user_id_account_book_id_key ON public.user_account_books USING btree (user_id, account_book_id);


--
-- Name: user_category_configs_user_id_category_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_category_configs_user_id_category_id_key ON public.user_category_configs USING btree (user_id, category_id);


--
-- Name: user_settings_user_id_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_settings_user_id_key_key ON public.user_settings USING btree (user_id, key);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- PostgreSQL database dump complete
--

