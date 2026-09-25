# Repository Agent Rules

## Data safety

- Never wipe, reset, truncate, drop, or replace existing user data unless the user explicitly requests that exact destructive operation.
- Database seeds and migrations must be additive and safe to rerun.
- Prefer `INSERT ... ON CONFLICT DO NOTHING` for new records.
- When enriching existing records, fill only null or empty fields; never overwrite non-empty user data by default.
- Do not modify or delete existing images during data seeding unless explicitly requested.
- Before running a database migration, state whether it is additive or destructive and verify that no destructive statements are present.
- For Supabase data, provide a standalone SQL migration when the user asks for something they can paste into the SQL Editor.
