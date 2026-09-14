# Database Workflow

This document tells you how to connect to Supabase, run migrations, probe the database, and dump the live schema.

The project uses Supabase CLI version 2.112.0.

The hosted project reference is `xqlpekpkbszpdgtuwybh`.

The project name is `bigdrops-app`.

---

## 1. Important Rules

Read these rules before you run any Supabase command.

### 1.1 Push rules

- You MUST push every migration to Supabase.
- You MUST fix all errors that Supabase returns.
- You MUST repeat push and fix until the push succeeds.
- Do NOT stop after you write a SQL file. The job is not done.
- Only skip the push when the user says "do not push" in clear words.
- If the user says "do not push", stop after you write the file.

### 1.2 Environment rules

- Do NOT run Docker.
- Do NOT start the local Supabase stack. Do NOT run `supabase start`.
- Work on the hosted database only.
- Use the Supabase CLI. Do NOT edit the hosted database by hand.
- Use a migration for each schema change.
- Run `bun run audit:load` before `bun run typecheck`.
- Do NOT use `bun run build` to verify. The local machine has little RAM.
- Use `bun`. Do NOT use `npm`, `yarn`, or `pnpm`.

---

## 2. Connect to Supabase

### 2.1 Log in to the CLI

```bash
supabase login
```

The CLI saves an access token on your machine.

On this Windows machine, the CLI saves the token in the Windows Credential Manager. The CLI does not save a token file. The credential target is Supabase CLI:supabase.

The file ~/.supabase/access-token does not exist. This is normal. Do NOT think the token is missing because the file is absent. Run supabase db query --linked to test the connection.

In CI, set the token as an environment variable:

```bash
export SUPABASE_ACCESS_TOKEN=<token>
```

Do NOT commit the token to the repository.

### 2.2 Link the repository to the hosted project

```bash
supabase link --project-ref xqlpekpkbszpdgtuwybh
```

The link data is in supabase/.temp/.

Run this command one time for each new clone.

2.3 Local stack

The local stack needs Docker.

Do NOT start it.

Do NOT run supabase start, supabase stop, or supabase reset.

---

3. Run Migrations

Migrations are SQL files in supabase/migrations/.

File names have this format:

```text
YYYYMMDDHHMMSS_<description>.sql
```

Migrations run in file-name order.

### 3.1 Create a new migration

```bash
supabase migration new <description>
```

Write your SQL in the new file.

### 3.2 Apply migrations to the hosted project

```bash
supabase db push
```

You MUST run this command. See rule 1.1.

### 3.3 Compare local files with the hosted database

```bash
supabase db diff --linked
```

This command shows what the hosted database has that the migration files do not have.

Note: supabase db push applies only the migration files in supabase/migrations/. It does NOT run seed.sql.

---

4. Handle Push Errors

Supabase can reject a migration. You MUST fix the error and push again.

### 4.1 Read the error

Read the full error message. The message tells you the line and the cause.

### 4.2 Common causes

- The migration uses an object that does not exist.
- The migration drops an object that other objects use.
- The migration has a syntax error.
- The migration conflicts with an object in the hosted database.
- The migration order is wrong. An older file needs a change.

### 4.3 Fix the error

1. Open the migration file.
2. Correct the SQL.
3. Run supabase db push again.
4. If the push fails, go to step 1.

Do NOT edit the hosted database by hand to hide the error.

Do NOT delete the migration to skip the error. Correct it.

### 4.4 Use the Supabase skills

Use the Supabase tools and skills in this order:

1. supabase db diff --linked — find what is out of sync.
2. supabase db shell — run probe queries (see section 5).
3. supabase db dump --linked — get the live schema (see section 6).

---

5. Probe the Database

### 5.1 Open a SQL shell to the hosted database

```bash
supabase db shell
```

### 5.2 List schemas

```sql
SELECT nspname FROM pg_namespace ORDER BY nspname;
```

### 5.3 List functions in a schema

```sql
SELECT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = '<schema_name>'
ORDER BY p.proname;
```

### 5.4 Check that a function exists

```sql
SELECT to_regprocedure('<schema_name>.<function_name>(<argument_types>)');
```

Example:

```sql
SELECT to_regprocedure('entity_bigdrops-main_main.save_invoice_with_items_transaction(uuid, jsonb, jsonb, text)');
```

A null result means the function does not exist in that schema.

### 5.5 List tables in a schema

```sql
SELECT tablename FROM pg_tables WHERE schemaname = '<schema_name>' ORDER BY tablename;
```

### 5.6 List views in a schema

```sql
SELECT viewname FROM pg_views WHERE schemaname = '<schema_name>' ORDER BY viewname;
```

### 5.7 Reload the PostgREST schema cache

PostgREST caches the structure of each exposed schema.

After you add functions or views, reload the cache:

```sql
NOTIFY pgrst, 'reload schema';
```

Run this command from supabase db shell.

Without a reload, the frontend can fail with this error:

```text
Could not find the function <schema>.<function>(...) in the schema cache.
```

---

6. Dump the Live Schema

### 6.1 Dump the whole hosted database

```bash
supabase db dump --linked
```

### 6.2 Write the dump to a file

```bash
supabase db dump --linked -f dump.sql
```

### 6.3 Dump one schema

```bash
supabase db dump --linked --schema entity_bigdrops-main_main -f entity-schema.sql
```

### 6.4 Dump data only

```bash
supabase db dump --linked --data-only -f data.sql
```

supabase db dump uses pg_dump.

Tenant schemas have the prefix entity_.

---

7. Common Commands

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

---

8. End of Task

A task is done only when:

1. The migration file exists.
2. supabase db push succeeds.
3. No errors remain.

If the push fails and you cannot fix it, report the error to the user. Do NOT mark the task complete.