You are working on the BIGDROPS repository.

This is a Supabase connectivity test only. Do not investigate Audit Trail, migrations, application code, or database architecture yet.

Objective

Determine whether OpenCode can establish direct access to the LIVE Supabase PostgreSQL database from the current Windows/PowerShell environment, without Docker.

Required skill

Before doing anything else:

- Read "AGENTS.md".
- Read "docs/PROJECTSKILLINDEX.md".
- Load and use the installed Supabase skill(s) relevant to remote database access, PostgreSQL inspection, Supabase CLI, and database tooling.

Use the Supabase skill guidance rather than inventing your own connection procedure.

Environment

The user has already:

- Linked the Supabase project with the Supabase CLI.
- Installed PostgreSQL 17 locally.
- Confirmed "psql" and "pg_dump" are available.
- Installed the Supabase Agent Skills.
- Connected the repository to the Supabase project.

Docker is NOT available and must NOT be used.

Test

Using PowerShell and the installed Supabase/PostgreSQL tooling:

1. Confirm the currently linked Supabase project.
2. Determine the correct way to obtain/use the project's remote PostgreSQL connection.
3. Establish a direct connection to the LIVE database.
4. Run one harmless read-only PostgreSQL query to prove the connection works.
5. Verify that "pg_dump" can connect to the same database, if possible.

Do NOT:

- run migrations
- run "supabase db push"
- modify the database
- modify application code
- inspect Audit Trail architecture
- create reports
- use Docker
- expose passwords or API keys

If something is missing

If the connection requires a credential that is genuinely unavailable, ask the user for only that specific credential.

Do not ask the user to perform database investigation manually.

Stop condition

Once you have established whether PowerShell/OpenCode can directly access the live Supabase PostgreSQL database, STOP.

Return a concise result:

CONNECTED — explain the working connection method and confirm the read-only query succeeded.

or

BLOCKED — explain exactly what prevented the connection and the single thing required to proceed.