-- ═══════════════════════════════════════════════════
-- PACKIQ COMPLETE DATABASE SCHEMA  (idempotent)
-- Run entirely in Supabase SQL Editor
-- Handles fresh installs AND migrations from old schema
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────
-- STEP 1: Drop legacy triggers safely
--   PostgreSQL's DROP TRIGGER IF EXISTS still throws
--   42P01 when the TABLE itself does not exist.
--   We use anonymous DO blocks to swallow that error.
-- ─────────────────────────────────────────────────────
DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_result_insert ON public.optimization_results;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS on_session_complete ON public.optimization_sessions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ─────────────────────────────────────────────────────
-- STEP 2: Drop old/incompatible tables (safe order)
--   CASCADE removes dependent views / foreign keys.
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.optimization_results  CASCADE;
DROP TABLE IF EXISTS public.optimization_sessions CASCADE;
DROP TABLE IF EXISTS public.optimizations         CASCADE;  -- legacy single-table
DROP TABLE IF EXISTS public.analytics_daily       CASCADE;
DROP TABLE IF EXISTS public.notifications         CASCADE;

-- ─────────────────────────────────────────────────────
-- TABLE 1: COMPANIES
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name    TEXT NOT NULL,
  industry        TEXT,
  address         TEXT,
  website         TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TABLE 1.5: USER PROFILES
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name           TEXT,
  email               TEXT,
  mobile              TEXT,
  avatar_url          TEXT,
  company_name        TEXT,
  company_website     TEXT,
  company_email       TEXT,
  company_phone       TEXT,
  company_address     TEXT,
  company_city        TEXT,
  company_state       TEXT,
  company_zip         TEXT,
  company_country     TEXT DEFAULT 'India',
  gst_number          TEXT,
  industry            TEXT,
  company_size        TEXT,
  unit_system         TEXT DEFAULT 'metric',
  currency            TEXT DEFAULT 'INR',
  primary_carriers    TEXT[],
  monthly_volume      TEXT,
  plan                TEXT DEFAULT 'starter',
  plan_started_at     TIMESTAMPTZ,
  plan_expires_at     TIMESTAMPTZ,
  optimization_count  INTEGER DEFAULT 0,
  monthly_opt_count   INTEGER DEFAULT 0,
  monthly_opt_reset   TIMESTAMPTZ,
  token_limit         INTEGER DEFAULT 500,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure canonical onboarding column exists and migrate old column if present
-- This block is idempotent and safe to run multiple times.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='profiles' AND column_name='onboarding_completed'
  ) THEN
    UPDATE public.profiles
    SET onboarding_complete = onboarding_completed
    WHERE onboarding_completed IS NOT NULL;

    ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────
-- TABLE 2: BOX CATALOG
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.box_catalog (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name            TEXT NOT NULL,
  length_cm       DECIMAL(10,2) NOT NULL,
  width_cm        DECIMAL(10,2) NOT NULL,
  height_cm       DECIMAL(10,2) NOT NULL,
  weight_limit_kg DECIMAL(10,2) NOT NULL,
  cost            DECIMAL(10,2) DEFAULT 0,
  currency        TEXT DEFAULT 'INR',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TABLE 3: PRODUCTS MASTER
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sku         TEXT NOT NULL,
  name        TEXT,
  length_cm   DECIMAL(10,2),
  width_cm    DECIMAL(10,2),
  height_cm   DECIMAL(10,2),
  weight_kg   DECIMAL(10,2),
  category    TEXT,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sku)
);

-- ─────────────────────────────────────────────────────
-- TABLE 3: PRODUCTS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sku             TEXT NOT NULL,
  name            TEXT NOT NULL,
  category        TEXT,
  weight_kg       DECIMAL(10,2),
  length_cm       DECIMAL(10,2),
  width_cm        DECIMAL(10,2),
  height_cm       DECIMAL(10,2),
  fragility       TEXT DEFAULT 'LOW',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TABLE 4: SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan                   TEXT NOT NULL DEFAULT 'starter',
  monthly_limit          INTEGER DEFAULT 500,
  used_this_month        INTEGER DEFAULT 0,
  billing_period_start   TIMESTAMPTZ DEFAULT NOW(),
  billing_period_end     TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  payment_status         TEXT DEFAULT 'active',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TABLE 5: OPTIMIZATION SESSIONS  (batch header)
-- ─────────────────────────────────────────────────────
CREATE TABLE public.optimization_sessions (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name         TEXT,
  file_size_bytes   INTEGER,
  total_items       INTEGER DEFAULT 0,
  optimized_items   INTEGER DEFAULT 0,
  unoptimized_items INTEGER DEFAULT 0,
  optimization_rate DECIMAL(5,2) DEFAULT 0,
  estimated_savings DECIMAL(12,2) DEFAULT 0,
  currency          TEXT DEFAULT 'INR',
  high_risk_count   INTEGER DEFAULT 0,
  medium_risk_count INTEGER DEFAULT 0,
  low_risk_count    INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'completed',
  error_message     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────
-- TABLE 6: OPTIMIZATION RESULTS  (per product row)
-- ─────────────────────────────────────────────────────
CREATE TABLE public.optimization_results (
  id                       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id               UUID REFERENCES public.optimization_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id                  UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  -- Product
  sku                      TEXT NOT NULL,
  product_name             TEXT,
  length_cm                DECIMAL(10,2),
  width_cm                 DECIMAL(10,2),
  height_cm                DECIMAL(10,2),
  weight_kg                DECIMAL(10,2),
  quantity                 INTEGER DEFAULT 1,
  -- Outcome
  is_optimized             BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason           TEXT,
  -- Old box
  old_box_name             TEXT,
  old_box_dims             TEXT,
  old_box_cost             DECIMAL(10,2),
  -- New box (nullable FK — no hard constraint to allow orphan cleanup)
  new_box_id               UUID,
  new_box_name             TEXT,
  new_box_dims             TEXT,
  new_box_cost             DECIMAL(10,2),
  new_box_length_cm        DECIMAL(10,2),
  new_box_width_cm         DECIMAL(10,2),
  new_box_height_cm        DECIMAL(10,2),
  -- ML metrics
  ml_score                 DECIMAL(8,4),
  void_percentage          DECIMAL(5,2),
  volume_utilization       DECIMAL(5,2),
  savings_pct              DECIMAL(5,2),
  savings_amount           DECIMAL(10,2),
  recommendation_reason    TEXT,
  score_breakdown          JSONB,
  orientation              JSONB,
  alternatives             JSONB,
  -- Fragility
  fragility_score          INTEGER DEFAULT 0,
  fragility_level          TEXT DEFAULT 'Low',
  fragility_label          TEXT,
  fragility_recommendation TEXT,
  -- Shipping
  zone                     TEXT,
  tracking_id              TEXT,
  carrier                  TEXT DEFAULT 'Standard',
  -- Timestamp
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────
-- TABLE 7: ANALYTICS DAILY
-- ─────────────────────────────────────────────────────
CREATE TABLE public.analytics_daily (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date              DATE NOT NULL,
  optimizations_run INTEGER DEFAULT 0,
  items_processed   INTEGER DEFAULT 0,
  items_optimized   INTEGER DEFAULT 0,
  savings_generated DECIMAL(12,2) DEFAULT 0,
  high_risk_items   INTEGER DEFAULT 0,
  avg_void_pct      DECIMAL(5,2) DEFAULT 0,
  top_box_used      TEXT,
  UNIQUE(user_id, date)
);

-- ─────────────────────────────────────────────────────
-- TABLE 8: NOTIFICATIONS
-- ─────────────────────────────────────────────────────
-- TABLE: ORDERS & SHIPMENTS
-- Idempotent creation for orders and shipments used by frontend
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  optimization_result_id UUID REFERENCES public.optimization_results(id),
  optimization_session_id UUID REFERENCES public.optimization_sessions(id),
  product_snapshot  JSONB,
  box_snapshot      JSONB,
  quantity          INTEGER DEFAULT 1,
  total_cost        DECIMAL(12,2) DEFAULT 0,
  currency          TEXT DEFAULT 'INR',
  status            TEXT DEFAULT 'pending',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_own ON public.orders;
CREATE POLICY orders_own ON public.orders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ensure newer columns exist when migrating an existing orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS optimization_result_id UUID REFERENCES public.optimization_results(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS optimization_session_id UUID REFERENCES public.optimization_sessions(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_snapshot JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS box_snapshot JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_cost DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_opt_result ON public.orders(optimization_result_id);

CREATE TABLE IF NOT EXISTS public.shipments (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id              UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  optimization_result_id UUID REFERENCES public.optimization_results(id),
  recipient             JSONB,
  carrier               TEXT,
  tracking_id           TEXT,
  status                TEXT DEFAULT 'prepared',
  printed_at            TIMESTAMPTZ,
  shipped_at            TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS shipments_own ON public.shipments;
CREATE POLICY shipments_own ON public.shipments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ensure newer columns exist when migrating an existing shipments table
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS optimization_result_id UUID REFERENCES public.optimization_results(id);
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS recipient JSONB;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS tracking_id TEXT;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'prepared';
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS printed_at TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_shipments_user ON public.shipments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.shipments(tracking_id);

-- ─────────────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  data        JSONB,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════
ALTER TABLE public.companies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_catalog           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;

-- Drop then recreate policies (safe on re-run)
DROP POLICY IF EXISTS "companies_own"       ON public.companies;
DROP POLICY IF EXISTS "profiles_own"        ON public.profiles;
DROP POLICY IF EXISTS "box_catalog_own"     ON public.box_catalog;
DROP POLICY IF EXISTS "sessions_own"        ON public.optimization_sessions;
DROP POLICY IF EXISTS "results_own"         ON public.optimization_results;
DROP POLICY IF EXISTS "subscriptions_own"   ON public.subscriptions;
DROP POLICY IF EXISTS "products_own"        ON public.products;
DROP POLICY IF EXISTS "analytics_own"       ON public.analytics_daily;
DROP POLICY IF EXISTS "notifications_own"   ON public.notifications;

CREATE POLICY "companies_own"     ON public.companies             FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "profiles_own"      ON public.profiles              FOR ALL USING (auth.uid() = id)      WITH CHECK (auth.uid() = id);
CREATE POLICY "box_catalog_own"   ON public.box_catalog           FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_own"      ON public.optimization_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "results_own"       ON public.optimization_results  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_own" ON public.subscriptions         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_own"      ON public.products              FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "analytics_own"     ON public.analytics_daily       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notifications_own" ON public.notifications         FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════

-- Auto-create profile + subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (
    user_id, plan, monthly_limit, used_this_month,
    billing_period_start, billing_period_end
  )
  VALUES (NEW.id, 'starter', 500, 0, NOW(), NOW() + INTERVAL '1 month')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update analytics_daily on each result insert
CREATE OR REPLACE FUNCTION public.update_analytics_on_result()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.analytics_daily (
    user_id, date, items_processed, items_optimized, savings_generated
  )
  VALUES (
    NEW.user_id,
    CURRENT_DATE,
    1,
    CASE WHEN NEW.is_optimized THEN 1 ELSE 0 END,
    COALESCE(NEW.savings_amount, 0)
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    items_processed   = analytics_daily.items_processed + 1,
    items_optimized   = analytics_daily.items_optimized
                        + CASE WHEN NEW.is_optimized THEN 1 ELSE 0 END,
    savings_generated = analytics_daily.savings_generated
                        + COALESCE(NEW.savings_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_result_insert
  AFTER INSERT ON public.optimization_results
  FOR EACH ROW EXECUTE FUNCTION public.update_analytics_on_result();

-- Increment subscription usage after each session
CREATE OR REPLACE FUNCTION public.increment_subscription_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.subscriptions
    SET used_this_month = used_this_month + NEW.total_items,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

  UPDATE public.profiles
    SET optimization_count = optimization_count + 1,
        monthly_opt_count  = monthly_opt_count + 1,
        updated_at = NOW()
    WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_session_complete
  AFTER INSERT ON public.optimization_sessions
  FOR EACH ROW EXECUTE FUNCTION public.increment_subscription_usage();

-- Monthly reset helper (invoke via pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION public.reset_monthly_counts()
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
    SET used_this_month      = 0,
        billing_period_start = NOW(),
        billing_period_end   = NOW() + INTERVAL '1 month',
        updated_at           = NOW()
    WHERE billing_period_end < NOW();

  UPDATE public.profiles
    SET monthly_opt_count = 0,
        updated_at = NOW()
    WHERE id IN (
      SELECT user_id FROM public.subscriptions
      WHERE billing_period_end < NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_opt_results_user_session
  ON public.optimization_results(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_opt_results_session
  ON public.optimization_results(session_id);
CREATE INDEX IF NOT EXISTS idx_opt_results_optimized
  ON public.optimization_results(user_id, is_optimized);
CREATE INDEX IF NOT EXISTS idx_opt_sessions_user
  ON public.optimization_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date
  ON public.analytics_daily(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_sku
  ON public.products(user_id, sku);

-- ═══════════════════════════════════════════════════
-- HELPER VIEW
-- ═══════════════════════════════════════════════════
-- Ensure legacy/migrated profile columns exist so view creation won't fail
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT;

CREATE OR REPLACE VIEW public.user_latest_session AS
SELECT
  s.*,
  p.company_name,
  p.plan,
  sub.used_this_month,
  sub.monthly_limit,
  sub.billing_period_end,
  CASE
    WHEN sub.monthly_limit = -1 THEN FALSE
    ELSE sub.used_this_month >= sub.monthly_limit
  END AS is_limit_reached,
  CASE
    WHEN sub.monthly_limit = -1 THEN 100
    ELSE ROUND(
      (sub.used_this_month::DECIMAL / NULLIF(sub.monthly_limit, 0)) * 100,
      1
    )
  END AS usage_percentage
FROM public.optimization_sessions s
JOIN public.profiles      p   ON p.id       = s.user_id
JOIN public.subscriptions sub ON sub.user_id = s.user_id
WHERE s.id = (
  SELECT id FROM public.optimization_sessions
  WHERE user_id = s.user_id
  ORDER BY created_at DESC
  LIMIT 1
);

-- ═══════════════════════════════════════════════════
-- STORAGE BUCKETS & POLICIES
-- ═══════════════════════════════════════════════════
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage RLS policies for 'company-assets'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'company-assets' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can update their own objects" ON storage.objects;
CREATE POLICY "Users can update their own objects" ON storage.objects FOR UPDATE USING (bucket_id = 'company-assets' AND auth.uid() = owner) WITH CHECK (bucket_id = 'company-assets' AND auth.uid() = owner);
DROP POLICY IF EXISTS "Users can delete their own objects" ON storage.objects;
CREATE POLICY "Users can delete their own objects" ON storage.objects FOR DELETE USING (bucket_id = 'company-assets' AND auth.uid() = owner);
