-- Domain: Core Tables
-- Tables: profiles, clients, settings, signatories, bank_accounts
-- Created: 2026-05-20
-- Source: Supabase SQL Editor CSV exports

-- ============================================================
-- SHARED FUNCTIONS (required by triggers across all domains)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.stamp_row_ownership()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by = auth.uid();
    end if;

    if new.updated_by is null then
      new.updated_by = coalesce(new.created_by, auth.uid());
    end if;

    if new.created_at is null then
      new.created_at = now();
    end if;

    if new.updated_at is null then
      new.updated_at = now();
    end if;
  elsif tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), new.updated_by);
    new.updated_at = now();
  end if;

  return new;
end;
$function$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
    id uuid NOT NULL,
    email text,
    is_approved boolean DEFAULT false,
    role text DEFAULT 'engineer'::text,
    assigned_device_code text,
    created_at timestamp with time zone DEFAULT now(),
    has_password boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS clients (
    name text NOT NULL,
    address text NOT NULL,
    phone text,
    email text,
    category text,
    notes text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    city text,
    state text,
    contact_person text,
    archived_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS settings (
    id integer NOT NULL DEFAULT 1,
    company_name text,
    company_tagline text,
    company_address text,
    company_city text,
    company_phone text,
    company_email text,
    company_website text,
    bank_name text,
    bank_account_name text,
    bank_account_number text,
    bank_sort_code text,
    footer_text text,
    company_logo_url text,
    signature_url text,
    custom_info text DEFAULT '[]'::text,
    app_background_color text,
    app_card_color text,
    app_theme_preset_id text,
    app_theme_tokens jsonb
);

CREATE TABLE IF NOT EXISTS signatories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    role text,
    signature_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bank_name text,
    account_name text,
    account_number text,
    sort_code text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================
-- PRIMARY KEYS
-- ============================================================

ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
ALTER TABLE signatories ADD CONSTRAINT signatories_pkey PRIMARY KEY (id);
ALTER TABLE bank_accounts ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients USING btree (name);
CREATE INDEX IF NOT EXISTS idx_clients_archived_at ON public.clients USING btree (archived_at);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles USING btree (is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_device_code ON public.profiles USING btree (assigned_device_code);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY users_read_own_profile ON profiles FOR SELECT TO public USING (true);
CREATE POLICY admin_updates_profiles ON profiles FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1 FROM profiles profiles_1 WHERE ((profiles_1.id = ( SELECT auth.uid() AS uid)) AND (profiles_1.role = 'admin'::text)))));

-- clients
CREATE POLICY approved_users_only_clients ON clients FOR ALL TO public
  USING ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.is_approved = true)))));
CREATE POLICY clients_authenticated_select ON clients FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY clients_authenticated_delete ON clients FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY clients_authenticated_update ON clients FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- settings
CREATE POLICY settings_authenticated_select ON settings FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY settings_authenticated_update ON settings FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY settings_select ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY settings_update ON settings FOR UPDATE TO authenticated USING ((id = 1)) WITH CHECK ((id = 1));

-- signatories
CREATE POLICY signatories_authenticated_select ON signatories FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY signatories_authenticated_delete ON signatories FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY signatories_authenticated_update ON signatories FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- bank_accounts
CREATE POLICY bank_accounts_authenticated_select ON bank_accounts FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY bank_accounts_authenticated_delete ON bank_accounts FOR DELETE TO public USING ((auth.role() = 'authenticated'::text));
CREATE POLICY bank_accounts_authenticated_update ON bank_accounts FOR UPDATE TO public USING ((auth.role() = 'authenticated'::text));

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO profiles (id, email, is_approved, role)
    VALUES (
        new.id,
        new.email,
        CASE WHEN new.email IN ('jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com') THEN true ELSE false END,
        CASE WHEN new.email IN ('jaiyewisdom@gmail.com', 'mondayevg2007@gmail.com') THEN 'admin' ELSE 'engineer' END
    );
  RETURN new;
END;
$function$;
