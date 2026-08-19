# Database Workflow

This document explains how to connect to Supabase, run migrations, probe the database, and dump the live schema.

The project uses the Supabase CLI version 2.112.0.

The hosted project reference is `xqlpekpkbszpdgtuwybh`.

The project name is `bigdrops-app`.

---

## 1. Important Rules

Read these rules before you run any Supabase command.

- Do not run Docker.
- Do not start the local Supabase stack with `supabase start`.
- Work against the hosted database only.
- Use the Supabase CLI. Do not edit the hosted database manually.
- Use migrations for every schema change.
- Run `bun run audit:load` before `bun run typecheck`.
- Never use `bun run build` for verification. The local machine has limited RAM.
- Use `bun`. Never use `npm`, `yarn`, or `pnpm`.

---

## 2. Connect to Supabase

### 2.1 Log in to the CLI

```bash
supabase login
```

The CLI stores an access token on your machine.

On this Windows machine, the CLI stores the token in the Windows Credential Manager, not in a token file. The credential target is `Supabase CLI:supabase`.

The token file `~/.supabase/access-token` is absent. This is normal for this machine. Do not assume the token is missing because the file is absent. Run `supabase db query --linked` to test connectivity.

In CI, set the access token as an environment variable:

```bash
export SUPABASE_ACCESS_TOKEN=<token>
```

Do not commit the token to the repository.

### 2.2 Link the repository to the hosted project

```bash
supabase link --project-ref xqlpekpkbszpdgtuwybh
```

The link metadata lives in `supabase/.temp/`.

Run this command once for each new clone of the repository.

### 2.3 Local stack

The local stack requires Docker.

Do not start it.

Do not run `supabase start`, `supabase stop`, or `supabase reset`.

---

## 3. Run Migrations

Migrations are SQL files in `supabase/migrations/`.

File names use this format:

```text
YYYYMMDDHHMMSS_<description>.sql
```

Migrations apply in file-name order.

Create a new migration:

```bash
supabase migration new <description>
```

Apply local migrations to the hosted project:

```bash
supabase db push
```

Generate a diff between the local migration files and the hosted database:

```bash
supabase db diff --linked
```

The diff command shows you what the hosted database has that the migration files do not have.

Note: `supabase db push` applies only the migration files in `supabase/migrations/`. It does not run `seed.sql`.

---

## 4. Probe the Database

### 4.1 Open a SQL shell to the hosted database

```bash
supabase db shell
```

### 4.2 List schemas

```sql
SELECT nspname FROM pg_namespace ORDER BY nspname;
```

### 4.3 List functions in a schema

```sql
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = '<schema_name>'
ORDER BY p.proname;
```

### 4.4 Check that a function exists

```sql
SELECT to_regprocedure('<schema_name>.<function_name>(<argument_types>)');
```

Example:

```sql
SELECT to_regprocedure('entity_bigdrops-main_main.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text)');
```

A null result means the function does not exist in that schema.

### 4.5 List tables in a schema

```sql
SELECT tablename FROM pg_tables WHERE schemaname = '<schema_name>' ORDER BY tablename;
```

### 4.6 List views in a schema

```sql
SELECT viewname FROM pg_views WHERE schemaname = '<schema_name>' ORDER BY viewname;
```

### 4.7 Reload the PostgREST schema cache

PostgREST caches the structure of every exposed schema.

After you add functions or views, reload the cache:

```sql
NOTIFY pgrst, 'reload schema';
```

Run this command from `supabase db shell`.

Without a reload, the frontend can fail with this error:

```text
Could not find the function <schema>.<function>(...) in the schema cache.
```

---

## 5. Dump the Live Schema

### 5.1 Dump the whole hosted database

```bash
supabase db dump --linked
```

### 5.2 Write the dump to a file

```bash
supabase db dump --linked -f dump.sql
```

### 5.3 Dump one schema

```bash
supabase db dump --linked --schema entity_bigdrops-main_main -f entity-schema.sql
```

### 5.4 Dump data only

```bash
supabase db dump --linked --data-only -f data.sql
```

`supabase db dump` uses `pg_dump`.

Tenant schemas have the prefix `entity_`.

---

## 6. Common Commands

| Purpose | Command |
| --- | --- |
| Log in to the CLI | `supabase login` |
| Link the repository | `supabase link --project-ref xqlpekpkbszpdgtuwybh` |
| Create a migration | `supabase migration new <description>` |
| Apply migrations | `supabase db push` |
| Diff migrations | `supabase db diff --linked` |
| Open a SQL shell | `supabase db shell` |
| Dump schema and data | `supabase db dump --linked` |
| Check CLI status | `supabase status` |